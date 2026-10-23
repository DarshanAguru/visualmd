import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { VisualMDDatabase, isPathInsideDir } from '../dist/db.js';
import { createServer } from '../dist/server.js';
import { checkDirectoryPermissions, loadUserConfig, saveUserConfig } from '../dist/cli.js';
import { executeSandboxedCode } from '../dist/sandbox.js';
import { autoCommitDataChange } from '../dist/git.js';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('Server & Database - CRUD, Bookmarks, and FTS5 Search', () => {
  const tmpDb = path.join(os.tmpdir(), `vmd-test-${Date.now()}.db`);
  const db = new VisualMDDatabase(tmpDb);

  try {
    // 1. Folders
    const folder = db.createFolder('Distributed Systems');
    assert.equal(folder.name, 'Distributed Systems');
    const folders = db.getFolders();
    assert.equal(folders.length, 1);

    // 2. Documents
    const sampleVmd = `# Kafka Deep Dive
$METRICS$S
Throughput: 1.5M msg/s | P99: 2ms
$METRICS$E

$CALLOUT$S?type=insight&title=Partitioning
Kafka partitions provide horizontal parallelism.
$CALLOUT$E`;

    const doc = db.createDocument('Kafka Deep Dive', sampleVmd, folder.id);
    assert.equal(doc.title, 'Kafka Deep Dive');
    assert.equal(doc.folder_id, folder.id);

    const retrieved = db.getDocumentById(doc.id);
    assert.ok(retrieved);
    assert.equal(retrieved.title, 'Kafka Deep Dive');
    const parsed = JSON.parse(retrieved.parsed_json);
    assert.equal(parsed.nodes.length, 3);

    // 3. Bookmarks
    const b1 = db.toggleBookmark(doc.id, 'node-1', 'Metric Bookmark');
    assert.equal(b1.added, true);
    const docWithBookmark = db.getDocumentById(doc.id);
    assert.equal(docWithBookmark.bookmarks.length, 1);

    // Toggle off
    const b2 = db.toggleBookmark(doc.id, 'node-1');
    assert.equal(b2.added, false);
    const docWithoutBookmark = db.getDocumentById(doc.id);
    assert.equal(docWithoutBookmark.bookmarks.length, 0);

    // 4. Annotations with exact occurrence scoping
    const anno = db.addAnnotation(doc.id, 'node-2', 'horizontal parallelism', 'Key scalability concept', 'emerald', 1);
    assert.equal(anno.color, 'emerald');
    assert.equal(anno.selected_text, 'horizontal parallelism');
    assert.equal(anno.occurrence_index, 1);

    const docWithAnno = db.getDocumentById(doc.id);
    assert.equal(docWithAnno.annotations.length, 1);
    assert.equal(docWithAnno.annotations[0].note, 'Key scalability concept');
    assert.equal(docWithAnno.annotations[0].occurrence_index, 1);

    // 5. FTS5 Search
    const searchResults = db.search('parallelism');
    assert.ok(searchResults.length > 0);
    assert.equal(searchResults[0].id, doc.id);

  } finally {
    db.close();
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
});

test('Server - REST API integration', async () => {
  const tmpDb = path.join(os.tmpdir(), `vmd-api-test-${Date.now()}.db`);
  const db = new VisualMDDatabase(tmpDb);
  const app = createServer(db);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Health check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const health = await healthRes.json();
    assert.equal(health.status, 'ok');

    // Create Doc via API
    const createRes = await fetch(`${baseUrl}/api/docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'API Document',
        content: '# Test Document\nRegular markdown paragraph.'
      })
    });
    assert.equal(createRes.status, 201);
    const createdDoc = await createRes.json();
    assert.equal(createdDoc.title, 'API Document');

    // List Docs
    const listRes = await fetch(`${baseUrl}/api/docs`);
    const docList = await listRes.json();
    assert.equal(docList.length, 1);

    // Search via API
    const searchRes = await fetch(`${baseUrl}/api/search?q=Regular`);
    const searchMatches = await searchRes.json();
    assert.equal(searchMatches.length, 1);

    // Annotations via API with exact occurrence index
    const annoRes = await fetch(`${baseUrl}/api/docs/${createdDoc.id}/annotation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: 'node-0',
        selected_text: 'markdown',
        note: 'Scoped occurrence note',
        color: 'sky',
        occurrence_index: 2,
      }),
    });
    assert.equal(annoRes.status, 201);
    const annoData = await annoRes.json();
    assert.equal(annoData.selected_text, 'markdown');
    assert.equal(annoData.occurrence_index, 2);
    assert.equal(annoData.color, 'sky');

  } finally {
    server.close();
    db.close();
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
});

