import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import { exec, spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { VisualMDDatabase } from './db.js';
import { createServer } from './server.js';
import { parseVisualMD } from '../../compiler/dist/index.js';

export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port);
  });
}

export async function findAvailablePort(startPort: number, maxAttempts = 50): Promise<number> {
  let curr = startPort;
  for (let i = 0; i < maxAttempts; i++) {
    const free = await isPortAvailable(curr);
    if (free) return curr;
    curr++;
  }
  return startPort;
}

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

export interface VisualMDConfig {
  dataDir?: string;
}

export function getConfigFilePath(): string {
  const visualMdDir = path.join(os.homedir(), '.visualmd');
  if (!fs.existsSync(visualMdDir)) {
    fs.mkdirSync(visualMdDir, { recursive: true });
  }
  return path.join(visualMdDir, 'config.json');
}

export function loadUserConfig(): VisualMDConfig {
  try {
    const configPath = getConfigFilePath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch {}
  return {};
}

export function saveUserConfig(config: VisualMDConfig): void {
  try {
    const configPath = getConfigFilePath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[VisualMD] Notice: Could not save configuration:', err);
  }
}

export function checkDirectoryPermissions(dirPath: string): { ok: boolean; error?: string } {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.accessSync(dirPath, fs.constants.R_OK | fs.constants.W_OK);
    const probeFile = path.join(dirPath, `.vmd_probe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    fs.writeFileSync(probeFile, 'vmd', 'utf-8');
    fs.unlinkSync(probeFile);
    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.code ? `${err.code}: ${err.message}` : String(err),
    };
  }
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
      if (process.platform === 'win32') {
        try {
          execSync(`taskkill /F /T /PID ${record.pid}`, { stdio: 'ignore' });
        } catch {
          try {
            process.kill(record.pid, 'SIGKILL');
          } catch {}
        }
      } else {
        process.kill(record.pid, 'SIGTERM');
        setTimeout(() => {
          try {
            process.kill(record.pid, 'SIGKILL');
          } catch {}
        }, 500);
      }
      stoppedCount++;
    } catch {
      // Process already dead
    }
  }

  // 2. Extra safety across platforms:
  if (process.platform === 'win32') {
    // Windows: free default ports 5665 and 9669 if anything is hanging on them
    for (const testPort of [5665, 9669]) {
      await new Promise<void>((resolve) => {
        exec(`netstat -ano | findstr :${testPort}`, (_err, stdout) => {
          if (stdout) {
            const lines = stdout.trim().split(/\r?\n/);
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              const p = parseInt(parts[parts.length - 1], 10);
              if (p && p !== currentPid && p !== process.ppid) {
                try {
                  execSync(`taskkill /F /T /PID ${p}`, { stdio: 'ignore' });
                  stoppedCount++;
                } catch {
                  try {
                    process.kill(p, 'SIGKILL');
                    stoppedCount++;
                  } catch {}
                }
              }
            }
          }
          resolve();
        });
      });
    }
  } else {
    // macOS / Linux: find any node processes running visualmd
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

    // Also free default ports 5665 and 9669 if anything is hanging on them (macOS: lsof, Linux: lsof or fuser)
    await new Promise<void>((resolve) => {
      exec(`lsof -ti :5665,:9669 2>/dev/null || fuser 5665/tcp 9669/tcp 2>/dev/null`, (_err, stdout) => {
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
  try {
    if (!/^https?:\/\/[a-zA-Z0-9.:_-]+/i.test(url)) return;
    let child: any = null;
    if (process.platform === 'darwin') {
      child = spawn('open', [url], { detached: true, stdio: 'ignore' });
    } else if (process.platform === 'win32') {
      child = spawn('cmd.exe', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' });
    } else {
      // Linux / Unix / WSL
      const isWSL = Boolean(
        process.env.WSL_DISTRO_NAME ||
        (os.release && os.release().toLowerCase().includes('microsoft'))
      );
      if (isWSL) {
        child = spawn('cmd.exe', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' });
      } else {
        child = spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
      }
    }
    if (child) {
      child.on('error', () => {
        // Silently ignore browser spawn errors on headless environments (Docker/CI/SSH)
      });
      child.unref();
    }
  } catch {}
}

export async function runCLI() {
  // Security: If invoked via sudo or with elevated root privileges on macOS/Linux,
  // drop privileges to the actual non-root user (SUDO_UID/SUDO_GID) to prevent security risks
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    if (process.env.SUDO_UID && typeof process.setuid === 'function' && typeof process.setgid === 'function') {
      try {
        const sudoGid = parseInt(process.env.SUDO_GID || '', 10);
        const sudoUid = parseInt(process.env.SUDO_UID || '', 10);
        if (!isNaN(sudoGid)) process.setgid(sudoGid);
        if (!isNaN(sudoUid)) process.setuid(sudoUid);
      } catch {
        console.warn('[VisualMD Security Warning] Running as root/sudo is not recommended.');
      }
    } else {
      console.warn('[VisualMD Security Warning] Running as root/sudo is not recommended.');
    }
  }

  const args = process.argv.slice(2);
  let port = 5665;
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
      console.log('visualmd v1.0.242');
      process.exit(0);
    } else if (arg === '--port' || arg === '-p') {
      port = parseInt(args[++i], 10) || 5665;
    } else if (arg === '--no-open') {
      shouldOpen = false;
    } else if (arg === '--background' || arg === '-b') {
      runInBackground = true;
    } else if (arg === '--db') {
      customDb = args[++i];
    } else if (arg === '--data-dir') {
      const next = args[++i];
      customDataDir = next ? next.replace(/^['"]|['"]$/g, '').trim() : undefined;
    } else if (arg.startsWith('--data-dir=')) {
      const val = arg.substring(arg.indexOf('=') + 1).replace(/^['"]|['"]$/g, '').trim();
      customDataDir = val || undefined;
    } else if (
      arg === '--reset-dir' ||
      arg === '--reset-path' ||
      arg === '--reset-data-dir' ||
      arg === '--reset' ||
      arg === 'reset-dir' ||
      arg === 'reset-path' ||
      arg === '--clear-dir' ||
      arg === '--clear-path'
    ) {
      const cfg = loadUserConfig();
      delete cfg.dataDir;
      saveUserConfig(cfg);
      console.log(`\n✔ Reset custom data directory path. Default is ~/.visualmd/data\n`);
      // If reset was the only argument or primary intent, exit cleanly
      const otherMeaningfulArgs = args.filter((a) => !a.startsWith('--reset') && !a.startsWith('--clear') && a !== 'reset-dir' && a !== 'reset-path');
      if (otherMeaningfulArgs.length === 0) {
        process.exit(0);
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
VisualMD - Interactive Visual Markdown for AI-Era Knowledge Workers

Usage:
  visualmd [file.vmd | file.md] [options]
  visualmd --close

Options:
  --data-dir <path>        Custom directory path for storing documents (saved as default)
  --reset-dir, --reset-path Reset saved custom document directory path to default
  -p, --port <number>      Port to listen on (default: 5665)
  -b, --background         Run VisualMD engine in the background
  --close, --stop          Kill and close all running VisualMD server processes
  --status                 Check if VisualMD server is currently running
  --no-open                Do not automatically open the browser
  --db <path>              Custom SQLite database file path
  -v, --version            Display installed VisualMD version
  -h, --help               Show this help message

Environment Variables:
  VISUALMD_DATA_DIR        Custom directory path for document storage
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
  const homeDataDir = path.join(os.homedir(), '.visualmd', 'data');
  const isInstalledInNodeModules = __dirname.includes('node_modules');

  const userConfig = loadUserConfig();

  // Setup data directory with proactive permission check and persistence
  let dataDir: string;
  if (customDataDir) {
    const resolvedTarget = path.resolve(process.cwd(), customDataDir);
    const perm = checkDirectoryPermissions(resolvedTarget);
    if (!perm.ok) {
      console.warn(`\n[VisualMD] ⚠️ Permission Error: Cannot write to custom directory '${resolvedTarget}':\n  ${perm.error}`);
      console.warn(`[VisualMD] Falling back to safe user home directory: ${homeDataDir}\n`);
      dataDir = homeDataDir;
    } else {
      dataDir = resolvedTarget;
      // Persist user's choice so next time they run visualmd it uses this directory automatically!
      saveUserConfig({ ...userConfig, dataDir: resolvedTarget });
    }
  } else if (process.env.VISUALMD_DATA_DIR) {
    const envDir = path.resolve(process.cwd(), process.env.VISUALMD_DATA_DIR);
    const perm = checkDirectoryPermissions(envDir);
    if (perm.ok) {
      dataDir = envDir;
    } else {
      console.warn(`[VisualMD] ⚠️ Permission Error on VISUALMD_DATA_DIR '${envDir}': ${perm.error}. Falling back.`);
      dataDir = homeDataDir;
    }
  } else if (userConfig.dataDir) {
    // User previously gave a custom dir -> use it!
    const savedDir = path.resolve(userConfig.dataDir);
    const perm = checkDirectoryPermissions(savedDir);
    if (perm.ok) {
      dataDir = savedDir;
    } else {
      console.warn(`[VisualMD] ⚠️ Warning: Saved data directory '${savedDir}' is no longer accessible (${perm.error}). Falling back.`);
      dataDir = homeDataDir;
    }
  } else if (fs.existsSync(localDataDir) && !isInstalledInNodeModules) {
    dataDir = localDataDir;
  } else if (!isInstalledInNodeModules && fs.existsSync(repoDataDir)) {
    dataDir = repoDataDir;
  } else {
    dataDir = homeDataDir;
  }

  // Final permission check to ensure the directory is 100% writable
  const finalPerm = checkDirectoryPermissions(dataDir);
  if (!finalPerm.ok) {
    console.warn(`[VisualMD] Notice: Target directory '${dataDir}' not writable (${finalPerm.error}). Falling back to ${homeDataDir}`);
    dataDir = homeDataDir;
    checkDirectoryPermissions(dataDir);
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
    } else {
      console.warn(`[VisualMD] Warning: File not found: ${fileToOpen}`);
    }
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

  // If default port is occupied, automatically resolve to an available empty port
  const verifiedPort = await findAvailablePort(port);
  if (verifiedPort !== port) {
    port = verifiedPort;
  }
  savePid(process.pid, port);

  const isBackendOnly = port === 9669;
  const app = createServer(db, webDir, dataDir, isBackendOnly);

  const broadcastSync = (data: any) => {
    if ((app as any).broadcastEvent) {
      (app as any).broadcastEvent('sync', data);
    }
  };

  // Watch data/ directory for changes (reactive disk synchronization)
  try {
    let debounceTimer: NodeJS.Timeout | null = null;
    const watchOpts = process.platform === 'linux' ? {} : { recursive: true };
    const watcher = fs.watch(dataDir, watchOpts, () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const result = db.syncDataDirectory(dataDir);
        broadcastSync(result);
      }, 250);
    });
    watcher.on('error', () => {
      // Suppress platform watch errors
    });
  } catch (err) {
    // Non-fatal if fs.watch is unsupported on platform
  }

  // Periodic safeguard sync interval (catches directory deletions or environments where fs.watch drops events)
  const safeguardInterval = setInterval(() => {
    try {
      const result = db.syncDataDirectory(dataDir);
      if (result.added > 0 || result.updated > 0 || (result as any).deleted > 0) {
        broadcastSync(result);
      }
    } catch {}
  }, 3000);
  safeguardInterval.unref();

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
