#!/usr/bin/env node

/**
 * VisualMD Universal Version Bumper Utility
 *
 * Updates version across the entire monorepo:
 * - Root package.json
 * - packages/compiler/package.json
 * - packages/server/package.json
 * - packages/web/package.json
 * - packages/server/src/server.ts (/api/health endpoint)
 * - packages/server/tests/server.test.mjs (test suite version assertions)
 * - README.md (badges & directory structure comments)
 * - SECURITY.md (Supported versions & release history table)
 *
 * NOTE: This script does NOT commit or push to Git/GitHub.
 *
 * Usage:
 *   node scripts/bump-version.mjs <new_version>
 *   npm run bump 1.0.244
 *   npm run bump 2.0.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const targetVersion = process.argv[2]?.trim().replace(/^v/, '');

if (!targetVersion) {
  console.error(`\n${RED}Error: Missing target version argument.${RESET}`);
  console.log(`\n${BOLD}Usage:${RESET}`);
  console.log(`  node scripts/bump-version.mjs <version>`);
  console.log(`  node scripts/bump-version.mjs 1.0.244\n`);
  process.exit(1);
}

// Validate semver format (e.g. 1.0.244 or 2.0.0-beta.1)
const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
if (!semverRegex.test(targetVersion)) {
  console.error(`\n${RED}Error: "${targetVersion}" is not a valid semantic version (e.g. 1.0.244, 2.0.0).${RESET}\n`);
  process.exit(1);
}

// Read current version from root package.json
const rootPkgPath = path.resolve(rootDir, 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
const currentVersion = rootPkg.version;

console.log(`\n${BOLD}${CYAN}=== VisualMD Universal Version Bumper ===${RESET}`);
console.log(`Current Version: ${YELLOW}${currentVersion}${RESET}`);
console.log(`Target Version:  ${GREEN}${targetVersion}${RESET}\n`);

if (currentVersion === targetVersion) {
  console.log(`${YELLOW}Notice: Target version is identical to current version (${targetVersion}). Re-verifying all files...${RESET}\n`);
}

const modifiedFiles = [];

function updateFile(relativePath, updateFn) {
  const fullPath = path.resolve(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`${YELLOW}⚠ Skipped (file not found): ${relativePath}${RESET}`);
    return;
  }
  const original = fs.readFileSync(fullPath, 'utf-8');
  const updated = updateFn(original);
  if (original !== updated) {
    fs.writeFileSync(fullPath, updated, 'utf-8');
    modifiedFiles.push(relativePath);
    console.log(`  ${GREEN}✔ Updated:${RESET} ${relativePath}`);
  } else {
    console.log(`  ${CYAN}• Unchanged:${RESET} ${relativePath}`);
  }
}

// 1. Update package.json files
const packageJsonFiles = [
  'package.json',
  'packages/compiler/package.json',
  'packages/server/package.json',
  'packages/web/package.json',
];

for (const pkgFile of packageJsonFiles) {
  updateFile(pkgFile, (content) => {
    try {
      const parsed = JSON.parse(content);
      parsed.version = targetVersion;
      return JSON.stringify(parsed, null, 2) + '\n';
    } catch {
      return content.replace(
        new RegExp(`"version":\\s*"${currentVersion.replace(/\./g, '\\.')}"`, 'g'),
        `"version": "${targetVersion}"`
      );
    }
  });
}

// 2. Update server.ts health check version
updateFile('packages/server/src/server.ts', (content) => {
  return content.replace(
    /version:\s*['"][\d.]+['"]/g,
    `version: '${targetVersion}'`
  );
});

// 3. Update server test suite assertions
updateFile('packages/server/tests/server.test.mjs', (content) => {
  return content
    .replace(
      /test\('Server \(v[\d.]+\) - Health Version & Prefix FTS5 Search'/g,
      `test('Server (v${targetVersion}) - Health Version & Prefix FTS5 Search'`
    )
    .replace(
      /test\('Server \(v[\d.]+\) - Folder lifecycle, auto-prune immunity, foreign key integrity & crash protection'/g,
      `test('Server (v${targetVersion}) - Folder lifecycle, auto-prune immunity, foreign key integrity & crash protection'`
    )
    .replace(
      /Discussing v[\d.]+ release\./g,
      `Discussing v${targetVersion} release.`
    )
    .replace(
      /assert\.equal\(health\.version,\s*['"][\d.]+['"]\)/g,
      `assert.equal(health.version, '${targetVersion}')`
    );
});

// 4. Update README.md badge and directory comments
updateFile('README.md', (content) => {
  return content
    .replace(
      /badge\/Version-v[\d.]+-purple\.svg/g,
      `badge/Version-v${targetVersion}-purple.svg`
    )
    .replace(
      /Version:\s*v[\d.]+/g,
      `Version: v${targetVersion}`
    )
    .replace(
      /Monorepo configuration \(version [\d.]+\)/g,
      `Monorepo configuration (version ${targetVersion})`
    );
});

// 5. Update SECURITY.md supported version table
const releaseHighlights = process.argv.slice(3).join(' ').trim() ||
  (targetVersion === '1.0.248'
    ? 'In-app native PDF viewer & interactive image viewer, virtual folder companion assets grouping (1-level depth with nested subfolder immunity), direct asset deletion API, and multi-resource Markdown workflow'
    : targetVersion === '1.0.246'
    ? 'Foreign key constraint resilience, folder auto-prune immunity on creation, Express exception crash protection, folder cascade disassociation'
    : `Universal version bump to v${targetVersion}`);

updateFile('SECURITY.md', (content) => {
  // Check if targetVersion is already in the table
  if (content.includes(`| **v${targetVersion}** |`)) {
    return content;
  }

  // Update top row or insert current release
  const tableHeader = '| Version | Status | Security Support | Release Notes / Highlights |\n| :--- | :--- | :--- | :--- |\n';
  if (content.includes(tableHeader)) {
    const newRow = `| **v${targetVersion}** | **Latest (Current)** | :white_check_mark: Actively Supported | ${releaseHighlights} |\n`;
    // Update existing Latest to Previous
    const updatedContent = content
      .replace(/\*\*Latest \(Current\)\*\*/g, 'Previous Release')
      .replace(tableHeader, tableHeader + newRow);
    return updatedContent;
  }
  return content;
});