test('Server - data/ directory sync, file creation, and safe deletion', async () => {
  const tmpDb = path.join(os.tmpdir(), `vmd-data-test-${Date.now()}.db`);
  const tmpDataDir = path.join(os.tmpdir(), `vmd-data-dir-${Date.now()}`);
  const externalDir = path.join(os.tmpdir(), `vmd-ext-dir-${Date.now()}`);

  fs.mkdirSync(tmpDataDir, { recursive: true });
  fs.mkdirSync(externalDir, { recursive: true });

  const db = new VisualMDDatabase(tmpDb);
  const app = createServer(db, undefined, tmpDataDir);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Create document via API -> should create a physical file in tmpDataDir
    const createRes = await fetch(`${baseUrl}/api/docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Redis Caching Strategy',
        content: '# Redis Caching\nDetails about LRU and TTL.'
      })
    });
    assert.equal(createRes.status, 201);
    const doc = await createRes.json();
    assert.ok(doc.file_path);
    assert.ok(fs.existsSync(doc.file_path));
    assert.equal(path.dirname(doc.file_path), tmpDataDir);

    // 2. User manually drops a file into data/ directory -> syncDataDirectory picks it up!
    const manualFilePath = path.join(tmpDataDir, 'manual-notes.vmd');
    fs.writeFileSync(manualFilePath, '# Manual Notes\nWritten by developer.', 'utf-8');

    const syncRes = await fetch(`${baseUrl}/api/sync`, { method: 'POST' });
    const syncData = await syncRes.json();
    assert.equal(syncData.success, true);
    assert.equal(syncData.added, 1);

    const manualDoc = db.getDocumentByFilePath(manualFilePath);
    assert.ok(manualDoc);
    assert.equal(manualDoc.title, 'Manual Notes');

    // 3. User imports a file referencing an external directory -> external file must NOT be deleted on removal
    const externalFilePath = path.join(externalDir, 'secret-external-spec.md');
    fs.writeFileSync(externalFilePath, '# Secret Spec\nDo not delete this.', 'utf-8');

    // Manually register an external doc pointing outside dataDir
    const extDoc = db.createDocument('Secret Spec', '# Secret Spec', null, externalFilePath);
    assert.ok(fs.existsSync(externalFilePath));

    // Delete external doc from VisualMD
    const delExtRes = await fetch(`${baseUrl}/api/docs/${extDoc.id}`, { method: 'DELETE' });
    assert.equal(delExtRes.status, 200);

    // The external file must STILL exist and remain safe!
    assert.ok(fs.existsSync(externalFilePath), 'External file outside dataDir must remain safe!');

    // 4. Delete the doc that is in data/ -> should delete the physical file in data/
    const delDataRes = await fetch(`${baseUrl}/api/docs/${doc.id}`, { method: 'DELETE' });
    assert.equal(delDataRes.status, 200);
    assert.equal(fs.existsSync(doc.file_path), false, 'File inside dataDir should be cleaned up on deletion');

  } finally {
    server.close();
    db.close();
    fs.rmSync(tmpDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    fs.rmSync(externalDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
});

test('Server - Prompts API & Folders API Verification', async () => {
  const tmpDb = path.join(os.tmpdir(), `vmd-prompts-test-${Date.now()}.db`);
  const db = new VisualMDDatabase(tmpDb);
  const app = createServer(db);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Prompts API: system-prompt
    const sysPromptRes = await fetch(`${baseUrl}/api/prompts/system-prompt`);
    assert.equal(sysPromptRes.status, 200);
    const sysPromptText = await sysPromptRes.text();
    assert.match(sysPromptText, /VisualMD Standard/);

    // 2. Prompts API: skill
    const skillRes = await fetch(`${baseUrl}/api/prompts/skill`);
    assert.equal(skillRes.status, 200);
    const skillText = await skillRes.text();
    assert.match(skillText, /visualmd-standard/);

    // 3. Prompts API: standard
    const stdRes = await fetch(`${baseUrl}/api/prompts/standard`);
    assert.equal(stdRes.status, 200);
    const stdText = await stdRes.text();
    assert.match(stdText, /The VisualMD Specification/);

    // 4. Prompts API: invalid type returns 404
    const invalidRes = await fetch(`${baseUrl}/api/prompts/non-existent-prompt`);
    assert.equal(invalidRes.status, 404);

    // 5. Folders API: create and delete
    const folderRes = await fetch(`${baseUrl}/api/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'System Architecture' })
    });
    assert.equal(folderRes.status, 201);
    const folder = await folderRes.json();
    assert.equal(folder.name, 'System Architecture');

    // 5b. Folders API: rename folder
    const renameRes = await fetch(`${baseUrl}/api/folders/${folder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Distributed Systems' }),
    });
    assert.equal(renameRes.status, 200);
    const renamedFolder = await renameRes.json();
    assert.equal(renamedFolder.name, 'Distributed Systems');

    // 5c. Folders API: creating duplicate folder returns existing
    const dupRes = await fetch(`${baseUrl}/api/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'distributed systems' }),
    });
    assert.equal(dupRes.status, 201);
    const dupFolder = await dupRes.json();
    assert.equal(dupFolder.id, folder.id);

    const listFoldersRes = await fetch(`${baseUrl}/api/folders`);
    const folders = await listFoldersRes.json();
    assert.equal(folders.length, 1);
    assert.equal(folders[0].name, 'Distributed Systems');

    const deleteFolderRes = await fetch(`${baseUrl}/api/folders/${folder.id}`, { method: 'DELETE' });
    assert.equal(deleteFolderRes.status, 200);

    const emptyFoldersRes = await fetch(`${baseUrl}/api/folders`);
    const emptyFolders = await emptyFoldersRes.json();
    assert.equal(emptyFolders.length, 0);

  } finally {
    server.close();
    db.close();
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
});

