#!/usr/bin/env -S node --no-warnings

process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'ExperimentalWarning') return;
  console.warn(warning);
});

import { runCLI } from '../dist/cli.js';

runCLI().catch((err) => {
  console.error('[VisualMD] Fatal error:', err);
  process.exit(1);
});
