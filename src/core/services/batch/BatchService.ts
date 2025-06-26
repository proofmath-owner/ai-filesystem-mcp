import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export interface BatchOperation {
  op: 'rename' | 'move' | 'copy' | 'delete';
  files: Array<{
    from: string;
    to?: string;
    pattern?: string;
    replacement?: string;
  }>;
}

export interface BatchResult {
  totalOperations: number;
  successful: number;
  failed: number;
  skipped: number;
  operations: Array<{
    operation: string;
    from: string;
    to?: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }>;
  errors: string[];
}

export class BatchService {
  async executeBatch(
    operations: BatchOperation[],
    options?: {
      dryRun?: boolean;
      continueOnError?: boolean;
    }
  ): Promise<BatchResult> {
    const result: BatchResult = {
      totalOperations: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      operations: [],
      errors: []
    };

    for (const batch of operations) {
      for (const fileOp of batch.files) {
        result.totalOperations++;

        try {
          // Expand glob patterns
          const files = await glob(fileOp.from) as string[];
          
          if (files.length === 0) {
            result.skipped++;
            result.operations.push({
              operation: batch.op,
              from: fileOp.from,
              status: 'skipped',
              error: 'No files matched pattern'
            });
            continue;
          }

          for (const file of files) {
            try {
              let targetPath = fileOp.to;

              // Handle pattern-based renaming
              if (batch.op === 'rename' && fileOp.pattern && fileOp.replacement) {
                const basename = path.basename(file);
                const newName = basename.replace(new RegExp(fileOp.pattern), fileOp.replacement);
                targetPath = path.join(path.dirname(file), newName);
              }

              if (!options?.dryRun) {
                await this.executeOperation(batch.op, file, targetPath);
              }

              result.successful++;
              result.operations.push({
                operation: batch.op,
                from: file,
                to: targetPath,
                status: 'success'
              });
            } catch (error) {
              result.failed++;
              const errorMsg = error instanceof Error ? error.message : String(error);
              result.errors.push(errorMsg);
              result.operations.push({
                operation: batch.op,
                from: file,
                to: fileOp.to,
                status: 'failed',
                error: errorMsg
              });

              if (!options?.continueOnError) {
                throw error;
              }
            }
          }
        } catch (error) {
          if (!options?.continueOnError) {
            throw error;
          }
        }
      }
    }

    return result;
  }

  private async executeOperation(op: string, from: string, to?: string): Promise<void> {
    switch (op) {
      case 'rename':
      case 'move':
        if (!to) throw new Error('Target path required for move/rename operation');
        await fs.rename(from, to);
        break;
      
      case 'copy':
        if (!to) throw new Error('Target path required for copy operation');
        await fs.copyFile(from, to);
        break;
      
      case 'delete':
        const stats = await fs.stat(from);
        if (stats.isDirectory()) {
          await fs.rmdir(from, { recursive: true });
        } else {
          await fs.unlink(from);
        }
        break;
      
      default:
        throw new Error(`Unknown operation: ${op}`);
    }
  }
}