test('Server - Settings API and theme persistence', async () => {
  const tmpDb = path.join(os.tmpdir(), `vmd-settings-test-${Date.now()}.db`);
  const db = new VisualMDDatabase(tmpDb);
  const app = createServer(db);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Initially theme setting is null
    const getInitialRes = await fetch(`${baseUrl}/api/settings/theme`);
    assert.equal(getInitialRes.status, 200);
    const initialData = await getInitialRes.json();
    assert.equal(initialData.value, null);

    // 2. Set theme to 'notebook'
    const setRes = await fetch(`${baseUrl}/api/settings/theme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'notebook' }),
    });
    assert.equal(setRes.status, 200);
    const setData = await setRes.json();
    assert.equal(setData.value, 'notebook');

    // 3. Verify persisted in DB
    const getSavedRes = await fetch(`${baseUrl}/api/settings/theme`);
    const savedData = await getSavedRes.json();
    assert.equal(savedData.value, 'notebook');
    assert.equal(db.getSetting('theme'), 'notebook');

    // 4. Test Pomodoro settings persistence
    const pomoSettings = {
      focusDuration: 50,
      shortBreakDuration: 10,
      longBreakDuration: 25,
      soundEnabled: true,
      autoStartBreaks: false,
    };
    const setPomoRes = await fetch(`${baseUrl}/api/settings/pomodoro_settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(pomoSettings) }),
    });
    assert.equal(setPomoRes.status, 200);

    // 5. Test Content Width and Font Scale persistence
    await fetch(`${baseUrl}/api/settings/content_width`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'wide' }),
    });
    await fetch(`${baseUrl}/api/settings/font_scale_index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '4' }),
    });

    // 6. Test Bulk GET /api/settings
    const bulkGetRes = await fetch(`${baseUrl}/api/settings`);
    assert.equal(bulkGetRes.status, 200);
    const bulkData = await bulkGetRes.json();
    assert.equal(bulkData.theme, 'notebook');
    assert.equal(bulkData.content_width, 'wide');
    assert.equal(bulkData.font_scale_index, '4');
    const returnedPomo = JSON.parse(bulkData.pomodoro_settings);
    assert.equal(returnedPomo.focusDuration, 50);
    assert.equal(returnedPomo.shortBreakDuration, 10);

    // 7. Test Bulk POST /api/settings
    const bulkSetRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'dracula',
        content_width: 'standard',
      }),
    });
    assert.equal(bulkSetRes.status, 200);
    const postBulkData = await bulkSetRes.json();
    assert.equal(postBulkData.settings.theme, 'dracula');
    assert.equal(postBulkData.settings.content_width, 'standard');

  } finally {
    server.close();
    db.close();
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
});

test('Server - Import API verification for batch and single file imports', async () => {
  const tmpDb = path.join(os.tmpdir(), `vmd-import-test-${Date.now()}.db`);
  const tmpDataDir = path.join(os.tmpdir(), `vmd-import-dir-${Date.now()}`);
  fs.mkdirSync(tmpDataDir, { recursive: true });

  const db = new VisualMDDatabase(tmpDb);
  const folder = db.createFolder('Engineering Specs');
  const app = createServer(db, undefined, tmpDataDir);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Batch import into a specific folder
    const batchRes = await fetch(`${baseUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder_id: folder.id,
        files: [
          { name: 'architecture.vmd', content: '# Architecture\nDetails here.' },
          { name: 'deployment.md', content: '# Deployment\nKubernetes configs.' },
        ],
      }),
    });
    assert.equal(batchRes.status, 201);
    const batchData = await batchRes.json();
    assert.equal(batchData.success, true);
    assert.equal(batchData.count, 2);
    assert.equal(batchData.documents.length, 2);
    assert.equal(batchData.documents[0].folder_id, folder.id);
    assert.equal(batchData.documents[1].folder_id, folder.id);
    assert.ok(
      fs.existsSync(path.join(tmpDataDir, folder.name, 'architecture.vmd')) ||
      fs.existsSync(path.join(tmpDataDir, 'architecture.vmd')),
      'Imported file should exist in folder directory on disk'
    );
    assert.ok(
      fs.existsSync(path.join(tmpDataDir, folder.name, 'deployment.md')) ||
      fs.existsSync(path.join(tmpDataDir, 'deployment.md')),
      'Imported file should exist in folder directory on disk'
    );

    // 2. Batch import into root (folder_id: null)
    const rootBatchRes = await fetch(`${baseUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder_id: null,
        files: [
          { name: 'root-overview.md', content: '# Root Overview\nProject overview.' },
        ],
      }),
    });
    assert.equal(rootBatchRes.status, 201);
    const rootBatchData = await rootBatchRes.json();
    assert.equal(rootBatchData.documents[0].folder_id, null);

    // 3. Single file import with { filename, content, folder_id }
    const singleRes = await fetch(`${baseUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'service-mesh.vmd',
        content: '# Service Mesh\nIstio and Envoy.',
        folder_id: folder.id,
      }),
    });
    assert.equal(singleRes.status, 201);
    const singleData = await singleRes.json();
    assert.equal(singleData.count, 1);
    assert.equal(singleData.documents[0].title, 'Service Mesh');
    assert.equal(singleData.documents[0].folder_id, folder.id);
    assert.ok(
      fs.existsSync(path.join(tmpDataDir, folder.name, 'service-mesh.vmd')) ||
      fs.existsSync(path.join(tmpDataDir, 'service-mesh.vmd')),
      'Imported file should exist in folder directory on disk'
    );

  } finally {
    server.close();
    db.close();
    fs.rmSync(tmpDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
});

