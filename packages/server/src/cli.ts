import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { exec, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { VisualMDDatabase } from './db.js';
import { createServer } from './server.js';
import { parseVisualMD } from '../../compiler/dist/index.js';

interface PidRecord {
  pid: number;
  port: number;
  startTime: number;
}

function getPidFilePath(): string {
  const visualMdDir = path.join(os.homedir(), '.visualmd');
  if (!fs.existsSync(visualMdDir)) {
    fs.mkdirSync(visualMdDir, { recursive: true });
  }
  return path.join(visualMdDir, 'pids.json');
}

function getActivePids(): PidRecord[] {
  const pPath = getPidFilePath();
  if (!fs.existsSync(pPath)) return [];
  try {
    const raw = fs.readFileSync(pPath, 'utf-8');
    const records: PidRecord[] = JSON.parse(raw);
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function savePid(pid: number, port: number) {
  const pPath = getPidFilePath();
  const current = getActivePids().filter((r) => {
    try {
      process.kill(r.pid, 0);
      return true;
    } catch {
      return false;
    }
  });
  current.push({ pid, port, startTime: Date.now() });
  try {
    fs.writeFileSync(pPath, JSON.stringify(current, null, 2), 'utf-8');
  } catch {}
}

function removePid(pid: number) {
  const pPath = getPidFilePath();
  const current = getActivePids().filter((r) => r.pid !== pid);
  try {
    fs.writeFileSync(pPath, JSON.stringify(current, null, 2), 'utf-8');
  } catch {}
}

async function stopAllProcesses(): Promise<number> {
  const pids = getActivePids();
  let stoppedCount = 0;
  const currentPid = process.pid;

  // 1. Kill recorded PIDs
  for (const record of pids) {
    if (record.pid === currentPid) continue;
    try {
      process.kill(record.pid, 0); // check exists
      process.kill(record.pid, 'SIGTERM');
      stoppedCount++;
      // Give it a tiny moment to exit
      setTimeout(() => {
        try {
          process.kill(record.pid, 'SIGKILL');
        } catch {}
      }, 500);
    } catch {
      // Process already dead
    }
  }

  // 2. Extra safety on Linux/Unix: find any node processes running visualmd or on port 9669
  if (process.platform !== 'win32') {
    await new Promise<void>((resolve) => {
      exec(`pgrep -f "visualmd"`, (_err, stdout) => {
        if (stdout) {
          const lines = stdout.trim().split(/\s+/);
          for (const line of lines) {
            const p = parseInt(line, 10);
            if (p && p !== currentPid && p !== process.ppid) {
              try {
                process.kill(p, 'SIGTERM');
                stoppedCount++;
              } catch {}
            }
          }
        }
        resolve();
      });
    });

    // Also free default port 9669 if anything is hanging on it
    await new Promise<void>((resolve) => {
      exec(`lsof -ti :9669 2>/dev/null`, (_err, stdout) => {
        if (stdout) {
          const portPids = stdout.trim().split(/\s+/);
          for (const line of portPids) {
            const p = parseInt(line, 10);
            if (p && p !== currentPid) {
              try {
                process.kill(p, 'SIGTERM');
                stoppedCount++;
              } catch {}
            }
          }
        }
        resolve();
      });
    });
  }

  // Clear PID file
  const pPath = getPidFilePath();
  try {
    fs.writeFileSync(pPath, '[]', 'utf-8');
  } catch {}

  return stoppedCount;
}

function openBrowser(url: string) {
  const start =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
      ? 'start'
      : 'xdg-open';
  exec(`${start} ${url}`, () => {
    // Suppress errors if no display available
  });
}

export async function runCLI() {
  const args = process.argv.slice(2);
  let port = 9669;
  let shouldOpen = true;
  let runInBackground = false;
  let fileToOpen: string | null = null;
  let customDb: string | undefined = undefined;
  let customDataDir: string | undefined = undefined;

  // Check for commands or flags
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--close' || arg === '--stop' || arg === 'close' || arg === 'stop') {
      console.log('\n[VisualMD] Shutting down all active VisualMD background processes...');
      const count = await stopAllProcesses();
      console.log(`✔ Successfully stopped all running VisualMD processes (${count} process(es) terminated).\n`);
      process.exit(0);
    } else if (arg === '--status' || arg === 'status') {
      const active = getActivePids().filter((r) => {
        try {
          process.kill(r.pid, 0);
          return true;
        } catch {
          return false;
        }
      });
      if (active.length > 0) {
        console.log(`\n[VisualMD] Server is currently RUNNING (${active.length} active process(es)):`);
        for (const r of active) {
          console.log(`  • PID ${r.pid} on port ${r.port} (http://localhost:${r.port})`);
        }
        console.log("Run 'visualmd --close' to stop.\n");
      } else {
        console.log('\n[VisualMD] No active VisualMD processes running.\n');
      }
      process.exit(0);
    } else if (arg === '--version' || arg === '-v' || arg === 'version') {
      console.log('visualmd v1.0.2');
      process.exit(0);
    } else if (arg === '--port' || arg === '-p') {
      port = parseInt(args[++i], 10) || 9669;
    } else if (arg === '--no-open') {
      shouldOpen = false;
    } else if (arg === '--background' || arg === '-b') {
      runInBackground = true;
    } else if (arg === '--db') {
      customDb = args[++i];
    } else if (arg === '--data-dir' || arg === '-d') {
      customDataDir = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
VisualMD - Interactive Visual Markdown for AI-Era Knowledge Workers

Usage:
  visualmd [file.vmd | file.md] [options]
  visualmd --close

Options:
  -p, --port <number>      Port to listen on (default: 9669)
  -b, --background         Run VisualMD engine in the background
  --close, --stop          Kill and close all running VisualMD server processes
  --status                 Check if VisualMD server is currently running
  -d, --data-dir <path>    Custom directory for storing user readmes (default: ./data)
  --no-open                Do not automatically open the browser
  --db <path>              Custom SQLite database file path
  -v, --version            Display installed VisualMD version
  -h, --help               Show this help message
      `);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      fileToOpen = arg;
    }
  }

  // If user requested background mode, fork detached child process
  if (runInBackground) {
    const cleanArgs = args.filter((a) => a !== '--background' && a !== '-b');
    const child = spawn(process.argv[0], [process.argv[1], ...cleanArgs], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    console.log(`
┌────────────────────────────────────────────────────────┐
│  🚀 VisualMD started in BACKGROUND (PID ${String(child.pid).padEnd(14)}) │
│                                                        │
│  Workspace URL:  http://localhost:${String(port).padEnd(20)} │
│  Type 'visualmd --close' at any time to shut it down.  │
└────────────────────────────────────────────────────────┘
    `);
    process.exit(0);
  }

  // Register current PID
  savePid(process.pid, port);

  // Clean up on exit
  const cleanup = () => {
    removePid(process.pid);
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  const db = new VisualMDDatabase(customDb);

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoDataDir = path.resolve(__dirname, '../../../data');
  const localDataDir = path.resolve(process.cwd(), 'data');

  // Setup data directory
  let dataDir: string;
  if (customDataDir) {
    dataDir = path.resolve(process.cwd(), customDataDir);
  } else if (fs.existsSync(localDataDir)) {
    dataDir = localDataDir;
  } else if (fs.existsSync(repoDataDir)) {
    dataDir = repoDataDir;
  } else {
    dataDir = localDataDir;
  }

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Look for examples directory to seed
  const possibleExamplesDirs = [
    path.resolve(process.cwd(), 'examples'),
    path.resolve(__dirname, '../../../examples'),
    path.resolve(__dirname, '../../examples'),
  ];

  for (const exDir of possibleExamplesDirs) {
    if (fs.existsSync(exDir)) {
      db.seedIfEmpty(exDir, dataDir);
      break;
    }
  }

  // Sync data directory with database
  db.syncDataDirectory(dataDir);

  let targetDocId: string | null = null;

  // If a file was passed as CLI argument, copy it to data/ (leaving original safe!)
  if (fileToOpen) {
    const resolvedPath = path.resolve(process.cwd(), fileToOpen);
    if (fs.existsSync(resolvedPath)) {
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      const filename = path.basename(resolvedPath);
      const targetPath = path.join(dataDir, filename);

      // Only copy if not already in dataDir
      if (path.resolve(resolvedPath) !== path.resolve(targetPath)) {
        fs.writeFileSync(targetPath, content, 'utf-8');
        console.log(`[VisualMD] Preserved original and copied '${filename}' to data/`);
      }

      const parsed = parseVisualMD(content);
      const docTitle =
        parsed.title && parsed.title !== 'Untitled VisualMD Document'
          ? parsed.title
          : filename.replace(/\.(vmd|md)$/i, '');

      const existing = db.getDocumentByFilePath(targetPath);
      if (existing) {
        if (existing.content !== content) {
          db.updateDocument(existing.id, { content, title: docTitle });
        }
        targetDocId = existing.id;
      } else {
        const doc = db.createDocument(docTitle, content, null, targetPath);
        targetDocId = doc.id;
      }
      console.log(`[VisualMD] Opened document: ${docTitle} (${targetDocId})`);
    } else {
      console.warn(`[VisualMD] Warning: File not found: ${fileToOpen}`);
    }
  }

  // Watch data/ directory for changes
  try {
    let debounceTimer: NodeJS.Timeout | null = null;
    fs.watch(dataDir, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.vmd') || filename.endsWith('.md'))) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          db.syncDataDirectory(dataDir);
        }, 300);
      }
    });
  } catch (err) {
    // Non-fatal if fs.watch is unsupported on platform
  }

  // Look for built web assets
  const possibleWebDirs = [
    path.resolve(__dirname, '../../web/dist'),
    path.resolve(__dirname, '../../../web/dist'),
    path.resolve(process.cwd(), 'packages/web/dist'),
  ];
  let webDir: string | undefined;
  for (const dir of possibleWebDirs) {
    if (fs.existsSync(dir)) {
      webDir = dir;
      break;
    }
  }

  const app = createServer(db, webDir, dataDir);

  const server = app.listen(port, () => {
    const baseUrl = `http://localhost:${port}`;
    const openUrl = targetDocId ? `${baseUrl}/view/${targetDocId}` : baseUrl;
    console.log(`
┌────────────────────────────────────────────────────────┐
│  🚀 VisualMD Engine Running!                           │
│                                                        │
│  Workspace URL:  ${openUrl.padEnd(36)} │
│  Data Directory: ${dataDir.padEnd(36)} │
│  Database Path:  ${db.dbPath.padEnd(36)} │
│  Close Anytime:  visualmd --close                      │
│  Press Ctrl+C to stop                                  │
└────────────────────────────────────────────────────────┘
    `);

    if (shouldOpen) {
      openBrowser(openUrl);
    }
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[VisualMD] Port ${port} is in use, trying ${port + 1}...`);
      port++;
      savePid(process.pid, port);
      server.listen(port);
    } else {
      console.error('[VisualMD] Server error:', err);
    }
  });
}

// Auto-run if executed directly
if (process.argv[1] && path.basename(process.argv[1]).startsWith('cli')) {
  runCLI().catch((err) => {
    console.error('[VisualMD] Fatal error:', err);
    process.exit(1);
  });
}
