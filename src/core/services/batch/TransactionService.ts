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
}

interface Backup {
  originalPath: string;
  backupPath: string;
  type: 'file' | 'directory' | 'none';
}

export class TransactionService {
  private backups: Map<string, Backup[]> = new Map();

  async executeTransaction(
    operations: TransactionOperation[],
    rollbackOnError: boolean = true
  ): Promise<TransactionResult> {
    const transactionId = randomBytes(16).toString('hex');
    const backups: Backup[] = [];
    this.backups.set(transactionId, backups);

    try {
      // Create backups first
      for (const op of operations) {
        if (op.type !== 'create') {
          const backup = await this.createBackup(op.path);
          backups.push(backup);
        }
      }

      // Execute operations
      for (const op of operations) {
        await this.executeOperation(op);
      }

      // Clean up backups on success
      await this.cleanupBackups(transactionId);

      return {
        transactionId,
        operations,
        status: 'completed',
        completedAt: new Date()
      };
    } catch (error) {
      if (rollbackOnError) {
        await this.rollback(transactionId);
        return {
          transactionId,
          operations,
          status: 'rolled_back',
          completedAt: new Date()
        };
      }
      throw error;
    }
  }

  private async executeOperation(op: TransactionOperation): Promise<void> {
    switch (op.type) {
      case 'write':
        if (!op.content) throw new Error('Content required for write operation');
        await fs.writeFile(op.path, op.content, 'utf-8');
        break;

      case 'update':
        if (!op.updates) throw new Error('Updates required for update operation');
        let content = await fs.readFile(op.path, 'utf-8');
        for (const update of op.updates) {
          content = content.replace(update.oldText, update.newText);
        }
        await fs.writeFile(op.path, content, 'utf-8');
        break;

      case 'move':
        if (!op.destination) throw new Error('Destination required for move operation');
        await fs.rename(op.path, op.destination);
        break;

      case 'delete':
        const stats = await fs.stat(op.path);
        if (stats.isDirectory()) {
          await fs.rmdir(op.path, { recursive: true });
        } else {
          await fs.unlink(op.path);
        }
        break;

      case 'create':
        if (!op.content) throw new Error('Content required for create operation');
        await fs.mkdir(path.dirname(op.path), { recursive: true });
        await fs.writeFile(op.path, op.content, 'utf-8');
        break;
    }
  }

  private async createBackup(filePath: string): Promise<Backup> {
    try {
      const stats = await fs.stat(filePath);
      const backupPath = path.join(
        os.tmpdir(),
        `backup_${randomBytes(8).toString('hex')}_${path.basename(filePath)}`
      );

      if (stats.isDirectory()) {
        await this.copyDirectory(filePath, backupPath);
        return { originalPath: filePath, backupPath, type: 'directory' };
      } else {
        await fs.copyFile(filePath, backupPath);
        return { originalPath: filePath, backupPath, type: 'file' };
      }
    } catch (error) {
      // File doesn't exist
      return { originalPath: filePath, backupPath: '', type: 'none' };
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async rollback(transactionId: string): Promise<void> {
    const backups = this.backups.get(transactionId) || [];

    for (const backup of backups) {
      try {
        if (backup.type === 'none') continue;

        // Remove any existing file/directory at original path
        try {
          const stats = await fs.stat(backup.originalPath);
          if (stats.isDirectory()) {
            await fs.rmdir(backup.originalPath, { recursive: true });
          } else {
            await fs.unlink(backup.originalPath);
          }
        } catch {
          // Original path doesn't exist anymore
        }

        // Restore from backup
        if (backup.type === 'directory') {
          await this.copyDirectory(backup.backupPath, backup.originalPath);
        } else {
          await fs.copyFile(backup.backupPath, backup.originalPath);
        }
      } catch (error) {
        console.error(`Failed to rollback ${backup.originalPath}:`, error);
      }
    }

    await this.cleanupBackups(transactionId);
  }

  private async cleanupBackups(transactionId: string): Promise<void> {
    const backups = this.backups.get(transactionId) || [];

    for (const backup of backups) {
      if (backup.type === 'none') continue;

      try {
        if (backup.type === 'directory') {
          await fs.rmdir(backup.backupPath, { recursive: true });
        } else {
          await fs.unlink(backup.backupPath);
        }
      } catch (error) {
        console.error(`Failed to cleanup backup ${backup.backupPath}:`, error);
      }
    }

    this.backups.delete(transactionId);
  }
}
