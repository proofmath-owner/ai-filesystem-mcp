import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { promisify } from 'util';

const globAsync = promisify(glob);

export interface SearchResult {
  path: string;
  line: number;
  column: number;
  match: string;
  context: string;
}

export class ContentSearcher {
  async searchContent(
    directory: string,
    pattern: string,
    options?: {
      filePattern?: string;
      ignoreCase?: boolean;
      regex?: boolean;
    }
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchRegex = options?.regex
      ? new RegExp(pattern, options.ignoreCase ? 'gi' : 'g')
      : new RegExp(
          pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          options?.ignoreCase ? 'gi' : 'g'
        );

    // Get files to search
    const globPattern = path.join(directory, options?.filePattern || '**/*');
    const files = await globAsync(globPattern, {
      nodir: true,
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**']
    });

    // Search each file
    for (const file of files as string[]) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, lineIndex) => {
          let match;
          while ((match = searchRegex.exec(line)) !== null) {
            results.push({
              path: file,
              line: lineIndex + 1,
              column: match.index + 1,
              match: match[0],
              context: this.getContext(lines, lineIndex)
            });
          }
        });
      } catch (error) {
        // Skip files that can't be read (binary files, etc.)
      }
    }

    return results;
  }

  private getContext(lines: string[], lineIndex: number, contextLines: number = 2): string {
    const start = Math.max(0, lineIndex - contextLines);
    const end = Math.min(lines.length, lineIndex + contextLines + 1);
    
    return lines
      .slice(start, end)
      .map((line, idx) => {
        const currentLine = start + idx;
        const prefix = currentLine === lineIndex ? '> ' : '  ';
        return `${prefix}${currentLine + 1}: ${line}`;
      })
      .join('\n');
  }
}
