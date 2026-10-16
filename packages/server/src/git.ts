import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';

const execFileAsync = promisify(execFile);

function hasGitDir(startDir: string): boolean {
  try {
    let curr = path.resolve(startDir);
    while (curr) {
      if (fs.existsSync(path.join(curr, '.git'))) {
        return true;
      }
      const parent = path.dirname(curr);
      if (parent === curr) break;
      curr = parent;
    }
  } catch {}
  return false;
}

/**
 * Automatically stages and commits any file modifications or deletions
 * in the data directory if the data directory is inside a git repository,
 * ensuring complete safety and zero data loss for user documents.
 *
 * Security Note:
 * Uses execFileAsync with direct argument vectors (no shell execution).
 * This completely prevents shell command injection / RCE regardless of
 * document titles, paths, or characters ($(), ``, ;, &, |, etc.).
 */
export async function autoCommitDataChange(
  dataDir: string,
  message: string,
  filePathOrRelative?: string
): Promise<boolean> {
  try {
    if (!dataDir || !fs.existsSync(dataDir)) return false;
    if (!hasGitDir(dataDir)) return false;

    // Check if git is available and repo exists (direct kernel invocation, no shell)
    const { stdout: isGitRepo } = await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: dataDir,
    }).catch(() => ({ stdout: '' }));

    if (!isGitRepo.trim()) {
      return false;
    }

    const fileToStage = filePathOrRelative
      ? path.isAbsolute(filePathOrRelative)
        ? path.relative(dataDir, filePathOrRelative) || '.'
        : filePathOrRelative
      : '.';

    // Stage changes in data directory without shell expansion
    await execFileAsync('git', ['add', '-A', '--', fileToStage], { cwd: dataDir });

    // Check if there are staged changes to commit
    const { stdout: status } = await execFileAsync('git', ['status', '--porcelain'], { cwd: dataDir });
    if (!status.trim()) {
      return false; // Nothing changed
    }

    // Commit with descriptive message passed as a single isolated argv argument
    const commitMsg = `[VisualMD Auto-Backup] ${message}`;
    await execFileAsync('git', ['commit', '-m', commitMsg], {
      cwd: dataDir,
    });
    return true;
  } catch (err) {
    // Non-blocking: if git fails (e.g. no user.email configured in an isolated env), don't crash the server
    return false;
  }
}
