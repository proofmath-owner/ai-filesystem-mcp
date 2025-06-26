import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

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

    // Get files to search with timeout protection
    const globPattern = path.join(directory, options?.filePattern || '**/*');
    const startTime = Date.now();
    const MAX_DURATION = 10000; // 10 seconds timeout
    const MAX_FILES = 1000; // Maximum files to process
    
    const files = await glob(globPattern, {
      nodir: true,
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**']
    });

    // Search each file with limits and timeout
    const filesToProcess = files.slice(0, MAX_FILES);
    
    for (const file of filesToProcess) {
      // Check timeout
      if (Date.now() - startTime > MAX_DURATION) {
        console.warn(`Content search timeout reached after ${MAX_DURATION}ms - returning partial results`);
        break;
      }
      
      try {
        const stats = await fs.stat(file);
        // Skip large files (>1MB)
        if (stats.size > 1024 * 1024) {
          continue;
        }
        
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, lineIndex) => {
          // Reset regex lastIndex to prevent missed matches
          searchRegex.lastIndex = 0;
          let match;
          while ((match = searchRegex.exec(line)) !== null) {
            results.push({
              path: file,
              line: lineIndex + 1,
              column: match.index + 1,
              match: match[0],
              context: this.getContext(lines, lineIndex)
            });
            
            // Prevent infinite loop on zero-width matches
            if (match.index === searchRegex.lastIndex) {
              searchRegex.lastIndex++;
            }
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