test('Server - Examples folder seeding and folder cascade deletion', async () => {
  const tmpDb = path.join(os.tmpdir(), `vmd-examples-test-${Date.now()}.db`);
  const tmpDataDir = path.join(os.tmpdir(), `vmd-examples-data-${Date.now()}`);
  const tmpExamplesDir = path.join(os.tmpdir(), `vmd-examples-src-${Date.now()}`);

  fs.mkdirSync(tmpDataDir, { recursive: true });
  fs.mkdirSync(tmpExamplesDir, { recursive: true });

  // Create mock example files
  fs.writeFileSync(path.join(tmpExamplesDir, 'ex-redis.vmd'), '# Kafka vs Redis\nArchitecture breakdown.', 'utf-8');
  fs.writeFileSync(path.join(tmpExamplesDir, 'ex-dijkstra.vmd'), '# Dijkstra Algorithm\nGraph traversal.', 'utf-8');

  const db = new VisualMDDatabase(tmpDb);
  const app = createServer(db, undefined, tmpDataDir);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Seed examples
    db.seedIfEmpty(tmpExamplesDir, tmpDataDir);

    // Verify "Examples" folder was created
    const foldersRes = await fetch(`${baseUrl}/api/folders`);
    const folders = await foldersRes.json();
    const examplesFolder = folders.find((f) => f.name.toLowerCase() === 'examples');
    assert.ok(examplesFolder, 'Examples folder should exist in virtual file explorer');

    // Verify documents inside Examples folder
    const docsRes = await fetch(`${baseUrl}/api/docs?folder_id=${examplesFolder.id}`);
    const docs = await docsRes.json();
    assert.equal(docs.length, 2);
    assert.ok(docs.every((d) => d.folder_id === examplesFolder.id));

    // Verify example documents are unified into tmpDataDir/Examples
    const unifiedExamplesDir = path.join(tmpDataDir, 'Examples');
    assert.ok(fs.existsSync(path.join(unifiedExamplesDir, 'ex-redis.vmd')));
    assert.ok(fs.existsSync(path.join(unifiedExamplesDir, 'ex-dijkstra.vmd')));
    assert.ok(docs.every((d) => d.file_path.startsWith(unifiedExamplesDir)));

    // 2. User deletes the "Examples" folder -> folder and documents in DB are deleted, while files in examplesDir remain safe
    const delRes = await fetch(`${baseUrl}/api/folders/${examplesFolder.id}`, { method: 'DELETE' });
    assert.equal(delRes.status, 200);

    // Verify folder is gone from virtual explorer
    const checkFoldersRes = await fetch(`${baseUrl}/api/folders`);
    const checkFolders = await checkFoldersRes.json();
    assert.equal(checkFolders.length, 0);

    // Verify docs inside that folder are gone from virtual explorer
    const allDocsRes = await fetch(`${baseUrl}/api/docs`);
    const allDocs = await allDocsRes.json();
    assert.equal(allDocs.length, 0, 'All documents inside deleted folder should be removed');

    // Physical example files outside dataDir remain intact
    assert.ok(fs.existsSync(path.join(tmpExamplesDir, 'ex-redis.vmd')));
    assert.ok(fs.existsSync(path.join(tmpExamplesDir, 'ex-dijkstra.vmd')));

    // 3. User restarts or triggers data sync or seedIfEmpty again -> Examples must NEVER reappear!
    db.seedIfEmpty(tmpExamplesDir, tmpDataDir);
    const syncRes = await fetch(`${baseUrl}/api/sync`, { method: 'POST' });
    assert.equal(syncRes.status, 200);

    const postSyncFolders = await (await fetch(`${baseUrl}/api/folders`)).json();
    assert.equal(postSyncFolders.length, 0, 'Examples folder must never reappear after user deleted it');

    const postSyncDocs = await (await fetch(`${baseUrl}/api/docs`)).json();
    assert.equal(postSyncDocs.length, 0, 'Example documents must never reappear after user deleted it');

  } finally {
    server.close();
    db.close();
    fs.rmSync(tmpDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    fs.rmSync(tmpExamplesDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
});

test('Server - Starter tutorial bookmarks and annotations are seeded on initial run', async () => {
  const tmpDb = path.join(os.tmpdir(), `vmd-starter-test-${Date.now()}.db`);
  const tmpDataDir = path.join(os.tmpdir(), `vmd-starter-data-${Date.now()}`);
  const tmpExamplesDir = path.join(os.tmpdir(), `vmd-starter-src-${Date.now()}`);

  fs.mkdirSync(tmpDataDir, { recursive: true });
  fs.mkdirSync(tmpExamplesDir, { recursive: true });

  const realWelcomePath = path.resolve(process.cwd(), 'examples/01-welcome-and-tutorial.vmd');
  if (fs.existsSync(realWelcomePath)) {
    fs.copyFileSync(realWelcomePath, path.join(tmpExamplesDir, '01-welcome-and-tutorial.vmd'));
  } else {
    fs.writeFileSync(
      path.join(tmpExamplesDir, '01-welcome-and-tutorial.vmd'),
      '# Welcome to VisualMD: Interactive Notes & Study Guide\n\n$CALLOUT$S?type=insight&title=Welcome\nreactive, visual learning documents and visual, structured, and engaging\n$CALLOUT$E\n\n## 1. Static Notes vs Reactive\nContent.\n\n$STEPPER$S?title=Loop\nstrengthens neural pathways\n$STEPPER$E',
      'utf-8'
    );
  }

  const db = new VisualMDDatabase(tmpDb);
  const app = createServer(db, undefined, tmpDataDir);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    db.seedIfEmpty(tmpExamplesDir, tmpDataDir);

    const docsRes = await fetch(`${baseUrl}/api/docs`);
    const docs = await docsRes.json();
    const welcomeDoc = docs.find((d) => d.title.toLowerCase().includes('welcome to visualmd'));
    assert.ok(welcomeDoc, 'Welcome doc should be seeded');

    // Fetch full document with annotations and bookmarks
    const fullDocRes = await fetch(`${baseUrl}/api/docs/${welcomeDoc.id}`);
    const fullDoc = await fullDocRes.json();

    assert.ok(fullDoc.bookmarks && fullDoc.bookmarks.length >= 2, 'Should have seeded at least 2 bookmarks');
    assert.ok(fullDoc.annotations && fullDoc.annotations.length >= 2, 'Should have seeded at least 2 annotations');
    assert.ok(fullDoc.annotations.some((a) => a.note && a.note.includes('Welcome to VisualMD')), 'Should have welcome note');

  } finally {
    server.close();
    db.close();
    fs.rmSync(tmpDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    fs.rmSync(tmpExamplesDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
});

test('Server (v1.0.246) - Health Version & Prefix FTS5 Search', async () => {
  const tmpDb = path.join(os.tmpdir(), `vmd-test-v10244-${Date.now()}.db`);
  const db = new VisualMDDatabase(tmpDb);
  const app = createServer(db);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Check health returns version 1.0.244
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.version, '1.0.246');

    // 2. Test prefix search in database
    db.createDocument('Distributed Consensus With Raft', 'Leader election and log replication algorithms in Raft.');
    db.createDocument('Kafka Streaming Guide', 'Kafka message partitioning and zero copy performance.');

    // Partial term "lead" matches "Leader"
    const searchPrefix = db.search('lead');
    assert.ok(searchPrefix.length >= 1);
    assert.match(searchPrefix[0].title, /Raft/);

    // Partial term "stream" matches "streaming"
    const searchStream = db.search('stream');
    assert.ok(searchStream.length >= 1);
    assert.match(searchStream[0].title, /Kafka/);

    // Multiple terms with prefix
    const searchMulti = db.search('Kafka mess');
    assert.ok(searchMulti.length >= 1);
    assert.match(searchMulti[0].title, /Kafka/);

    // 3. Test component-level note & table_cell annotation
    const testDoc = db.createDocument('Test Annotations', '# Notes Test');
    const annoRes = await fetch(`${baseUrl}/api/docs/${testDoc.id}/annotation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: 'node-stepper-1',
        selected_text: '', // Component-level comment!
        note: 'Executive architecture comment',
        color: 'purple',
        table_cell: '0:1:2',
      }),
    });
    assert.equal(annoRes.status, 201);
    const annoData = await annoRes.json();
    assert.equal(annoData.note, 'Executive architecture comment');
    assert.equal(annoData.table_cell, '0:1:2');
    assert.equal(annoData.color, 'purple');

    const fetchedDoc = db.getDocumentById(testDoc.id);
    assert.equal(fetchedDoc.annotations.length, 1);
    assert.equal(fetchedDoc.annotations[0].table_cell, '0:1:2');

    // 4. Test non-existent API endpoint returns 404 JSON
    const notFoundRes = await fetch(`${baseUrl}/api/does-not-exist`);
    assert.equal(notFoundRes.status, 404);
    const notFoundJson = await notFoundRes.json();
    assert.equal(notFoundJson.error, 'API route not found');

  } finally {
    server.close();
    db.close();
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
});

test('Server - Document Version Control System (VCS), Checkpoints & Rollback', async () => {
  const tmpDb = path.join(os.tmpdir(), `vmd-vcs-test-${Date.now()}.db`);
  const tmpDataDir = path.join(os.tmpdir(), `vmd-vcs-dir-${Date.now()}`);
  fs.mkdirSync(tmpDataDir, { recursive: true });

  const db = new VisualMDDatabase(tmpDb);
  const app = createServer(db, undefined, tmpDataDir);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Create document -> creates Initial Version
    const createRes = await fetch(`${baseUrl}/api/docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Kafka Architecture',
        content: '# Kafka Architecture v1\nInitial content.',
      }),
    });
    assert.equal(createRes.status, 201);
    const doc = await createRes.json();
    assert.ok(doc.id);

    // Verify initial version exists
    const v1Res = await fetch(`${baseUrl}/api/docs/${doc.id}/versions`);
    assert.equal(v1Res.status, 200);
    const v1List = await v1Res.json();
    assert.equal(v1List.length, 1);
    assert.equal(v1List[0].version_number, 1);
    assert.equal(v1List[0].summary, 'Initial Version');

    // 2. Update document content -> auto-saves snapshot before update
    const updateRes = await fetch(`${baseUrl}/api/docs/${doc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '# Kafka Architecture v2\nOptimized with sendfile zero-copy.',
      }),
    });
    assert.equal(updateRes.status, 200);

    const v2Res = await fetch(`${baseUrl}/api/docs/${doc.id}/versions`);
    const v2List = await v2Res.json();
    assert.equal(v2List.length, 2);
    assert.equal(v2List[0].version_number, 2);

    // 3. User manually creates named checkpoint (e.g. before LLM refactor)
    const cpRes = await fetch(`${baseUrl}/api/docs/${doc.id}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: 'Checkpoint: Before Claude v2 Refactor',
      }),
    });
    assert.equal(cpRes.status, 201);
    const cpData = await cpRes.json();
    assert.equal(cpData.summary, 'Checkpoint: Before Claude v2 Refactor');
    assert.equal(cpData.version_number, 3);

    // 4. Update document again (simulating LLM replacement)
    await fetch(`${baseUrl}/api/docs/${doc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '# Kafka Architecture v3\nClaude enhanced with Stepper.',
      }),
    });

    const v4List = await (await fetch(`${baseUrl}/api/docs/${doc.id}/versions`)).json();
    assert.equal(v4List.length, 4);

    // 5. Restore version 1 (rollback!)
    const initialVer = v4List.find((v) => v.version_number === 1);
    assert.ok(initialVer);

    const restoreRes = await fetch(`${baseUrl}/api/docs/${doc.id}/versions/${initialVer.id}/restore`, {
      method: 'POST',
    });
    assert.equal(restoreRes.status, 200);
    const restoreData = await restoreRes.json();
    assert.equal(restoreData.success, true);
    assert.match(restoreData.document.content, /Initial content/);

    // Verify physical file was updated to restored content
    const diskContent = fs.readFileSync(doc.file_path, 'utf-8');
    assert.match(diskContent, /Initial content/);

    // 5b. Upload new version from LLM without making it active (for comparison draft)
    const uploadPendingRes = await fetch(`${baseUrl}/api/docs/${doc.id}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: 'LLM Revision from Claude (comparison draft)',
        content: '# Kafka Architecture - Claude Draft\nFull comparison content.',
        set_as_latest: false,
      }),
    });
    assert.equal(uploadPendingRes.status, 201);
    const uploadPendingData = await uploadPendingRes.json();
    assert.equal(uploadPendingData.isLatest, false);
    assert.match(uploadPendingData.content, /Claude Draft/);

    // Active document is still the restored version
    const activeDocCheck = await (await fetch(`${baseUrl}/api/docs/${doc.id}`)).json();
    assert.match(activeDocCheck.content, /Initial content/);

    // 5c. Upload new version from LLM and activate immediately as latest
    const uploadLatestRes = await fetch(`${baseUrl}/api/docs/${doc.id}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: 'LLM Revision from Claude (promoted to latest)',
        title: 'Kafka Architecture 2026',
        content: '# Kafka Architecture 2026\nProduction ready LLM revision.',
        set_as_latest: true,
      }),
    });
    assert.equal(uploadLatestRes.status, 201);
    const uploadLatestData = await uploadLatestRes.json();
    assert.equal(uploadLatestData.isLatest, true);
    assert.match(uploadLatestData.document.content, /Production ready LLM revision/);

    // Verify physical file was updated
    const updatedDisk = fs.readFileSync(doc.file_path, 'utf-8');
    assert.match(updatedDisk, /Production ready LLM revision/);

    // 6. Delete document -> cascades and removes all versions
    await fetch(`${baseUrl}/api/docs/${doc.id}`, { method: 'DELETE' });
    const postDelVersions = db.getVersions(doc.id);
    assert.equal(postDelVersions.length, 0);

  } finally {
    server.close();
    db.close();
    fs.rmSync(tmpDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
});

test('Server - Permission Pre-Check, Persistent Custom Path, and Reactive Disk Deletion Sync', async () => {
  const tmpDb = path.join(os.tmpdir(), `vmd-perm-test-${Date.now()}.db`);
  const tmpDataDir = path.join(os.tmpdir(), `vmd-perm-data-${Date.now()}`);
  fs.mkdirSync(tmpDataDir, { recursive: true });

  const db = new VisualMDDatabase(tmpDb);
  const app = createServer(db, undefined, tmpDataDir);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Proactive Permission Pre-Check verification
    const permResult = checkDirectoryPermissions(tmpDataDir);
    assert.equal(permResult.ok, true, 'Directory permission pre-check should pass for writable directory');

    // 2. User Configuration Persistence (Set Once & Forget)
    const originalConfig = loadUserConfig();
    try {
      saveUserConfig({ dataDir: tmpDataDir });
      const reloaded = loadUserConfig();
      assert.equal(reloaded.dataDir, tmpDataDir, 'Custom path should persist in config.json');
    } finally {
      saveUserConfig(originalConfig); // restore original
    }

    // 3. User creates a document directly on disk in user-defined path
    const file1 = path.join(tmpDataDir, 'system-architecture.md');
    fs.writeFileSync(file1, '# Microservices Architecture\nEvent-driven with Kafka.', 'utf-8');

    // Subdirectory folder test
    const subFolder = path.join(tmpDataDir, 'Guides');
    fs.mkdirSync(subFolder, { recursive: true });
    const file2 = path.join(subFolder, 'getting-started.vmd');
    fs.writeFileSync(file2, '# Getting Started Guide\nQuick start documentation.', 'utf-8');

    // Initial sync
    const syncRes1 = await fetch(`${baseUrl}/api/sync`, { method: 'POST' });
    assert.equal(syncRes1.status, 200);
    const syncData1 = await syncRes1.json();
    assert.equal(syncData1.added, 2);

    // Verify both documents exist via API
    const docsRes1 = await fetch(`${baseUrl}/api/docs`);
    const docs1 = await docsRes1.json();
    assert.equal(docs1.length, 2);

    // Verify folder was created for Guides
    const foldersRes = await fetch(`${baseUrl}/api/folders`);
    const folders = await foldersRes.json();
    assert.ok(folders.some((f) => f.name === 'Guides'));

    // 4. User physically deletes a file on disk (e.g. via terminal or VS Code)
    fs.unlinkSync(file1);

    // Trigger sync (simulating watcher / interval)
    const syncRes2 = await fetch(`${baseUrl}/api/sync`, { method: 'POST' });
    const syncData2 = await syncRes2.json();
    assert.equal(syncData2.deleted, 1, 'Sync should prune deleted file from database');

    // Verify deleted file is no longer returned via API
    const docsRes2 = await fetch(`${baseUrl}/api/docs`);
    const docs2 = await docsRes2.json();
    assert.equal(docs2.length, 1);
    assert.equal(docs2[0].title, 'Getting Started Guide');

    // 5. User physically deletes entire subdirectory on disk
    fs.rmSync(subFolder, { recursive: true, force: true });

    const syncRes3 = await fetch(`${baseUrl}/api/sync`, { method: 'POST' });
    const syncData3 = await syncRes3.json();
    assert.equal(syncData3.deleted, 1, 'Sync should prune files in deleted subdirectory');

    // Verify both docs and empty folder are pruned
    const docsRes3 = await fetch(`${baseUrl}/api/docs`);
    const docs3 = await docsRes3.json();
    assert.equal(docs3.length, 0);

    const postFoldersRes = await fetch(`${baseUrl}/api/folders`);
    const postFolders = await postFoldersRes.json();
    assert.ok(!postFolders.some((f) => f.name === 'Guides'), 'Empty folder for deleted directory should be pruned');

    // 6. Test Server-Sent Events (SSE) endpoint
    const eventsRes = await fetch(`${baseUrl}/api/events`);
    assert.equal(eventsRes.status, 200);
    assert.equal(eventsRes.headers.get('content-type'), 'text/event-stream');

  } finally {
    server.close();
    db.close();
    fs.rmSync(tmpDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
});

test('Server - Companion Assets, Image Resource Serving, and Non-Markdown Tolerance', async () => {
  const tmpDb = path.join(os.tmpdir(), `vmd-asset-test-${Date.now()}.db`);
  const tmpDataDir = path.join(os.tmpdir(), `vmd-asset-data-${Date.now()}`);
  fs.mkdirSync(tmpDataDir, { recursive: true });

  const db = new VisualMDDatabase(tmpDb);
  const app = createServer(db, undefined, tmpDataDir);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Store compatible markdown document
    fs.writeFileSync(
      path.join(tmpDataDir, 'overview.md'),
      '# Project Overview\n![Architecture Diagram](./assets/arch.png)\n[External Link](https://visualmd.dev)',
      'utf-8'
    );

    // 2. User stores other files in workspace (images, datasets, non-markdown resources)
    const imagesDir = path.join(tmpDataDir, 'assets');
    fs.mkdirSync(imagesDir, { recursive: true });
    fs.writeFileSync(path.join(imagesDir, 'arch.png'), 'fake-png-binary-data', 'utf-8');
    fs.writeFileSync(path.join(tmpDataDir, 'dataset.csv'), 'id,name,value\n1,alpha,42', 'utf-8');
    fs.writeFileSync(path.join(tmpDataDir, 'diagram.svg'), '<svg><circle r="10"/></svg>', 'utf-8');

    // 3. Trigger sync - only the compatible markdown document should become a document in SQLite
    const syncRes = await fetch(`${baseUrl}/api/sync`, { method: 'POST' });
    assert.equal(syncRes.status, 200);

    const docsRes = await fetch(`${baseUrl}/api/docs`);
    const docs = await docsRes.json();
    assert.equal(docs.length, 1, 'Only compatible markdown files should be indexed as documents');
    assert.equal(docs[0].title, 'Project Overview');

    // 4. Asset discovery API: GET /api/assets should return companion files (arch.png, dataset.csv, diagram.svg)
    const assetsRes = await fetch(`${baseUrl}/api/assets`);
    assert.equal(assetsRes.status, 200);
    const assets = await assetsRes.json();
    assert.equal(assets.length, 3, 'Should discover all 3 non-markdown assets');
    const assetNames = assets.map((a) => a.name);
    assert.ok(assetNames.includes('arch.png'));
    assert.ok(assetNames.includes('dataset.csv'));
    assert.ok(assetNames.includes('diagram.svg'));

    const archAsset = assets.find((a) => a.name === 'arch.png');
    assert.equal(archAsset.isImage, true);
    const csvAsset = assets.find((a) => a.name === 'dataset.csv');
    assert.equal(csvAsset.isImage, false);

    // 5. Direct Asset Serving: GET /api/assets/assets/arch.png
    const archRes = await fetch(`${baseUrl}/api/assets/assets/arch.png`);
    assert.equal(archRes.status, 200);
    const archText = await archRes.text();
    assert.equal(archText, 'fake-png-binary-data');

    // 6. Intelligent Subfolder Fallback: GET /api/assets/arch.png (even when requested without folder prefix)
    const fallbackRes = await fetch(`${baseUrl}/api/assets/arch.png`);
    assert.equal(fallbackRes.status, 200);
    const fallbackText = await fallbackRes.text();
    assert.equal(fallbackText, 'fake-png-binary-data');

    // 7. Security: Directory traversal is rejected
    const traversalRes = await fetch(`${baseUrl}/api/assets/../../etc/passwd`);
    assert.ok(traversalRes.status === 403 || traversalRes.status === 404);

  } finally {
    server.close();
    db.close();
    fs.rmSync(tmpDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
});

test('Security - Hardened Sandbox Container, Git Shell Injection Immunity & RCE Prevention', async () => {
  // 1. Sandbox Unit Execution: benign arithmetic and console.log
  const benign = executeSandboxedCode('console.log("hello world"); const sum = [1,2,3].reduce((a,b)=>a+b, 0); sum;');
  assert.equal(benign.success, true);
  assert.equal(benign.result, 6);
  assert.deepEqual(benign.output, ['hello world']);

  // 2. Sandbox Security: Process, require, and child_process are blocked
  const procCheck = executeSandboxedCode('typeof process;');
  assert.equal(procCheck.result, 'undefined');

  const reqCheck = executeSandboxedCode('typeof require;');
  assert.equal(reqCheck.result, 'undefined');

  // 3. Sandbox Security: Prototype constructor string-evaluation escape attack is thwarted
  const escapeAttempt = executeSandboxedCode('({}).constructor.constructor("return process")()');
  assert.equal(escapeAttempt.success, false);
  assert.match(escapeAttempt.error || '', /Code generation from strings disallowed/i);

  // 4. Sandbox Security: CPU infinite loop execution timeout
  const timeoutCheck = executeSandboxedCode('while(true) {}', { timeoutMs: 200 });
  assert.equal(timeoutCheck.success, false);
  assert.match(timeoutCheck.error || '', /timed out/i);

  // 5. Sandbox Security: Large output capping prevents memory exhaustion
  const largeOutput = executeSandboxedCode('for(let i=0; i<500; i++) console.log("line " + i);', { maxOutputLines: 50 });
  assert.equal(largeOutput.success, true);
  assert.equal(largeOutput.output.length, 50);

  // 6. Server API: POST /api/sandbox/run
  const tmpDb = path.join(os.tmpdir(), `vmd-sec-test-${Date.now()}.db`);
  const tmpDataDir = path.join(os.tmpdir(), `vmd-sec-data-${Date.now()}`);
  fs.mkdirSync(tmpDataDir, { recursive: true });

  const db = new VisualMDDatabase(tmpDb);
  const app = createServer(db, undefined, tmpDataDir);
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const apiRun = await fetch(`${baseUrl}/api/sandbox/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'console.log("secure run"); Math.max(10, 20);' }),
    });
    assert.equal(apiRun.status, 200);
    const apiData = await apiRun.json();
    assert.equal(apiData.success, true);
    assert.equal(apiData.result, 20);
    assert.deepEqual(apiData.output, ['secure run']);

    // Malicious script submitted to API runner
    const apiMalicious = await fetch(`${baseUrl}/api/sandbox/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'this.constructor.constructor("return 42")()' }),
    });
    assert.equal(apiMalicious.status, 200);
    const malData = await apiMalicious.json();
    assert.equal(malData.success, false);
    assert.match(malData.error || '', /disallowed/i);

    // 7. Git Command Injection Immunity in autoCommitDataChange
    // Initialize real git repository in tmpDataDir to test autoCommitDataChange
    try {
      execSync('git init', { cwd: tmpDataDir, stdio: 'ignore' });
      execSync('git config user.email "security-audit@visualmd.test"', { cwd: tmpDataDir, stdio: 'ignore' });
      execSync('git config user.name "Security Audit"', { cwd: tmpDataDir, stdio: 'ignore' });

      const canaryFile = path.join(tmpDataDir, 'canary.txt');
      const testDoc = path.join(tmpDataDir, 'security-test.vmd');
      fs.writeFileSync(testDoc, '# Security Test\nContent.', 'utf-8');

      // Attempt command substitution in commit message: e.g. $(touch canary.txt)
      const maliciousMsg = `$(touch "${canaryFile}") ; touch "${canaryFile}" ;`;
      await autoCommitDataChange(tmpDataDir, maliciousMsg, testDoc);

      // Verify canary was NEVER created by shell
      assert.equal(fs.existsSync(canaryFile), false, 'Shell command in commit message must never execute');

      // Verify the commit was recorded verbatim in git log
      const gitLog = execSync('git log -n 1 --pretty=%B', { cwd: tmpDataDir, encoding: 'utf-8' });
      assert.ok(gitLog.includes(maliciousMsg), 'Git commit message must contain literal text without shell evaluation');
    } catch (err) {
      // If git is not installed in the environment, skip the git integration part
      if (!err.message?.includes('git init')) {
        throw err;
      }
    }
  } finally {
    server.close();
    db.close();
    fs.rmSync(tmpDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
});

test('Cross-OS Compatibility - Path Traversal, Slash & Case Tolerance, and LF Binary Shebang', () => {
  // 1. isPathInsideDir boundary tests
  assert.equal(isPathInsideDir('/var/data/doc.vmd', '/var/data'), true);
  assert.equal(isPathInsideDir('/var/data/sub/doc.vmd', '/var/data'), true);
  assert.equal(isPathInsideDir('/var/data-leak/doc.vmd', '/var/data'), false);
  assert.equal(isPathInsideDir('/etc/passwd', '/var/data'), false);
  assert.equal(isPathInsideDir('/var/data/../data/doc.vmd', '/var/data'), true);
  assert.equal(isPathInsideDir('/var/data/../../etc/passwd', '/var/data'), false);

  // 2. Case-insensitivity on Windows/macOS path comparison
  if (process.platform === 'win32') {
    assert.equal(isPathInsideDir('c:\\data\\doc.vmd', 'C:\\data'), true);
    assert.equal(isPathInsideDir('C:\\data\\DOC.VMD', 'c:\\data'), true);
    assert.equal(isPathInsideDir('C:\\data-extra\\doc.vmd', 'c:\\data'), false);
    assert.equal(isPathInsideDir('D:\\data\\doc.vmd', 'C:\\data'), false);
  }

  // 3. Database document lookup with forward/backward slashes and case variations
  const tmpDb = path.join(os.tmpdir(), `vmd-cross-os-${Date.now()}.db`);
  const db = new VisualMDDatabase(tmpDb);

  try {
    const canonicalPath = path.resolve('/test/workspace/data/MyDocument.vmd');
    const doc = db.createDocument('My Document', '# Hello', null, canonicalPath);
    assert.ok(doc);

    // Exact match
    const foundExact = db.getDocumentByFilePath(canonicalPath);
    assert.ok(foundExact, 'Should find document with exact file path');

    // Alternative slash representation (e.g. forward slash vs backward slash)
    const forwardSlashPath = canonicalPath.replace(/\\/g, '/');
    const backSlashPath = canonicalPath.replace(/\//g, '\\');
    assert.ok(db.getDocumentByFilePath(forwardSlashPath), 'Should find document with forward slashes');
    assert.ok(db.getDocumentByFilePath(backSlashPath), 'Should find document with backslashes');

    // Case variation on Windows & macOS
    if (process.platform === 'win32' || process.platform === 'darwin') {
      const lowerPath = canonicalPath.toLowerCase();
      assert.ok(db.getDocumentByFilePath(lowerPath), 'Should find document with case variation');
    }
  } finally {
    db.close();
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }

  // 4. Executable CLI shebang and line ending validation
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const binPath = path.resolve(testDir, '../bin/visualmd.js');
  assert.ok(fs.existsSync(binPath), 'visualmd.js binary must exist');
  const binBuffer = fs.readFileSync(binPath);
  assert.equal(
    binBuffer.includes(0x0d),
    false,
    'visualmd.js must strictly use LF line endings without CRLF to run on Linux and macOS without syntax errors'
  );

  const binContent = binBuffer.toString('utf-8');
  assert.ok(
    binContent.startsWith('#!/usr/bin/env node\n'),
    'visualmd.js must start with a valid Unix env node shebang'
  );
});

test('Server (v1.0.246) - Folder lifecycle, auto-prune immunity, foreign key integrity & crash protection', async () => {
  const tmpDb = path.join(os.tmpdir(), `vmd-fk-test-${Date.now()}.db`);
  const tmpDataDir = path.join(os.tmpdir(), `vmd-fk-dir-${Date.now()}`);
  fs.mkdirSync(tmpDataDir, { recursive: true });

  const db = new VisualMDDatabase(tmpDb);
  const app = createServer(db, undefined, tmpDataDir);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Create a folder via API
    const folderRes = await fetch(`${baseUrl}/api/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Project Notes' }),
    });
    assert.equal(folderRes.status, 201);
    const folder = await folderRes.json();
    assert.ok(folder.id);

    // Verify physical directory was created immediately
    const folderDiskPath = path.join(tmpDataDir, 'Project Notes');
    assert.ok(fs.existsSync(folderDiskPath), 'Physical directory should be created immediately on POST /api/folders');

    // 2. Trigger syncDataDirectory immediately - folder must NOT be pruned
    const syncRes = await fetch(`${baseUrl}/api/sync`, { method: 'POST' });
    assert.equal(syncRes.status, 200);

    const checkFolderRes = await fetch(`${baseUrl}/api/folders`);
    const foldersAfterSync = await checkFolderRes.json();
    assert.ok(foldersAfterSync.some((f) => f.id === folder.id), 'Newly created empty folder must not be pruned by sync');

    // 3. Create document in that folder
    const docRes = await fetch(`${baseUrl}/api/docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Meeting Notes',
        content: '# Meeting\nDiscussing v1.0.246 release.',
        folder_id: folder.id,
      }),
    });
    assert.equal(docRes.status, 201);
    const doc = await docRes.json();
    assert.equal(doc.folder_id, folder.id);

    // 4. Update document (scroll position update & content update) - no FK errors
    const updateRes = await fetch(`${baseUrl}/api/docs/${doc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        last_read_position: 150,
        last_read_node: 'node-1',
      }),
    });
    assert.equal(updateRes.status, 200);

    // 5. Delete the folder via API
    const deleteFolderRes = await fetch(`${baseUrl}/api/folders/${folder.id}`, {
      method: 'DELETE',
    });
    assert.equal(deleteFolderRes.status, 200);

    // 6. Test foreign key resilience: document update with non-existent or deleted folder_id
    // Must gracefully sanitize to null instead of throwing SQLITE FOREIGN KEY error and crashing server!
    const testDoc = db.createDocument('Independent Note', '# Note content');
    const updateWithDeadFolder = await fetch(`${baseUrl}/api/docs/${testDoc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder_id: folder.id, // already deleted!
        content: '# Note updated after folder deletion',
      }),
    });
    assert.equal(updateWithDeadFolder.status, 200, 'Server should not crash on deleted folder_id');
    const updatedData = await updateWithDeadFolder.json();
    assert.equal(updatedData.folder_id, null, 'Deleted folder_id should safely sanitize to null');

    // 7. Test import with deleted folder_id or invalid empty string
    const importRes = await fetch(`${baseUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder_id: folder.id, // deleted folder
        files: [{ name: 'upload.md', content: '# Uploaded file' }],
      }),
    });
    assert.equal(importRes.status, 201, 'Import should not crash with deleted folder_id');
    const importData = await importRes.json();
    assert.equal(importData.count, 1);
    assert.equal(importData.documents[0].folder_id, null);

    // 8. Test health endpoint is still responsive (verifies server never crashed)
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
  } finally {
    server.close();
    db.close();
    fs.rmSync(tmpDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    const walFile = `${tmpDb}-wal`;
    const shmFile = `${tmpDb}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
});





