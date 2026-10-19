#!/usr/bin/env node

process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'ExperimentalWarning' || (warning.message && warning.message.includes('SQLite'))) return;
  console.warn(warning);
});

const { runCLI } = await import('../dist/cli.js');

runCLI().catch((err) => {
  console.error('[VisualMD] Fatal error:', err);
  process.exit(1);
});
