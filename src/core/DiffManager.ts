import { promises as fs } from 'fs';
import * as path from 'path';

interface DiffResult {
  additions: number;
  deletions: number;
  formatted: string;
  patches: DiffPatch[];
}

interface DiffPatch {
  start: number;
  end: number;
  type: 'addition' | 'deletion' | 'modification';
  content: string;
}

interface DiffOptions {
  format?: 'unified' | 'side-by-side' | 'inline';
  contextLines?: number;
  ignoreWhitespace?: boolean;
}

export class DiffManager {
  async diffFiles(file1: string, file2: string, options: DiffOptions = {}): Promise<DiffResult> {
    const content1 = await fs.readFile(file1, 'utf-8');
    const content2 = await fs.readFile(file2, 'utf-8');
    
    return this.diff(content1, content2, options);
  }

  diff(text1: string, text2: string, options: DiffOptions = {}): DiffResult {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    
    const patches: DiffPatch[] = [];
    let additions = 0;
    let deletions = 0;
    
    // Simple line-by-line diff algorithm
    const maxLines = Math.max(lines1.length, lines2.length);
    let formatted = '';
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i];
      const line2 = lines2[i];
      
      if (line1 === undefined && line2 !== undefined) {
        // Addition
        additions++;
        formatted += `+ ${line2}\n`;
        patches.push({
          start: i,
          end: i,
          type: 'addition',
          content: line2
        });
      } else if (line1 !== undefined && line2 === undefined) {
        // Deletion
        deletions++;
        formatted += `- ${line1}\n`;
        patches.push({
          start: i,
          end: i,
          type: 'deletion',
          content: line1
        });
      } else if (line1 !== line2) {
        // Modification
        deletions++;
        additions++;
        formatted += `- ${line1}\n`;
        formatted += `+ ${line2}\n`;
        patches.push({
          start: i,
          end: i,
          type: 'modification',
          content: `${line1} -> ${line2}`
        });
      } else {
        // No change
        if (options.format === 'unified') {
          formatted += `  ${line1}\n`;
        }
      }
    }
    
    return {
      additions,
      deletions,
      formatted,
      patches
    };
  }

  async patchFile(filePath: string, patches: DiffPatch[]): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Apply patches in reverse order to maintain line numbers
    patches.sort((a, b) => b.start - a.start);
    
    for (const patch of patches) {
      switch (patch.type) {
        case 'addition':
          lines.splice(patch.start, 0, patch.content);
          break;
        case 'deletion':
          lines.splice(patch.start, 1);
          break;
        case 'modification':
          lines[patch.start] = patch.content.split(' -> ')[1];
          break;
      }
    }
    
    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
  }
}
