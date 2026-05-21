import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { randomBytes } from 'crypto';

export interface TransactionOperation {
  type: 'write' | 'update' | 'move' | 'delete' | 'create';
  path: string;
  content?: string;
  destination?: string;
  updates?: Array<{
    oldText: string;
    newText: string;
  }>;
}

export interface TransactionResult {
  transactionId: string;
  operations: TransactionOperation[];
  status: 'completed' | 'rolled_back';
  completedAt: Date;
  error?: string;
}

// Each entry records what `executeOperation` actually touched on disk so that
// rollback can undo it precisely. We do not rely on backups alone because
// `create` / `move` produce new artifacts the original tree did not have.
type ExecutedRecord =
  | { kind: 'restore_backup'; originalPath: string; backupPath: string; isDirectory: boolean }
  | { kind: 'delete_created'; createdPath: string }
  | { kind: 'undo_move'; from: string; to: string };

export class TransactionService {
  async executeTransaction(
    operations: TransactionOperation[],
    rollbackOnError: boolean = true,
  ): Promise<TransactionResult> {
    const transactionId = randomBytes(16).toString('hex');
    const executed: ExecutedRecord[] = [];
    const tempBackups: string[] = []; // for final cleanup on success

    try {
      for (const op of operations) {
        await this.executeOperation(op, executed, tempBackups);
      }

      // Success — purge backup copies.
      await this.cleanupBackups(tempBackups);

      return {
        transactionId,
        operations,
        status: 'completed',
        completedAt: new Date(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (rollbackOnError) {
        await this.rollback(executed);
        await this.cleanupBackups(tempBackups);
        return {
          transactionId,
          operations,
          status: 'rolled_back',
          completedAt: new Date(),
          error: message,
        };
      }

      // Caller asked to keep partial state.
      await this.cleanupBackups(tempBackups);
      throw error;
    }
  }

  private async executeOperation(
    op: TransactionOperation,
    executed: ExecutedRecord[],
    tempBackups: string[],
  ): Promise<void> {
    switch (op.type) {
      case 'create': {
        if (typeof op.content !== 'string') {
          throw new Error(`create: content is required for ${op.path}`);
        }
        // Refuse to clobber an existing file under "create" semantics.
        if (await this.pathExists(op.path)) {
          throw new Error(`create: path already exists: ${op.path}`);
        }
        await fs.mkdir(path.dirname(op.path), { recursive: true });
        await fs.writeFile(op.path, op.content, 'utf-8');
        executed.push({ kind: 'delete_created', createdPath: op.path });
        return;
      }

      case 'write': {
        if (typeof op.content !== 'string') {
          throw new Error(`write: content is required for ${op.path}`);
        }
        const backup = await this.snapshot(op.path, tempBackups);
        await fs.mkdir(path.dirname(op.path), { recursive: true });
        await fs.writeFile(op.path, op.content, 'utf-8');
        executed.push(this.toRestoreRecord(op.path, backup));
        return;
      }

      case 'update': {
        if (!Array.isArray(op.updates) || op.updates.length === 0) {
          throw new Error(`update: non-empty updates[] is required for ${op.path}`);
        }
        const backup = await this.snapshot(op.path, tempBackups);
        let content = await fs.readFile(op.path, 'utf-8');
        for (const u of op.updates) {
          const before = content;
          content = content.replace(u.oldText, u.newText);
          if (before === content) {
            // String.replace silently succeeds when the needle is absent.
            // Treat that as the failure it actually is so rollback can run.
            throw new Error(
              `update: oldText not found in ${op.path} (${this.preview(u.oldText)})`,
            );
          }
        }
        await fs.writeFile(op.path, content, 'utf-8');
        executed.push(this.toRestoreRecord(op.path, backup));
        return;
      }

      case 'move': {
        if (typeof op.destination !== 'string' || op.destination.length === 0) {
          throw new Error(`move: destination is required for ${op.path}`);
        }
        if (await this.pathExists(op.destination)) {
          throw new Error(`move: destination already exists: ${op.destination}`);
        }
        await fs.mkdir(path.dirname(op.destination), { recursive: true });
        await fs.rename(op.path, op.destination);
        executed.push({ kind: 'undo_move', from: op.destination, to: op.path });
        return;
      }

      case 'delete': {
        if (!(await this.pathExists(op.path))) {
          throw new Error(`delete: path does not exist: ${op.path}`);
        }
        const backup = await this.snapshot(op.path, tempBackups);
        if (!backup) {
          // snapshot should always succeed here since pathExists was true;
          // bail out if something concurrent changed it under us.
          throw new Error(`delete: failed to snapshot ${op.path}`);
        }
        const stats = await fs.stat(op.path);
        if (stats.isDirectory()) {
          await fs.rm(op.path, { recursive: true, force: true });
        } else {
          await fs.unlink(op.path);
        }
        executed.push({
          kind: 'restore_backup',
          originalPath: op.path,
          backupPath: backup.backupPath,
          isDirectory: backup.isDirectory,
        });
        return;
      }
    }
  }

  private async rollback(executed: ExecutedRecord[]): Promise<void> {
    // Undo in reverse order. Each branch is best-effort; we keep going so
    // partial recovery still happens if one undo step fails.
    for (let i = executed.length - 1; i >= 0; i--) {
      const r = executed[i];
      try {
        if (r.kind === 'delete_created') {
          if (await this.pathExists(r.createdPath)) {
            const s = await fs.stat(r.createdPath);
            if (s.isDirectory()) {
              await fs.rm(r.createdPath, { recursive: true, force: true });
            } else {
              await fs.unlink(r.createdPath);
            }
          }
          continue;
        }

        if (r.kind === 'undo_move') {
          // Move things back: r.from is the post-move location, r.to is the
          // pre-move location we want to restore.
          await fs.mkdir(path.dirname(r.to), { recursive: true });
          await fs.rename(r.from, r.to);
          continue;
        }

        if (r.kind === 'restore_backup') {
          // Remove whatever is currently at the original path (may be
          // nothing, may be a partial write, may be a stale dir).
          if (await this.pathExists(r.originalPath)) {
            const s = await fs.stat(r.originalPath);
            if (s.isDirectory()) {
              await fs.rm(r.originalPath, { recursive: true, force: true });
            } else {
              await fs.unlink(r.originalPath);
            }
          }
          // Restore from backup.
          await fs.mkdir(path.dirname(r.originalPath), { recursive: true });
          if (r.isDirectory) {
            await this.copyDirectory(r.backupPath, r.originalPath);
          } else {
            await fs.copyFile(r.backupPath, r.originalPath);
          }
        }
      } catch (err) {
        // Surface rollback failures on stderr but keep undoing the rest.
        console.error(`Rollback step failed (${JSON.stringify(r)}):`, err);
      }
    }
  }

  private async snapshot(
    filePath: string,
    tempBackups: string[],
  ): Promise<{ backupPath: string; isDirectory: boolean } | null> {
    if (!(await this.pathExists(filePath))) {
      return null;
    }
    const stats = await fs.stat(filePath);
    const backupPath = path.join(
      os.tmpdir(),
      `aifs-tx-${randomBytes(8).toString('hex')}-${path.basename(filePath)}`,
    );
    if (stats.isDirectory()) {
      await this.copyDirectory(filePath, backupPath);
      tempBackups.push(backupPath);
      return { backupPath, isDirectory: true };
    }
    await fs.copyFile(filePath, backupPath);
    tempBackups.push(backupPath);
    return { backupPath, isDirectory: false };
  }

  private toRestoreRecord(
    originalPath: string,
    backup: { backupPath: string; isDirectory: boolean } | null,
  ): ExecutedRecord {
    if (!backup) {
      // `write` on a previously absent path: rolling back means deleting it.
      return { kind: 'delete_created', createdPath: originalPath };
    }
    return {
      kind: 'restore_backup',
      originalPath,
      backupPath: backup.backupPath,
      isDirectory: backup.isDirectory,
    };
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const s = path.join(src, entry.name);
      const d = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await this.copyDirectory(s, d);
      } else {
        await fs.copyFile(s, d);
      }
    }
  }

  private async pathExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  private async cleanupBackups(tempBackups: string[]): Promise<void> {
    for (const b of tempBackups) {
      try {
        const s = await fs.stat(b);
        if (s.isDirectory()) {
          await fs.rm(b, { recursive: true, force: true });
        } else {
          await fs.unlink(b);
        }
      } catch {
        // already gone — fine
      }
    }
  }

  private preview(s: string): string {
    const trimmed = s.length > 40 ? s.slice(0, 40) + '…' : s;
    return JSON.stringify(trimmed);
  }
}
