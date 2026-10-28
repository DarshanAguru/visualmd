import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { VisualMDDatabase, isCompatibleDocFile, getWorkspaceInfo, getRegisteredWorkspaces, isPathInsideDir } from './db.js';
import { parseVisualMD, validateVisualMD } from '../../compiler/dist/index.js';
import { autoCommitDataChange } from './git.js';
import { executeSandboxedCode } from './sandbox.js';
import { SERVER_VERSION } from './version.js';


function getSafeFileName(title: string, dir: string): string {
  const base =
    (title || 'doc')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'document';
  let candidate = path.join(dir, `${base}.vmd`);
  if (!fs.existsSync(candidate)) return candidate;
  const unique = Math.random().toString(36).slice(2, 7);
  return path.join(dir, `${base}-${unique}.vmd`);
}

export function createServer(
  db: VisualMDDatabase,
  staticDir?: string,
  dataDir?: string,
  isBackendOnly: boolean = false
) {
  const app = express();
  // Strict CORS: Only VisualMD frontend (port 5665 / same-origin) and local tooling can access backend API
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, same-origin SPA)
        if (!origin) return callback(null, true);
        if (
          origin === 'http://localhost:5665' ||
          origin === 'http://127.0.0.1:5665' ||
          origin === 'http://localhost:9669' ||
          origin === 'http://127.0.0.1:9669' ||
          /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
          /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
        ) {
          return callback(null, true);
        }
        callback(new Error('Cross-Origin Request Blocked: Only VisualMD frontend may communicate with backend.'));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  if (dataDir && !fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sseClients = new Set<Response>();

  const broadcastEvent = (event: string, data: any = {}) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  };

  (app as any).broadcastEvent = broadcastEvent;

  // Server-Sent Events (SSE) for real-time reactivity across clients
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, timestamp: Date.now() })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    const workspace = db.workspaceInfo || (dataDir ? getWorkspaceInfo(dataDir, db.dbPath) : null);
    res.json({
      status: 'ok',
      version: SERVER_VERSION,
      dbPath: db.dbPath,
      dataDir: dataDir ? path.resolve(dataDir) : null,
      workspace,
    });
  });

  // Workspace information endpoint
  app.get('/api/workspace', (_req: Request, res: Response) => {
    const workspace = db.workspaceInfo || (dataDir ? getWorkspaceInfo(dataDir, db.dbPath) : null);
    res.json({
      ok: true,
      workspace,
      dataDir: dataDir ? path.resolve(dataDir) : null,
      dbPath: db.dbPath,
    });
  });

  // Registered workspaces list endpoint
  app.get('/api/workspaces', (_req: Request, res: Response) => {
    const list = getRegisteredWorkspaces(db.globalRegistryDbPath || undefined);
    const current = db.workspaceInfo || (dataDir ? getWorkspaceInfo(dataDir, db.dbPath) : null);
    if (current && !list.some((w) => w.id === current.id || w.path === current.path)) {
      list.unshift({
        id: current.id,
        name: current.name,
        path: current.path,
        db_path: current.dbPath,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
      });
    }
    res.json({
      ok: true,
      current,
      workspaces: list,
    });
  });

  // Assets API: List all companion resources (images, PDFs, datasets, etc.) in data directory (1 level deep)
  app.get('/api/assets', (_req: Request, res: Response) => {
    if (!dataDir || !fs.existsSync(dataDir)) {
      res.json([]);
      return;
    }
    const resolvedDataDir = path.resolve(dataDir);
    const allFolders = db.getFolders();
    const assets: Array<{
      name: string;
      relativePath: string;
      size: number;
      ext: string;
      isImage: boolean;
      isPdf: boolean;
      folderId: string | null;
      folderName: string | null;
    }> = [];

    const isAssetExt = (ext: string) => {
      return !['.vmd', '.md', '.markdown', '.mdown', '.mkd', '.mkdn'].includes(ext);
    };

    try {
      const rootEntries = fs.readdirSync(resolvedDataDir, { withFileTypes: true });

      // 1. Files directly in dataDir (root level, 1 level deep)
      for (const entry of rootEntries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(resolvedDataDir, entry.name);

        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (isAssetExt(ext)) {
            const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.avif'].includes(ext);
            const isPdf = ext === '.pdf';
            const stats = fs.statSync(fullPath);
            assets.push({
              name: entry.name,
              relativePath: entry.name,
              size: stats.size,
              ext,
              isImage,
              isPdf,
              folderId: null,
              folderName: null,
            });
          }
        } else if (entry.isDirectory()) {
          const dirName = entry.name;
          const folderDir = path.join(resolvedDataDir, dirName);

          // If legacy assets/ folder at root
          if (dirName.toLowerCase() === 'assets') {
            try {
              const subItems = fs.readdirSync(folderDir, { withFileTypes: true });
              for (const sub of subItems) {
                if (sub.name.startsWith('.') || !sub.isFile()) continue;
                const ext = path.extname(sub.name).toLowerCase();
                if (isAssetExt(ext)) {
                  const stats = fs.statSync(path.join(folderDir, sub.name));
                  assets.push({
                    name: sub.name,
                    relativePath: `assets/${sub.name}`,
                    size: stats.size,
                    ext,
                    isImage: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.avif'].includes(ext),
                    isPdf: ext === '.pdf',
                    folderId: null,
                    folderName: null,
                  });
                }
              }
            } catch {}
            continue;
          }

          // Match created virtual folder
          const matchedFolder = allFolders.find((f) => f.name.toLowerCase() === dirName.toLowerCase());
          const folderId = matchedFolder ? matchedFolder.id : null;
          const folderName = matchedFolder ? matchedFolder.name : dirName;

          // 2. Scan directly inside the folder (only 1 level deep, nested subdirectories ignored)
          try {
            const folderEntries = fs.readdirSync(folderDir, { withFileTypes: true });
            for (const item of folderEntries) {
              if (item.name.startsWith('.')) continue;
              const itemPath = path.join(folderDir, item.name);

              if (item.isFile()) {
                const ext = path.extname(item.name).toLowerCase();
                if (isAssetExt(ext)) {
                  const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.avif'].includes(ext);
                  const isPdf = ext === '.pdf';
                  const stats = fs.statSync(itemPath);
                  assets.push({
                    name: item.name,
                    relativePath: `${dirName}/${item.name}`,
                    size: stats.size,
                    ext,
                    isImage,
                    isPdf,
                    folderId,
                    folderName,
                  });
                }
              } else if (item.isDirectory() && item.name.toLowerCase() === 'assets') {
                // If a legacy assets/ subfolder exists inside this folder, include its direct files
                try {
                  const legacyItems = fs.readdirSync(itemPath, { withFileTypes: true });
                  for (const legacy of legacyItems) {
                    if (legacy.name.startsWith('.') || !legacy.isFile()) continue;
                    const ext = path.extname(legacy.name).toLowerCase();
                    if (isAssetExt(ext)) {
                      const stats = fs.statSync(path.join(itemPath, legacy.name));
                      assets.push({
                        name: legacy.name,
                        relativePath: `${dirName}/assets/${legacy.name}`,
                        size: stats.size,
                        ext,
                        isImage: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.avif'].includes(ext),
                        isPdf: ext === '.pdf',
                        folderId,
                        folderName,
                      });
                    }
                  }
                } catch {}
              }
              // Notice: Any deeper nested subdirectories are ignored!
            }
          } catch {}
        }
      }
    } catch {}

    res.json(assets);
  });

  // Serve static asset files (images, diagrams, documents) from data directory
  app.get('/api/assets/*', (req: Request, res: Response) => {
    if (!dataDir) {
      res.status(404).json({ error: 'No data directory configured' });
      return;
    }

    const resolvedDataDir = path.resolve(dataDir);
    const rawPath = req.params[0] ? decodeURIComponent(req.params[0]) : '';
    let targetPath = path.resolve(resolvedDataDir, rawPath);

    // Security: Prevent path traversal outside dataDir
    if (!isPathInsideDir(targetPath, resolvedDataDir)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // 1. Direct path check
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      res.sendFile(targetPath);
      return;
    }

    // 2. Intelligent subfolder fallback search:
    // If markdown referenced ![diagram](arch.png) but the file is inside dataDir/images/arch.png
    const baseName = path.basename(rawPath);
    const findFile = (dir: string): string | null => {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.name.startsWith('.')) continue;
          const full = path.join(dir, item.name);
          if (item.isFile() && item.name.toLowerCase() === baseName.toLowerCase()) {
            return full;
          }
          if (item.isDirectory()) {
            const sub = findFile(full);
            if (sub) return sub;
          }
        }
      } catch {}
      return null;
    };

    const located = findFile(resolvedDataDir);
    if (located) {
      res.sendFile(located);
      return;
    }

    res.status(404).json({ error: `Asset '${rawPath}' not found in workspace` });
  });

  // Delete companion asset file (image, PDF, etc.)
  app.delete('/api/assets/*', async (req: Request, res: Response) => {
    try {
      if (!dataDir) {
        res.status(404).json({ error: 'No data directory configured' });
        return;
      }

      const resolvedDataDir = path.resolve(dataDir);
      const rawPath = req.params[0] ? decodeURIComponent(req.params[0]) : '';
      if (!rawPath) {
        res.status(400).json({ error: 'Asset path is required' });
        return;
      }

      const targetPath = path.resolve(resolvedDataDir, rawPath);
      if (!isPathInsideDir(targetPath, resolvedDataDir)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
        fs.unlinkSync(targetPath);
        await autoCommitDataChange(dataDir, `Delete asset "${path.basename(targetPath)}"`, targetPath).catch(() => {});
        broadcastEvent('sync', { type: 'asset_delete', path: rawPath });
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Asset file not found' });
      }
    } catch (err: any) {
      console.error('[VisualMD] Failed to delete asset:', err);
      res.status(500).json({ error: err.message || 'Failed to delete asset' });
    }
  });

  // Prompts and Skills API
  app.get('/api/prompts/:type', (req: Request, res: Response) => {
    const type = String(req.params.type);
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const possiblePromptsDirs = [
      path.resolve(process.cwd(), 'prompts'),
      path.resolve(process.cwd(), '../../prompts'),
      path.resolve(__dirname, '../../../prompts'),
      path.resolve(__dirname, '../../prompts'),
    ];
    const promptsDir = possiblePromptsDirs.find((d) => fs.existsSync(d)) || path.resolve(process.cwd(), 'prompts');
    let fileName = '';
    let contentType = 'text/plain; charset=utf-8';

    if (type === 'skill') {
      fileName = 'skill.md';
      contentType = 'text/markdown; charset=utf-8';
    } else if (type === 'standard') {
      fileName = 'VisualMDStandard.md';
      contentType = 'text/markdown; charset=utf-8';
    } else if (type === 'mindmap') {
      fileName = 'mindmap-prompt.md';
      contentType = 'text/markdown; charset=utf-8';
    } else if (type === 'system-prompt') {
      fileName = 'system-prompt.txt';
    } else {
      res.status(404).json({ error: 'Prompt type not found' });
      return;
    }

    const filePath = path.join(promptsDir, fileName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: `Prompt file ${fileName} not found` });
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    }
    res.setHeader('Content-Type', contentType);
    res.send(content);
  });

  // Folders API
  app.get('/api/folders', (_req: Request, res: Response) => {
    const folders = db.getFolders();
    res.json(folders);
  });

  app.post('/api/folders', (req: Request, res: Response) => {
    try {
      const { name, parent_id } = req.body;
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Folder name is required' });
        return;
      }
      const trimmed = name.trim();
      if (!trimmed) {
        res.status(400).json({ error: 'Folder name cannot be empty' });
        return;
      }

      // If user is intentionally creating a folder named "Examples", clear the deletion flag
      if (trimmed.toLowerCase() === 'examples') {
        db.deleteSetting('examples_deleted');
      }

      const folder = db.createFolder(trimmed, parent_id || null);

      // Create physical directory in dataDir immediately so syncDataDirectory never prunes it!
      if (dataDir) {
        const targetDir = path.resolve(dataDir, folder.name);
        if (!fs.existsSync(targetDir)) {
          try {
            fs.mkdirSync(targetDir, { recursive: true });
          } catch (err) {
            console.error('[VisualMD] Failed to create folder directory on disk:', err);
          }
        }
      }

      broadcastEvent('sync', { type: 'folder_create', id: folder.id });
      res.status(201).json(folder);
    } catch (err: any) {
      console.error('[VisualMD] Failed to create folder:', err);
      res.status(500).json({ error: err.message || 'Failed to create folder' });
    }
  });

  app.put('/api/folders/:id', async (req: Request, res: Response) => {
    try {
      const folderId = String(req.params.id);
      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Folder name is required' });
        return;
      }
      const newName = name.trim();
      const existingFolder = db.getFolderById(folderId);
      if (!existingFolder) {
        res.status(404).json({ error: 'Folder not found' });
        return;
      }

      const oldName = existingFolder.name;
      const updatedFolder = db.renameFolder(folderId, newName);

      // Physically rename directory in dataDir if it exists
      if (dataDir && oldName !== newName) {
        const resolvedDataDir = path.resolve(dataDir);
        const oldSubDir = path.join(resolvedDataDir, oldName);
        const newSubDir = path.join(resolvedDataDir, newName);

        if (fs.existsSync(oldSubDir) && isPathInsideDir(oldSubDir, resolvedDataDir)) {
          try {
            fs.renameSync(oldSubDir, newSubDir);
            // Update file_paths of docs inside this folder
            const docs = db.getDocuments(folderId);
            for (const doc of docs) {
              if (doc.file_path && isPathInsideDir(doc.file_path, oldSubDir)) {
                const updatedPath = path.join(newSubDir, path.basename(doc.file_path));
                db.updateDocument(doc.id, { file_path: updatedPath });
              }
            }
          } catch (err) {
            console.error('[VisualMD] Failed to rename physical directory:', err);
          }
        } else if (!fs.existsSync(newSubDir)) {
          try {
            fs.mkdirSync(newSubDir, { recursive: true });
          } catch {}
        }

        await autoCommitDataChange(dataDir, `Rename folder "${oldName}" to "${newName}"`);
      }

      broadcastEvent('sync', { type: 'folder_rename', id: folderId });
      res.json(updatedFolder);
    } catch (err: any) {
      console.error('[VisualMD] Failed to rename folder:', err);
      res.status(500).json({ error: err.message || 'Failed to rename folder' });
    }
  });

  app.delete('/api/folders/:id', async (req: Request, res: Response) => {
    try {
      const folderId = String(req.params.id);
      const existingFolder = db.getFolders().find((f) => f.id === folderId);
      const folderName = existingFolder?.name || 'Folder';
      const isExamples = folderName.toLowerCase() === 'examples';

      const { deletedDocFilePaths } = db.deleteFolder(folderId);

      // If user explicitly deleted the Examples folder, record it so it is never re-seeded or resurrected
      if (isExamples) {
        db.setSetting('examples_deleted', 'true');
      }

      // Physically remove deleted doc files in dataDir
      if (dataDir) {
        const resolvedDataDir = path.resolve(dataDir);
        for (const filePath of deletedDocFilePaths) {
          if (filePath && fs.existsSync(filePath)) {
            const resolvedFilePath = path.resolve(filePath);
            if (isPathInsideDir(resolvedFilePath, resolvedDataDir)) {
              try {
                fs.unlinkSync(resolvedFilePath);
              } catch (err) {
                console.error('[VisualMD] Failed to delete file when deleting folder:', err);
              }
            }
          }
        }

        // If a physical folder directory matching this folder exists in dataDir, clean it up
        if (existingFolder) {
          const possibleSubDirs = [
            path.resolve(dataDir, existingFolder.name),
            path.resolve(dataDir, existingFolder.name.toLowerCase()),
          ];
          for (const subDir of possibleSubDirs) {
            if (fs.existsSync(subDir) && isPathInsideDir(subDir, resolvedDataDir)) {
              try {
                fs.rmSync(subDir, { recursive: true, force: true });
              } catch (err) {
                console.error('[VisualMD] Failed to delete physical folder directory:', err);
              }
            }
          }
        }

        // Auto-commit git changes
        await autoCommitDataChange(dataDir, `Delete folder "${folderName}" and contained files`);
      }

      broadcastEvent('sync', { type: 'folder_delete', id: folderId });
      res.json({ success: true, deletedDocCount: deletedDocFilePaths.length });
    } catch (err: any) {
      console.error('[VisualMD] Failed to delete folder:', err);
      res.status(500).json({ error: err.message || 'Failed to delete folder' });
    }
  });

  // Settings API
  app.get('/api/settings', (req: Request, res: Response) => {
    const all = db.getAllSettings();
    res.json(all);
  });

  app.post('/api/settings', (req: Request, res: Response) => {
    const updates = req.body;
    if (typeof updates === 'object' && updates !== null) {
      for (const [key, val] of Object.entries(updates)) {
        if (val !== undefined && val !== null) {
          const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
          db.setSetting(key, strVal);
        }
      }
      broadcastEvent('settings_changed', updates);
      res.json({ success: true, settings: db.getAllSettings() });
      return;
    }
    res.status(400).json({ error: 'Settings object required' });
  });

  app.get('/api/settings/:key', (req: Request, res: Response) => {
    const key = String(req.params.key);
    const value = db.getSetting(key);
    res.json({ key, value });
  });

  app.post('/api/settings/:key', (req: Request, res: Response) => {
    const key = String(req.params.key);
    const { value } = req.body;
    if (value === undefined || value === null) {
      res.status(400).json({ error: 'Value is required' });
      return;
    }
    const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
    db.setSetting(key, strVal);
    broadcastEvent('settings_changed', { [key]: strVal });
    res.json({ success: true, key, value: strVal });
  });

  // Documents API
  app.get('/api/docs', (req: Request, res: Response) => {
    const folderId = req.query.folder_id as string | undefined;
    const docs = db.getDocuments(folderId);
    res.json(docs);
  });

  app.get('/api/docs/:id', (req: Request, res: Response) => {
    const doc = db.getDocumentById(String(req.params.id));
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json(doc);
  });

  app.post('/api/docs', async (req: Request, res: Response) => {
    try {
      const { title, content, folder_id } = req.body;
      if (!content || typeof content !== 'string') {
        res.status(400).json({ error: 'Document content is required' });
        return;
      }

      const validFolderId = db.sanitizeFolderId(folder_id);

      let targetPath: string | null = null;
      if (dataDir) {
        let targetDir = dataDir;
        if (validFolderId) {
          const folder = db.getFolderById(validFolderId);
          if (folder) {
            targetDir = path.join(dataDir, folder.name);
          }
        }
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        targetPath = getSafeFileName(title || 'doc', targetDir);
        try {
          fs.writeFileSync(targetPath, content, 'utf-8');
        } catch (err) {
          console.error('[VisualMD] Failed to save document file in data folder:', err);
        }
      }

      const doc = db.createDocument(title || '', content, validFolderId, targetPath);
      if (dataDir && targetPath) {
        await autoCommitDataChange(dataDir, `Add document "${doc.title}"`, targetPath).catch(() => {});
      }
      broadcastEvent('sync', { type: 'doc_create', id: doc.id });
      res.status(201).json(doc);
    } catch (err: any) {
      console.error('[VisualMD] Failed to create document:', err);
      res.status(500).json({ error: err.message || 'Failed to create document' });
    }
  });

  app.put('/api/docs/:id', async (req: Request, res: Response) => {
    try {
      const existing = db.getDocumentById(String(req.params.id));
      if (!existing) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      let updatedFilePath = existing.file_path;
      let targetFolderId: string | null | undefined = undefined;
      if (req.body.folder_id !== undefined) {
        targetFolderId = db.sanitizeFolderId(req.body.folder_id);
      }

      // If folder_id changed, move physical file in data directory if applicable
      if (
        targetFolderId !== undefined &&
        targetFolderId !== existing.folder_id &&
        dataDir &&
        existing.file_path &&
        fs.existsSync(existing.file_path)
      ) {
        const resolvedDataDir = path.resolve(dataDir);
        const currentFilePath = path.resolve(existing.file_path);
        if (isPathInsideDir(currentFilePath, resolvedDataDir)) {
          let destDir = resolvedDataDir;
          if (targetFolderId) {
            const targetFolder = db.getFolderById(targetFolderId);
            if (targetFolder) {
              destDir = path.join(resolvedDataDir, targetFolder.name);
            }
          }
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          const newFilePath = path.join(destDir, path.basename(currentFilePath));
          try {
            if (currentFilePath !== newFilePath) {
              fs.renameSync(currentFilePath, newFilePath);
              updatedFilePath = newFilePath;
            }
          } catch (err) {
            console.error('[VisualMD] Failed to move physical file to new folder directory:', err);
          }
        }
      }

      if (req.body.content !== undefined && updatedFilePath && fs.existsSync(updatedFilePath)) {
        try {
          fs.writeFileSync(updatedFilePath, req.body.content, 'utf-8');
        } catch (err) {
          console.error('[VisualMD] Failed to update file in data folder:', err);
        }
      }

      const updates: any = { ...req.body, file_path: updatedFilePath };
      if (targetFolderId !== undefined) {
        updates.folder_id = targetFolderId;
      }
      const doc = db.updateDocument(String(req.params.id), updates);

      const isSignificant =
        req.body.content !== undefined ||
        req.body.title !== undefined ||
        req.body.folder_id !== undefined;

      if (isSignificant) {
        if (dataDir && updatedFilePath) {
          await autoCommitDataChange(dataDir, `Update document "${doc?.title || existing.title}"`, updatedFilePath).catch(() => {});
        }
        broadcastEvent('sync', { type: 'doc_update', id: doc?.id });
      }

      res.json(doc);
    } catch (err: any) {
      console.error('[VisualMD] Failed to update document:', err);
      res.status(500).json({ error: err.message || 'Failed to update document' });
    }
  });

  app.delete('/api/docs/:id', async (req: Request, res: Response) => {
    try {
      const existing = db.getDocumentById(String(req.params.id));
      const { filePath } = db.deleteDocument(String(req.params.id));

      // Only physically remove if the file resides within the data directory
      if (filePath && fs.existsSync(filePath)) {
        const resolvedDataDir = dataDir ? path.resolve(dataDir) : null;
        const resolvedFilePath = path.resolve(filePath);
        if (resolvedDataDir && isPathInsideDir(resolvedFilePath, resolvedDataDir)) {
          try {
            fs.unlinkSync(resolvedFilePath);
          } catch (err) {
            console.error('[VisualMD] Failed to delete file in data directory:', err);
          }
        }
        if (dataDir) {
          await autoCommitDataChange(dataDir, `Delete document "${existing?.title || 'doc'}"`, filePath);
        }
      }

      broadcastEvent('sync', { type: 'doc_delete', id: String(req.params.id) });
      res.json({ success: true });
    } catch (err: any) {
      console.error('[VisualMD] Failed to delete document:', err);
      res.status(500).json({ error: err.message || 'Failed to delete document' });
    }
  });

  // Bookmarks API
  app.post('/api/docs/:id/bookmark', (req: Request, res: Response) => {
    const { node_id, label } = req.body;
    if (!node_id) {
      res.status(400).json({ error: 'node_id is required' });
      return;
    }
    const result = db.toggleBookmark(String(req.params.id), node_id, label || null);
    res.json(result);
  });

  // Annotations API
  app.post('/api/docs/:id/annotation', (req: Request, res: Response) => {
    const { node_id, selected_text, note, color, occurrence_index, table_cell } = req.body;
    // node_id and either note or selected_text are required
    if (!node_id || (!selected_text && !note)) {
      res.status(400).json({ error: 'node_id and at least one of selected_text or note are required' });
      return;
    }
    const annotation = db.addAnnotation(
      String(req.params.id),
      node_id,
      selected_text || '',
      note || '',
      color || 'yellow',
      typeof occurrence_index === 'number' ? occurrence_index : 0,
      table_cell || null
    );
    res.status(201).json(annotation);
  });

  app.delete('/api/annotations/:id', (req: Request, res: Response) => {
    db.deleteAnnotation(String(req.params.id));
    res.json({ success: true });
  });

  // Document Versions API (VisualMD Snapshot VCS)
  app.get('/api/docs/:id/versions', (req: Request, res: Response) => {
    const docId = String(req.params.id);
    const doc = db.getDocumentById(docId);
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    const versions = db.getVersions(docId);
    res.json(versions);
  });

  app.get('/api/docs/:id/versions/:versionId', (req: Request, res: Response) => {
    const versionId = String(req.params.versionId);
    const ver = db.getVersionById(versionId);
    if (!ver) {
      res.status(404).json({ error: 'Version not found' });
      return;
    }
    res.json(ver);
  });

  app.post('/api/docs/:id/versions', async (req: Request, res: Response) => {
    const docId = String(req.params.id);
    const { summary, content, title, set_as_latest } = req.body;
    const doc = db.getDocumentById(docId);
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const newContent = content !== undefined ? String(content) : doc.content;
    const newTitle = title !== undefined ? String(title) : doc.title;
    const verSummary = summary ? String(summary).trim() : 'Manual Checkpoint';

    // Guarantee the previous active version is internally saved before adding or activating new version
    if (content !== undefined && (doc.content !== newContent || doc.title !== newTitle)) {
      const existingVersions = db.getVersions(docId);
      const latestVer = existingVersions.length > 0 ? existingVersions[0] : null;
      if (!latestVer || latestVer.content !== doc.content || latestVer.title !== doc.title) {
        db.createVersion(docId, `Auto-saved prior version before revision: ${verSummary}`, doc.content, doc.title);
      }
    }

    if (set_as_latest && content !== undefined) {
      // 1. Update active document in DB
      const updated = db.updateDocument(
        docId,
        {
          title: newTitle,
          content: newContent,
        },
        true
      );

      // 3. Record the new version
      const ver = db.createVersion(docId, verSummary, newContent, newTitle);

      // 4. Update physical file if linked in data directory
      if (dataDir && doc.file_path && fs.existsSync(doc.file_path)) {
        try {
          fs.writeFileSync(doc.file_path, newContent, 'utf-8');
        } catch (err) {
          console.error('[VisualMD] Failed to write uploaded version to disk:', err);
        }
        await autoCommitDataChange(dataDir, `Upload new version for "${newTitle}"`, doc.file_path).catch(() => {});
      }

      broadcastEvent('sync', { type: 'doc_update', id: docId });
      res.status(201).json({ ...ver, document: updated, isLatest: true });
      return;
    }

    // Default: record version without changing current document
    const ver = db.createVersion(docId, verSummary, newContent, newTitle);
    res.status(201).json({ ...ver, isLatest: false });
  });

  app.post('/api/docs/:id/versions/:versionId/restore', async (req: Request, res: Response) => {
    const docId = String(req.params.id);
    const versionId = String(req.params.versionId);
    const restored = db.restoreVersion(docId, versionId);
    if (!restored) {
      res.status(404).json({ error: 'Failed to restore: document or version not found' });
      return;
    }

    // Update physical file in dataDir if it exists
    if (dataDir && restored.file_path && fs.existsSync(restored.file_path)) {
      try {
        fs.writeFileSync(restored.file_path, restored.content, 'utf-8');
      } catch (err) {
        console.error('[VisualMD] Failed to update physical file on restore:', err);
      }
      await autoCommitDataChange(dataDir, `Restore document "${restored.title}" to previous version`, restored.file_path).catch(() => {});
    }

    broadcastEvent('sync', { type: 'doc_restore', id: docId });
    res.json({ success: true, document: restored });
  });

  // Full-Text Search
  app.get('/api/search', (req: Request, res: Response) => {
    const q = (req.query.q as string) || '';
    const results = db.search(q);
    res.json(results);
  });

  // Sync data directory endpoint
  app.post('/api/sync', (_req: Request, res: Response) => {
    if (dataDir) {
      const result = db.syncDataDirectory(dataDir);
      broadcastEvent('sync', result);
      res.json({ success: true, ...result });
    } else {
      res.json({ success: true, added: 0, updated: 0, deleted: 0 });
    }
  });

  // Import raw text or files (saves each into data/ folder)
  app.post('/api/import', async (req: Request, res: Response) => {
    try {
      let rawFiles = req.body.files;
      let targetFolderId: string | null = db.sanitizeFolderId(req.body.folder_id);

      // Support single file payload: { filename/name, content, folder_id }
      if (!rawFiles) {
        if (req.body.filename || req.body.name || req.body.content !== undefined) {
          rawFiles = [{
            name: req.body.filename || req.body.name || 'imported.vmd',
            content: req.body.content || '',
          }];
        }
      }

      if (!Array.isArray(rawFiles) || rawFiles.length === 0) {
        res.status(400).json({ error: 'Array of files or a file object is required' });
        return;
      }

      let targetDir = dataDir;
      if (dataDir && targetFolderId) {
        const folder = db.getFolderById(targetFolderId);
        if (folder) {
          targetDir = path.join(dataDir, folder.name);
        }
      }
      if (targetDir && !fs.existsSync(targetDir)) {
        try {
          fs.mkdirSync(targetDir, { recursive: true });
        } catch {}
      }

      const importedDocs = [];
      const importedAssets = [];

      for (const file of rawFiles) {
        const fileName = file.name || file.filename || 'file';
        const isDoc = isCompatibleDocFile(fileName);

        if (isDoc) {
          const rawContent = typeof file.content === 'string' ? file.content : '';
          let docContent = rawContent;
          let parsed = parseVisualMD(docContent);
          const fallbackTitle = fileName ? fileName.replace(/\.(vmd|md|markdown|mdown|txt|mindmap)$/i, '') : 'Untitled';

          // If file is a .mindmap file without a $MINDMAP$ block, wrap into a full VisualMD document
          if (fileName.toLowerCase().endsWith('.mindmap') && !docContent.includes('$MINDMAP$S')) {
            const mmTitle = (parsed.title && parsed.title !== 'Untitled' && parsed.title !== 'Untitled VisualMD Document')
              ? parsed.title
              : fallbackTitle;
            docContent = `# ${mmTitle}\n\n$MINDMAP$S?title=${encodeURIComponent(mmTitle)}\n${rawContent.trim()}\n$MINDMAP$E\n`;
            parsed = parseVisualMD(docContent);
          }

          const title = (parsed.title && parsed.title !== 'Untitled' && parsed.title !== 'Untitled VisualMD Document')
            ? parsed.title
            : fallbackTitle;

          let targetPath: string | null = null;
          if (targetDir) {
            const safeName = fileName
              ? path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_')
              : `${title.toLowerCase().replace(/[^a-z0-9_-]+/gi, '-')}.vmd`;
            targetPath = path.join(targetDir, safeName);
            let counter = 1;
            while (fs.existsSync(targetPath)) {
              const ext = path.extname(safeName) || '.vmd';
              const nameWithoutExt = path.basename(safeName, ext);
              targetPath = path.join(targetDir, `${nameWithoutExt}-${counter}${ext}`);
              counter++;
            }
            try {
              fs.writeFileSync(targetPath, docContent, 'utf-8');
            } catch (err) {
              console.error('[VisualMD] Failed to write imported file to data directory:', err);
            }
          }

          const doc = db.createDocument(title, docContent, targetFolderId, targetPath);
          importedDocs.push(doc);
        } else {
          // Supporting companion asset (Image, PDF, etc.)
          // Stored directly in the target folder (or root data directory) - 1 level deep, no separate physical subfolder
          if (dataDir) {
            const destDir = targetDir || dataDir;
            if (!fs.existsSync(destDir)) {
              try {
                fs.mkdirSync(destDir, { recursive: true });
              } catch (err) {
                console.error('[VisualMD] Failed to create destination directory:', err);
              }
            }

            const rawExt = path.extname(fileName) || '';
            const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
            let targetPath = path.join(destDir, safeName);
            let counter = 1;
            while (fs.existsSync(targetPath)) {
              const ext = path.extname(safeName) || rawExt;
              const nameWithoutExt = path.basename(safeName, ext);
              targetPath = path.join(destDir, `${nameWithoutExt}-${counter}${ext}`);
              counter++;
            }

            try {
              const isBinary = file.encoding === 'base64' || file.isAsset || rawExt.toLowerCase() === '.pdf' || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.ico'].includes(rawExt.toLowerCase());
              if (isBinary && typeof file.content === 'string') {
                const buffer = Buffer.from(file.content, 'base64');
                fs.writeFileSync(targetPath, buffer);
              } else {
                fs.writeFileSync(targetPath, file.content || '', 'utf-8');
              }

              const resolvedDataDir = path.resolve(dataDir);
              const relativePath = path.relative(resolvedDataDir, targetPath).replace(/\\/g, '/');
              const stats = fs.statSync(targetPath);
              importedAssets.push({
                name: path.basename(targetPath),
                relativePath,
                size: stats.size,
                ext: rawExt.toLowerCase(),
                isImage: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.avif'].includes(rawExt.toLowerCase()),
                isPdf: rawExt.toLowerCase() === '.pdf',
              });
            } catch (err) {
              console.error('[VisualMD] Failed to write imported asset:', err);
            }
          }
        }
      }

      const totalCount = importedDocs.length + importedAssets.length;
      if (dataDir && totalCount > 0) {
        await autoCommitDataChange(dataDir, `Import ${totalCount} file(s)`).catch(() => {});
      }

      broadcastEvent('sync', {
        type: 'import',
        count: totalCount,
        docCount: importedDocs.length,
        assetCount: importedAssets.length,
      });
      res.status(201).json({
        success: true,
        count: totalCount,
        docs: importedDocs,
        documents: importedDocs,
        assets: importedAssets,
      });
    } catch (err: any) {
      console.error('[VisualMD] Failed to import documents:', err);
      res.status(500).json({ error: err.message || 'Failed to import documents' });
    }
  });

  // Validate endpoint
  app.post('/api/validate', (req: Request, res: Response) => {
    const { content } = req.body;
    const result = validateVisualMD(content || '');
    res.json(result);
  });

  // Secure Sandboxed Code Runner
  // Evaluates JavaScript/Node snippets in strict isolation container
  app.post('/api/sandbox/run', (req: Request, res: Response) => {
    const { code, timeoutMs } = req.body;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Code string is required' });
      return;
    }

    const result = executeSandboxedCode(code, {
      timeoutMs: typeof timeoutMs === 'number' ? timeoutMs : 2000,
    });

    res.json(result);
  });

  // API 404 fallback (prevents non-existent API routes from serving SPA HTML)
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found', status: 404 });
  });

  // If running in backend-only mode (e.g. port 9669), disallow frontend serving
  if (isBackendOnly) {
    app.get('/', (_req: Request, res: Response) => {
      res.status(403).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VisualMD Backend Engine (Port Restricted)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #18181b; border: 1px solid #27272a; padding: 36px; border-radius: 20px; max-width: 480px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; border: 1px solid rgba(56, 189, 248, 0.3); }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 10px; color: #ffffff; }
    p { font-size: 13px; color: #a1a1aa; line-height: 1.6; margin: 0 0 24px; }
    a { display: inline-flex; align-items: center; gap: 8px; background: #3b82f6; color: white; padding: 10px 22px; border-radius: 10px; text-decoration: none; font-size: 13px; font-weight: 600; transition: opacity 0.2s; }
    a:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Backend Port Restricted</div>
    <h1>VisualMD Backend Engine</h1>
    <p>Port 9669 is an internal backend API service. Direct frontend access on this port is disabled for production. Please access the VisualMD UI on port 5665.</p>
    <a href="http://localhost:5665">Open VisualMD UI (Port 5665) &rarr;</a>
  </div>
</body>
</html>`);
    });

    app.all('*', (_req: Request, res: Response) => {
      res.status(404).json({ error: 'Endpoint not found on VisualMD backend engine' });
    });
  } else if (staticDir && fs.existsSync(staticDir)) {
    // Serve static UI in production on port 5665
    app.use(express.static(staticDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  } else {
    // Backend fallback 404
    app.all('*', (_req: Request, res: Response) => {
      res.status(404).json({ error: 'Route not found' });
    });
  }

  // Global error safety net: catch any uncaught exceptions to ensure Node server never crashes
  app.use((err: any, _req: Request, res: Response, _next: any) => {
    console.error('[VisualMD] Unhandled Express error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Internal server error' });
    }
  });

  return app;
}
