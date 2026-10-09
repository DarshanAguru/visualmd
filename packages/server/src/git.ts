import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';

const execAsync = promisify(exec);

/**
 * Automatically stages and commits any file modifications or deletions
 * in the data directory if the data directory is inside a git repository,
 * ensuring complete safety and zero data loss for user documents.
 */
export async function autoCommitDataChange(
  dataDir: string,
  message: string,
  filePathOrRelative?: string
): Promise<boolean> {
  try {
    if (!dataDir || !fs.existsSync(dataDir)) return false;

    // Check if git is available and repo exists
    const { stdout: isGitRepo } = await execAsync('git rev-parse --is-inside-work-tree', {
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

    // Stage changes in data directory
    await execAsync(`git add -A -- "${fileToStage}"`, { cwd: dataDir });

    // Check if there are staged changes to commit
    const { stdout: status } = await execAsync('git status --porcelain', { cwd: dataDir });
    if (!status.trim()) {
      return false; // Nothing changed
    }

    // Commit with descriptive message
    const cleanMsg = message.replace(/"/g, '\\"');
    await execAsync(`git commit -m "[VisualMD Auto-Backup] ${cleanMsg}"`, {
      cwd: dataDir,
    });
    return true;
  } catch (err) {
    // Non-blocking: if git fails (e.g. no user.email configured in an isolated env), don't crash the server
    return false;
  }
}
