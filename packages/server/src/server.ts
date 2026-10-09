import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { VisualMDDatabase } from './db.js';
import { parseVisualMD, validateVisualMD } from '../../compiler/dist/index.js';
import { autoCommitDataChange } from './git.js';

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
  dataDir?: string
) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  if (dataDir && !fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: '1.0.1',
      dbPath: db.dbPath,
      dataDir: dataDir ? path.resolve(dataDir) : null,
    });
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
    const { name, parent_id } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Folder name is required' });
      return;
    }
    const folder = db.createFolder(name.trim(), parent_id || null);
    res.status(201).json(folder);
  });

  app.delete('/api/folders/:id', async (req: Request, res: Response) => {
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
          if (resolvedFilePath.startsWith(resolvedDataDir)) {
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
          if (fs.existsSync(subDir) && subDir.startsWith(resolvedDataDir)) {
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

    res.json({ success: true, deletedDocCount: deletedDocFilePaths.length });
  });

  // Settings API
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
    db.setSetting(key, String(value));
    res.json({ success: true, key, value: String(value) });
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

  app.post('/api/docs', (req: Request, res: Response) => {
    const { title, content, folder_id } = req.body;
    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Document content is required' });
      return;
    }

    let targetPath: string | null = null;
    if (dataDir) {
      let targetDir = dataDir;
      if (folder_id) {
        const folder = db.getFolders().find((f) => f.id === folder_id);
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

    const doc = db.createDocument(title || '', content, folder_id || null, targetPath);
    if (dataDir && targetPath) {
      autoCommitDataChange(dataDir, `Add document "${doc.title}"`, targetPath).catch(() => {});
    }
    res.status(201).json(doc);
  });

  app.put('/api/docs/:id', async (req: Request, res: Response) => {
    const existing = db.getDocumentById(String(req.params.id));
    if (!existing) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    let updatedFilePath = existing.file_path;

    // If folder_id changed, move physical file in data directory if applicable
    if (
      req.body.folder_id !== undefined &&
      req.body.folder_id !== existing.folder_id &&
      dataDir &&
      existing.file_path &&
      fs.existsSync(existing.file_path)
    ) {
      const resolvedDataDir = path.resolve(dataDir);
      const currentFilePath = path.resolve(existing.file_path);
      if (currentFilePath.startsWith(resolvedDataDir)) {
        let destDir = resolvedDataDir;
        if (req.body.folder_id) {
          const targetFolder = db.getFolders().find((f) => f.id === req.body.folder_id);
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

    const updates = { ...req.body, file_path: updatedFilePath };
    const doc = db.updateDocument(String(req.params.id), updates);

    if (dataDir && updatedFilePath) {
      autoCommitDataChange(dataDir, `Update document "${doc?.title || existing.title}"`, updatedFilePath).catch(() => {});
    }

    res.json(doc);
  });

  app.delete('/api/docs/:id', async (req: Request, res: Response) => {
    const existing = db.getDocumentById(String(req.params.id));
    const { filePath } = db.deleteDocument(String(req.params.id));

    // Only physically remove if the file resides within the data directory
    if (filePath && fs.existsSync(filePath)) {
      const resolvedDataDir = dataDir ? path.resolve(dataDir) : null;
      const resolvedFilePath = path.resolve(filePath);
      if (resolvedDataDir && resolvedFilePath.startsWith(resolvedDataDir)) {
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

    res.json({ success: true });
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
    const { node_id, selected_text, note, color, occurrence_index } = req.body;
    if (!node_id || !selected_text || !note) {
      res.status(400).json({ error: 'node_id, selected_text, and note are required' });
      return;
    }
    const annotation = db.addAnnotation(
      String(req.params.id),
      node_id,
      selected_text,
      note,
      color || 'yellow',
      typeof occurrence_index === 'number' ? occurrence_index : 0
    );
    res.status(201).json(annotation);
  });

  app.delete('/api/annotations/:id', (req: Request, res: Response) => {
    db.deleteAnnotation(String(req.params.id));
    res.json({ success: true });
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
      res.json({ success: true, ...result });
    } else {
      res.json({ success: true, added: 0, updated: 0 });
    }
  });

  // Import raw text or files (saves each into data/ folder)
  app.post('/api/import', (req: Request, res: Response) => {
    let rawFiles = req.body.files;
    let targetFolderId: string | null = req.body.folder_id ? String(req.body.folder_id).trim() : null;
    if (targetFolderId === '' || targetFolderId === 'null' || targetFolderId === 'undefined') {
      targetFolderId = null;
    }

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

    const imported = [];
    for (const file of rawFiles) {
      const content = file.content || '';
      const parsed = parseVisualMD(content);
      const fileName = file.name || file.filename || '';
      const title = (parsed.title && parsed.title !== 'Untitled')
        ? parsed.title
        : (fileName ? fileName.replace(/\.(vmd|md|txt)$/i, '') : 'Untitled');

      let targetPath: string | null = null;
      if (dataDir) {
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        const safeName = fileName
          ? fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
          : `${title.toLowerCase().replace(/[^a-z0-9_-]+/gi, '-')}.vmd`;
        targetPath = path.join(dataDir, safeName);
        let counter = 1;
        while (fs.existsSync(targetPath)) {
          const ext = path.extname(safeName) || '.vmd';
          const nameWithoutExt = path.basename(safeName, ext);
          targetPath = path.join(dataDir, `${nameWithoutExt}-${counter}${ext}`);
          counter++;
        }
        try {
          fs.writeFileSync(targetPath, content, 'utf-8');
        } catch (err) {
          console.error('[VisualMD] Failed to write imported file to data directory:', err);
        }
      }

      const doc = db.createDocument(title, content, targetFolderId, targetPath);
      imported.push(doc);
    }

    if (dataDir && imported.length > 0) {
      autoCommitDataChange(dataDir, `Import ${imported.length} document(s)`).catch(() => {});
    }

    res.status(201).json({
      success: true,
      count: imported.length,
      docs: imported,
      documents: imported,
    });
  });

  // Validate endpoint
  app.post('/api/validate', (req: Request, res: Response) => {
    const { content } = req.body;
    const result = validateVisualMD(content || '');
    res.json(result);
  });

  // Serve static UI if available
  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  return app;
}
