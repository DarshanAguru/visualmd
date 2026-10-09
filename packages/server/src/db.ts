import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { parseVisualMD } from '../../compiler/dist/index.js';

export interface FolderRecord {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  folder_id: string | null;
  title: string;
  content: string;
  parsed_json: string;
  file_path: string | null;
  last_read_position: number;
  last_read_node: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookmarkRecord {
  id: string;
  doc_id: string;
  node_id: string;
  label: string | null;
  created_at: string;
}

export interface AnnotationRecord {
  id: string;
  doc_id: string;
  node_id: string;
  selected_text: string;
  color: string;
  note: string;
  occurrence_index?: number;
  created_at: string;
}

export class VisualMDDatabase {
  private db: DatabaseSync;
  public dbPath: string;

  constructor(customPath?: string) {
    if (customPath) {
      this.dbPath = customPath;
    } else {
      const homeDir = os.homedir();
      const visualMdDir = path.join(homeDir, '.visualmd');
      if (!fs.existsSync(visualMdDir)) {
        fs.mkdirSync(visualMdDir, { recursive: true });
      }
      this.dbPath = path.join(visualMdDir, 'visualmd.db');
    }

    this.db = new DatabaseSync(this.dbPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        folder_id TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        parsed_json TEXT NOT NULL,
        file_path TEXT,
        last_read_position REAL DEFAULT 0,
        last_read_node TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        doc_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        label TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS annotations (
        id TEXT PRIMARY KEY,
        doc_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        selected_text TEXT NOT NULL,
        color TEXT DEFAULT 'yellow',
        note TEXT NOT NULL,
        occurrence_index INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS docs_fts USING fts5(
        id UNINDEXED,
        title,
        content
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    try {
      this.db.exec('ALTER TABLE documents ADD COLUMN file_path TEXT;');
    } catch {
      // Column already exists
    }

    try {
      this.db.exec('ALTER TABLE annotations ADD COLUMN occurrence_index INTEGER DEFAULT 0;');
    } catch {
      // Column already exists
    }
  }

  // Folders
  public getFolders(): FolderRecord[] {
    const stmt = this.db.prepare('SELECT * FROM folders ORDER BY name COLLATE NOCASE ASC');
    return stmt.all() as unknown as FolderRecord[];
  }

  public createFolder(name: string, parentId: string | null = null): FolderRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO folders (id, name, parent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, parentId, now, now);
    return { id, name, parent_id: parentId, created_at: now, updated_at: now };
  }

  public deleteFolder(id: string): { deletedDocFilePaths: string[] } {
    const subfolders = this.db.prepare('SELECT id FROM folders WHERE parent_id = ?').all(id) as Array<{ id: string }>;
    const deletedDocFilePaths: string[] = [];

    for (const sub of subfolders) {
      const subResult = this.deleteFolder(sub.id);
      deletedDocFilePaths.push(...subResult.deletedDocFilePaths);
    }

    const docsInFolder = this.db.prepare('SELECT id, file_path FROM documents WHERE folder_id = ?').all(id) as Array<{ id: string; file_path: string | null }>;
    for (const doc of docsInFolder) {
      const { filePath } = this.deleteDocument(doc.id);
      if (filePath) {
        deletedDocFilePaths.push(filePath);
      }
    }

    const stmt = this.db.prepare('DELETE FROM folders WHERE id = ?');
    stmt.run(id);

    return { deletedDocFilePaths };
  }

  // Documents
  public getDocuments(folderId?: string): Omit<DocumentRecord, 'content' | 'parsed_json'>[] {
    let query = `
      SELECT id, folder_id, title, file_path, last_read_position, last_read_node, created_at, updated_at
      FROM documents
    `;
    const params: string[] = [];

    if (folderId !== undefined) {
      if (folderId === 'root') {
        query += ' WHERE folder_id IS NULL';
      } else {
        query += ' WHERE folder_id = ?';
        params.push(folderId);
      }
    }

    query += ' ORDER BY created_at DESC';
    const stmt = this.db.prepare(query);
    return stmt.all(...params) as unknown as Omit<DocumentRecord, 'content' | 'parsed_json'>[];
  }

  public getDocumentById(id: string): (DocumentRecord & { bookmarks: BookmarkRecord[]; annotations: AnnotationRecord[] }) | null {
    const stmt = this.db.prepare('SELECT * FROM documents WHERE id = ?');
    const doc = stmt.get(id) as unknown as DocumentRecord | undefined;
    if (!doc) return null;

    const bStmt = this.db.prepare('SELECT * FROM bookmarks WHERE doc_id = ? ORDER BY created_at ASC');
    const bookmarks = bStmt.all(id) as unknown as BookmarkRecord[];

    const aStmt = this.db.prepare('SELECT * FROM annotations WHERE doc_id = ? ORDER BY created_at ASC');
    const annotations = aStmt.all(id) as unknown as AnnotationRecord[];

    return {
      ...doc,
      bookmarks,
      annotations,
    };
  }

  public getDocumentByFilePath(filePath: string): DocumentRecord | null {
    const stmt = this.db.prepare('SELECT * FROM documents WHERE file_path = ?');
    const doc = stmt.get(filePath) as unknown as DocumentRecord | undefined;
    return doc || null;
  }

  public createDocument(
    title: string,
    content: string,
    folderId: string | null = null,
    filePath: string | null = null
  ): DocumentRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const parsed = parseVisualMD(content);
    const finalTitle = title || parsed.title || 'Untitled';
    const parsedJson = JSON.stringify(parsed);

    const stmt = this.db.prepare(`
      INSERT INTO documents (id, folder_id, title, content, parsed_json, file_path, last_read_position, last_read_node, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
    `);
    stmt.run(id, folderId, finalTitle, content, parsedJson, filePath, now, now);

    // Update FTS
    const ftsStmt = this.db.prepare(`INSERT INTO docs_fts (id, title, content) VALUES (?, ?, ?)`);
    ftsStmt.run(id, finalTitle, content);

    return {
      id,
      folder_id: folderId,
      title: finalTitle,
      content,
      parsed_json: parsedJson,
      file_path: filePath,
      last_read_position: 0,
      last_read_node: null,
      created_at: now,
      updated_at: now,
    };
  }

  public updateDocument(
    id: string,
    updates: {
      title?: string;
      content?: string;
      folder_id?: string | null;
      file_path?: string | null;
      last_read_position?: number;
      last_read_node?: string | null;
    }
  ): DocumentRecord | null {
    const existing = this.getDocumentById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    let content = existing.content;
    let parsedJson = existing.parsed_json;
    let title = existing.title;

    if (updates.content !== undefined) {
      content = updates.content;
      const parsed = parseVisualMD(content);
      parsedJson = JSON.stringify(parsed);
      title = updates.title || parsed.title || existing.title;
    } else if (updates.title !== undefined) {
      title = updates.title;
    }

    const folderId = updates.folder_id !== undefined ? updates.folder_id : existing.folder_id;
    const filePath = updates.file_path !== undefined ? updates.file_path : existing.file_path;
    const lastReadPos = updates.last_read_position !== undefined ? updates.last_read_position : existing.last_read_position;
    const lastReadNode = updates.last_read_node !== undefined ? updates.last_read_node : existing.last_read_node;

    const stmt = this.db.prepare(`
      UPDATE documents
      SET title = ?, content = ?, parsed_json = ?, folder_id = ?, file_path = ?, last_read_position = ?, last_read_node = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(title, content, parsedJson, folderId, filePath, lastReadPos, lastReadNode, now, id);

    // Update FTS
    if (updates.content !== undefined || updates.title !== undefined) {
      this.db.prepare('DELETE FROM docs_fts WHERE id = ?').run(id);
      this.db.prepare('INSERT INTO docs_fts (id, title, content) VALUES (?, ?, ?)').run(id, title, content);
    }

    return {
      id,
      folder_id: folderId,
      title,
      content,
      parsed_json: parsedJson,
      file_path: filePath,
      last_read_position: lastReadPos,
      last_read_node: lastReadNode,
      created_at: existing.created_at,
      updated_at: now,
    };
  }

  public deleteDocument(id: string): { filePath: string | null } {
    const existing = this.getDocumentById(id);
    const filePath = existing?.file_path || null;
    this.db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    this.db.prepare('DELETE FROM docs_fts WHERE id = ?').run(id);
    return { filePath };
  }

  // Bookmarks
  public toggleBookmark(docId: string, nodeId: string, label: string | null = null): { added: boolean } {
    const findStmt = this.db.prepare('SELECT id FROM bookmarks WHERE doc_id = ? AND node_id = ?');
    const existing = findStmt.get(docId, nodeId) as { id: string } | undefined;

    if (existing) {
      this.db.prepare('DELETE FROM bookmarks WHERE id = ?').run(existing.id);
      return { added: false };
    } else {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      this.db.prepare('INSERT INTO bookmarks (id, doc_id, node_id, label, created_at) VALUES (?, ?, ?, ?, ?)').run(
        id,
        docId,
        nodeId,
        label,
        now
      );
      return { added: true };
    }
  }

  // Annotations
  public addAnnotation(
    docId: string,
    nodeId: string,
    selectedText: string,
    note: string,
    color: string = 'yellow',
    occurrenceIndex: number = 0
  ): AnnotationRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO annotations (id, doc_id, node_id, selected_text, color, note, occurrence_index, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, docId, nodeId, selectedText, color, note, occurrenceIndex, now);

    return {
      id,
      doc_id: docId,
      node_id: nodeId,
      selected_text: selectedText,
      color,
      note,
      occurrence_index: occurrenceIndex,
      created_at: now,
    };
  }

  public deleteAnnotation(id: string) {
    this.db.prepare('DELETE FROM annotations WHERE id = ?').run(id);
  }

  // Full Text Search with prefix matching & safe fallback
  public search(query: string): Array<{ id: string; title: string; snippet: string }> {
    if (!query || !query.trim()) return [];
    const trimmed = query.trim();

    // 1. Try prefix FTS5 search (e.g. "kafk"* matches "Kafka")
    try {
      const tokens = trimmed
        .replace(/[^\w\s-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

      if (tokens.length > 0) {
        const ftsQuery = tokens
          .map((t, idx) => (idx === tokens.length - 1 ? `"${t}"*` : `"${t}"`))
          .join(' ');

        const stmt = this.db.prepare(`
          SELECT id, title, snippet(docs_fts, 2, '<b>', '</b>', '...', 25) as snippet
          FROM docs_fts
          WHERE docs_fts MATCH ?
          LIMIT 20
        `);
        const results = stmt.all(ftsQuery) as unknown as Array<{ id: string; title: string; snippet: string }>;
        if (results && results.length > 0) {
          return results;
        }
      }
    } catch {
      // Fall through to LIKE search below
    }

    // 2. Fallback to LIKE if FTS5 has no hits or syntax fails
    try {
      const fallbackStmt = this.db.prepare(`
        SELECT id, title, substr(content, 1, 120) as snippet
        FROM documents
        WHERE title LIKE ? OR content LIKE ?
        LIMIT 20
      `);
      const cleanLike = trimmed.replace(/[%_]/g, '\\$&');
      const likeQuery = `%${cleanLike}%`;
      return fallbackStmt.all(likeQuery, likeQuery) as unknown as Array<{ id: string; title: string; snippet: string }>;
    } catch {
      return [];
    }
  }

  // Sync data/ directory with database, mapping subdirectories to virtual folders
  public syncDataDirectory(dataDir: string): { added: number; updated: number } {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      return { added: 0, updated: 0 };
    }

    let added = 0;
    let updated = 0;
    const entries = fs.readdirSync(dataDir, { withFileTypes: true });

    const syncFile = (fullPath: string, fileName: string, folderId: string | null) => {
      try {
        const stats = fs.statSync(fullPath);
        if (!stats.isFile()) return;

        const content = fs.readFileSync(fullPath, 'utf-8');
        const existing = this.getDocumentByFilePath(fullPath);

        if (existing) {
          if (existing.content !== content || existing.folder_id !== folderId) {
            this.updateDocument(existing.id, { content, folder_id: folderId });
            updated++;
          }
        } else {
          const parsed = parseVisualMD(content);
          const fallbackTitle = fileName.replace(/\.(vmd|md)$/i, '');
          const title = parsed.title && parsed.title !== 'Untitled VisualMD Document' ? parsed.title : fallbackTitle;
          this.createDocument(title, content, folderId, fullPath);
          added++;
        }
      } catch (err) {
        console.error(`[VisualMD] Failed to sync ${fileName}:`, err);
      }
    };

    // 1. Root level files (outside any folder)
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.vmd') || entry.name.endsWith('.md'))) {
        syncFile(path.resolve(dataDir, entry.name), entry.name, null);
      } else if (entry.isDirectory()) {
        const dirName = entry.name;
        if (dirName.startsWith('.')) continue; // ignore hidden folders like .git

        // If user previously deleted the examples folder, do NOT re-sync or re-surface it
        if (dirName.toLowerCase() === 'examples' && this.getSetting('examples_deleted') === 'true') {
          continue;
        }

        let folder = this.getFolders().find((f) => f.name.toLowerCase() === dirName.toLowerCase());
        if (!folder) {
          const displayName = dirName.toLowerCase() === 'examples' ? 'Examples' : dirName;
          folder = this.createFolder(displayName);
        }

        const subDir = path.resolve(dataDir, dirName);
        try {
          const subEntries = fs.readdirSync(subDir, { withFileTypes: true });
          for (const subEntry of subEntries) {
            if (subEntry.isFile() && (subEntry.name.endsWith('.vmd') || subEntry.name.endsWith('.md'))) {
              syncFile(path.resolve(subDir, subEntry.name), subEntry.name, folder.id);
            }
          }
        } catch (err) {
          console.error(`[VisualMD] Failed to sync subdirectory ${dirName}:`, err);
        }
      }
    }

    // 2. Prune stale documents in DB whose physical files inside dataDir were deleted by user
    try {
      const resolvedDataDir = path.resolve(dataDir);
      const allDocs = this.db.prepare('SELECT id, file_path FROM documents WHERE file_path IS NOT NULL').all() as Array<{
        id: string;
        file_path: string;
      }>;
      for (const doc of allDocs) {
        const resolvedPath = path.resolve(doc.file_path);
        // Only prune if the file belongs inside this dataDir and does not exist on disk
        if (resolvedPath.startsWith(resolvedDataDir) && !fs.existsSync(resolvedPath)) {
          this.deleteDocument(doc.id);
        }
      }
    } catch (err) {
      console.error('[VisualMD] Failed to prune stale database documents:', err);
    }

    return { added, updated };
  }

  // Seed default examples into an "Examples" directory in the virtual file explorer
  public seedIfEmpty(examplesDir: string, dataDir?: string) {
    if (this.getSetting('examples_seeded') === 'true' || this.getSetting('examples_deleted') === 'true') {
      return;
    }

    if (!fs.existsSync(examplesDir)) return;

    const files = fs.readdirSync(examplesDir).filter((f) => f.endsWith('.vmd') || f.endsWith('.md'));
    if (files.length === 0) return;

    // 1. Get or create the "Examples" folder in virtual file explorer
    let examplesFolder = this.getFolders().find((f) => f.name.toLowerCase() === 'examples');
    if (!examplesFolder) {
      examplesFolder = this.createFolder('Examples');
    }

    // 2. Reference example files directly from examplesDir (which lives cleanly outside data/)
    for (const file of files) {
      const srcPath = path.resolve(examplesDir, file);
      const content = fs.readFileSync(srcPath, 'utf-8');
      const parsed = parseVisualMD(content);

      const existing = this.getDocumentByFilePath(srcPath);
      if (!existing) {
        const fallbackTitle = file.replace(/\.(vmd|md)$/i, '');
        const title = parsed.title && parsed.title !== 'Untitled VisualMD Document' ? parsed.title : fallbackTitle;
        this.createDocument(title, content, examplesFolder.id, srcPath);
      }
    }

    this.setSetting('examples_seeded', 'true');
  }

  // Settings persistence
  public getSetting(key: string): string | null {
    try {
      const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
      const row = stmt.get(key) as unknown as { value: string } | undefined;
      return row ? row.value : null;
    } catch {
      return null;
    }
  }

  public setSetting(key: string, value: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    stmt.run(key, value, now);
  }

  public close() {
    this.db.close();
  }
}
