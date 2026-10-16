#!/usr/bin/env node

/**
 * VisualMD Live Development & Debugging Orchestrator
 *
 * Runs backend server (default port 9669) + Vite Dev Server (default port 5665 with live HMR).
 * Checks whether both ports are empty, automatically allocating the next available open port if occupied.
 * Any code or style changes in packages/web/src are reflected in real time!
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const webDir = path.resolve(rootDir, 'packages/web');

const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function isPortAvailable(port) {
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

async function findAvailablePort(startPort, maxAttempts = 50) {
  let curr = startPort;
  for (let i = 0; i < maxAttempts; i++) {
    const free = await isPortAvailable(curr);
    if (free) return curr;
    curr++;
  }
  return startPort;
}

function getActiveDataDir(userArgs) {
  for (let i = 0; i < userArgs.length; i++) {
    const a = userArgs[i];
    if ((a === '--data-dir' || a === '-d' || a === '--path' || a === '--dir') && userArgs[i + 1]) {
      return path.resolve(userArgs[i + 1]);
    }
    if (a.startsWith('--data-dir=') || a.startsWith('--path=') || a.startsWith('--dir=')) {
      return path.resolve(a.substring(a.indexOf('=') + 1));
    }
  }

  try {
    const configPath = path.join(os.homedir(), '.visualmd', 'config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (parsed.dataDir) {
        return path.resolve(parsed.dataDir);
      }
    }
  } catch {}

  return path.join(os.homedir(), '.visualmd', 'data');
}

async function main() {
  console.log(`${CYAN}${BOLD}`);
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       VisualMD - Live Development & Debugging Environment        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`${RESET}`);

  // Resolve empty ports for server (default 9669) and frontend (default 5665)
  const defaultServerPort = 9669;
  const defaultFrontendPort = 5665;

  const serverPort = await findAvailablePort(defaultServerPort);
  let frontendPort = await findAvailablePort(defaultFrontendPort);
  if (frontendPort === serverPort) {
    frontendPort = await findAvailablePort(frontendPort + 1);
  }

  if (serverPort !== defaultServerPort) {
    console.log(`${YELLOW}ℹ Server default port ${defaultServerPort} is occupied; using next free port ${serverPort}.${RESET}`);
  }
  if (frontendPort !== defaultFrontendPort) {
    console.log(`${YELLOW}ℹ Frontend default port ${defaultFrontendPort} is occupied; using next free port ${frontendPort}.${RESET}`);
  }

  const userArgs = process.argv.slice(2);

  // Check for reset-dir / reset-path commands
  const isResetArg = userArgs.some((a) =>
    a === '--reset-dir' ||
    a === '--reset-path' ||
    a === '--reset-data-dir' ||
    a === '--reset' ||
    a === 'reset-dir' ||
    a === 'reset-path' ||
    a === '--clear-dir' ||
    a === '--clear-path'
  );

  if (isResetArg) {
    try {
      const configPath = path.join(os.homedir(), '.visualmd', 'config.json');
      if (fs.existsSync(configPath)) {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        delete parsed.dataDir;
        fs.writeFileSync(configPath, JSON.stringify(parsed, null, 2), 'utf-8');
      }
    } catch {}
    console.log(`\n${GREEN}✔ Reset custom data directory path. Default is ~/.visualmd/data${RESET}\n`);
    const otherArgs = userArgs.filter((a) => !a.startsWith('--reset') && !a.startsWith('--clear') && a !== 'reset-dir' && a !== 'reset-path');
    if (otherArgs.length === 0) {
      process.exit(0);
    }
  }

  const activeDataDir = getActiveDataDir(userArgs);
  const cliArgs = ['--port', String(serverPort), '--no-open', ...userArgs];

  // Helper to wait until backend is up and ready
  async function waitForBackend(port, maxWaitMs = 6000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      try {
        const res = await fetch(`http://localhost:${port}/api/health`);
        if (res.ok) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, 150));
    }
    return false;
  }

  // 1. Start Internal Backend Server
  console.log(`${YELLOW}[1/2] Initializing VisualMD Internal Backend Engine...${RESET}`);
  const cliPath = path.resolve(rootDir, 'packages', 'server', 'dist', 'cli.js');
  const serverProc = spawn(process.execPath, [cliPath, ...cliArgs], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' },
  });

  serverProc.on('error', (err) => {
    console.error(`${YELLOW}[Server Startup Error]${RESET} ${err.message}`);
  });

  serverProc.stdout.on('data', (chunk) => {
    const lines = chunk.toString().trim().split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.includes('VisualMD Engine Running') &&
        !trimmed.includes('Workspace URL:') &&
        !trimmed.includes('Press Ctrl+C to stop') &&
        !trimmed.includes('Close Anytime:') &&
        !trimmed.includes('Database Path:') &&
        !trimmed.includes('Data Directory:') &&
        !trimmed.startsWith('┌') &&
        !trimmed.startsWith('│') &&
        !trimmed.startsWith('└')
      ) {
        console.log(`${BLUE}[Backend]${RESET} ${trimmed}`);
      }
    }
  });

  serverProc.stderr.on('data', (chunk) => {
    const lines = chunk.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.error(`${YELLOW}[Backend Error]${RESET} ${line}`);
      }
    }
  });

  // Verify backend is healthy before launching frontend Vite
  await waitForBackend(serverPort);

  // 2. Start Vite Dev Server with HMR in packages/web on frontendPort
  console.log(`${YELLOW}[2/2] Launching VisualMD UI Application on http://localhost:${frontendPort}...${RESET}`);

  // Cross-OS binary resolution: run vite directly via node to avoid Windows npx/cmd ENOENT issues
  let viteBinPath = path.resolve(rootDir, 'node_modules/vite/bin/vite.js');
  if (!fs.existsSync(viteBinPath)) {
    viteBinPath = path.resolve(webDir, 'node_modules/vite/bin/vite.js');
  }

  const viteProc = fs.existsSync(viteBinPath)
    ? spawn(process.execPath, [viteBinPath, '--port', String(frontendPort)], {
        cwd: webDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'development',
          VMD_SERVER_URL: `http://localhost:${serverPort}`,
        },
      })
    : spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--port', String(frontendPort)], {
        cwd: webDir,
        shell: process.platform === 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'development',
          VMD_SERVER_URL: `http://localhost:${serverPort}`,
        },
      });

  viteProc.on('error', (err) => {
    console.error(`${MAGENTA}[Vite Startup Error]${RESET} ${err.message}`);
  });

  viteProc.stdout.on('data', (chunk) => {
    const lines = chunk.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${MAGENTA}[Vite HMR]${RESET} ${line}`);
      }
    }
  });

  viteProc.stderr.on('data', (chunk) => {
    const lines = chunk.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.error(`${MAGENTA}[Vite]${RESET} ${line}`);
      }
    }
  });

  setTimeout(() => {
    console.log(`
${GREEN}${BOLD}──────────────────────────────────────────────────────────────────${RESET}
${GREEN}${BOLD}  ✨ VisualMD Development Environment Ready!                       ${RESET}
${GREEN}${BOLD}──────────────────────────────────────────────────────────────────${RESET}

  🌐 ${BOLD}Live UI Application:${RESET}   ${CYAN}http://localhost:${frontendPort}/${RESET}
  📂 ${BOLD}Data Directory:${RESET}          ${CYAN}${activeDataDir}${RESET}
  ⚡ ${BOLD}Engine Status:${RESET}           ${GREEN}Active • Vite Live HMR${RESET}

  ${YELLOW}Tip: Any changes made to UI code, themes, CSS, or widgets are${RESET}
  ${YELLOW}instantly reflected in the browser without restarting.${RESET}

  Press ${BOLD}Ctrl+C${RESET} to gracefully stop all development services.
`);
  }, 1200);

  // Cleanup on exit
  function cleanup() {
    console.log(`\n${YELLOW}Shutting down development servers...${RESET}`);
    try {
      if (process.platform === 'win32') {
        if (serverProc && serverProc.pid) {
          try {
            spawn('taskkill', ['/pid', String(serverProc.pid), '/f', '/t'], { stdio: 'ignore' });
          } catch {}
        }
        if (viteProc && viteProc.pid) {
          try {
            spawn('taskkill', ['/pid', String(viteProc.pid), '/f', '/t'], { stdio: 'ignore' });
          } catch {}
        }
      } else {
        if (serverProc) serverProc.kill('SIGTERM');
        if (viteProc) viteProc.kill('SIGTERM');
      }
    } catch {}
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  console.error('[dev] Failed to start development orchestrator:', err);
  process.exit(1);
});
