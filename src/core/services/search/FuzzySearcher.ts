import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { promisify } from 'util';

const globAsync = promisify(glob);

export interface FuzzySearchResult {
  path: string;
  score: number;
  matchedPart?: string;
}

export class FuzzySearcher {
  async fuzzySearch(
    directory: string,
    pattern: string,
    threshold: number = 0.6
  ): Promise<FuzzySearchResult[]> {
    const results: FuzzySearchResult[] = [];
    
    // Get all files and directories
    const items = await globAsync(path.join(directory, '**/*'), {
      mark: true,
      ignore: ['**/node_modules/**', '**/.git/**']
    });

    for (const item of items as string[]) {
      const isDirectory = item.endsWith('/');
      const itemPath = isDirectory ? item.slice(0, -1) : item;
      const basename = path.basename(itemPath);
      
      const score = this.calculateSimilarity(basename.toLowerCase(), pattern.toLowerCase());
      
      if (score >= threshold) {
        results.push({
          path: itemPath,
          score
        });
      }
    }

    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 1;
    
    return 1 - distance / maxLength;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
