#!/usr/bin/env node

/**
 * VisualMD Live Development & Debugging Orchestrator
 *
 * Runs backend server (port 9669) + Vite Dev Server (port 5173 with live HMR).
 * Any code or style changes in packages/web/src are reflected in real time!
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
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

console.log(`${CYAN}${BOLD}`);
console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║       VisualMD - Live Development & Debugging Environment        ║');
console.log('╚══════════════════════════════════════════════════════════════════╝');
console.log(`${RESET}`);

const args = process.argv.slice(2);
const cliArgs = ['--port', '9669', '--no-open', ...args];

// 1. Start Backend Server
console.log(`${YELLOW}[1/2] Starting VisualMD Backend Server on port 9669...${RESET}`);
const serverProc = spawn('node', ['packages/server/dist/cli.js', ...cliArgs], {
  cwd: rootDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development' },
});

serverProc.stdout.on('data', (chunk) => {
  const lines = chunk.toString().trim().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      console.log(`${BLUE}[Server]${RESET} ${line}`);
    }
  }
});

serverProc.stderr.on('data', (chunk) => {
  const lines = chunk.toString().trim().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      console.error(`${YELLOW}[Server Error]${RESET} ${line}`);
    }
  }
});

// 2. Start Vite Dev Server with HMR in packages/web
console.log(`${YELLOW}[2/2] Starting Vite Frontend Dev Server with Live HMR...${RESET}`);
const viteProc = spawn('npx', ['vite', '--port', '5173'], {
  cwd: webDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development' },
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

  🌐 ${BOLD}Live App (HMR Active):${RESET}   ${CYAN}http://localhost:5173/${RESET}
  🔌 ${BOLD}Backend REST API:${RESET}        ${CYAN}http://localhost:9669/api${RESET}
  📂 ${BOLD}Data Directory:${RESET}          ${CYAN}${path.join(rootDir, 'data')}${RESET}

  ${YELLOW}Tip: Any changes made to UI code, themes, CSS, or widgets are${RESET}
  ${YELLOW}instantly reflected in the browser without restarting.${RESET}

  Press ${BOLD}Ctrl+C${RESET} to gracefully stop all development services.
`);
}, 1200);

// Cleanup on exit
function cleanup() {
  console.log(`\n${YELLOW}Shutting down development servers...${RESET}`);
  try {
    serverProc.kill('SIGTERM');
  } catch {}
  try {
    viteProc.kill('SIGTERM');
  } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
