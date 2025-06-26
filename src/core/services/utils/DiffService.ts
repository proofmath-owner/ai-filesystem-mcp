import * as fs from 'fs/promises';
import * as diff from 'diff';

export interface DiffResult {
  additions: number;
  deletions: number;
  changes: number;
  content: string;
}

export class DiffService {
  async compareFiles(
    file1: string,
    file2: string,
    options?: {
      format?: 'unified' | 'side-by-side' | 'inline';
      context?: number;
      ignoreWhitespace?: boolean;
    }
  ): Promise<DiffResult> {
    try {
      const content1 = await fs.readFile(file1, 'utf-8');
      const content2 = await fs.readFile(file2, 'utf-8');

      let diffResult;
      if (options?.ignoreWhitespace) {
        diffResult = diff.createPatch(
          file1,
          content1.replace(/\s+/g, ' '),
          content2.replace(/\s+/g, ' '),
          '',
          '',
          { context: options.context || 3 }
        );
      } else {
        diffResult = diff.createPatch(
          file1,
          content1,
          content2,
          '',
          '',
          { context: options?.context || 3 }
        );
      }

      const changes = diff.diffLines(content1, content2);
      let additions = 0;
      let deletions = 0;

      changes.forEach(change => {
        if (change.added) {
          additions += change.count || 1;
        } else if (change.removed) {
          deletions += change.count || 1;
        }
      });

      return {
        additions,
        deletions,
        changes: additions + deletions,
        content: diffResult
      };
    } catch (error) {
      throw new Error(`Failed to compare files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