// 6. Update packages/compiler/src/version.ts
updateFile('packages/compiler/src/version.ts', (content) => {
  return content.replace(
    /COMPILER_VERSION\s*=\s*['"][\d.]+['"]/g,
    `COMPILER_VERSION = '${targetVersion}'`
  );
});

// 7. Update packages/server/src/version.ts
updateFile('packages/server/src/version.ts', (content) => {
  return content.replace(
    /SERVER_VERSION\s*=\s*['"][\d.]+['"]/g,
    `SERVER_VERSION = '${targetVersion}'`
  );
});

// 8. Update packages/web/src/version.ts
updateFile('packages/web/src/version.ts', (content) => {
  return content.replace(
    /APP_VERSION\s*=\s*['"][\d.]+['"]/g,
    `APP_VERSION = '${targetVersion}'`
  );
});

// 9. Update package-lock.json workspaces and root
updateFile('package-lock.json', (content) => {
  try {
    const lock = JSON.parse(content);
    lock.version = targetVersion;
    if (lock.packages) {
      if (lock.packages['']) lock.packages[''].version = targetVersion;
      if (lock.packages['packages/compiler']) lock.packages['packages/compiler'].version = targetVersion;
      if (lock.packages['packages/server']) lock.packages['packages/server'].version = targetVersion;
      if (lock.packages['packages/web']) lock.packages['packages/web'].version = targetVersion;
    }
    return JSON.stringify(lock, null, 2) + '\n';
  } catch {
    return content;
  }
});

console.log(`\n${BOLD}${GREEN}✔ Successfully synchronized version ${targetVersion} across ${modifiedFiles.length} file(s)!${RESET}`);
console.log(`${CYAN}ℹ Git changes are staged locally on disk. Review with "git diff" before committing.${RESET}\n`);
