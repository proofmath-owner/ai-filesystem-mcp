import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

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
    const startTime = Date.now();
    const MAX_DURATION = 5000; // 5 seconds timeout
    const MAX_ITEMS = 1000; // Maximum items to process
    
    // Get all files and directories
    const items = await glob(path.join(directory, '**/*'), {
      mark: true,
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**']
    });

    const itemsToProcess = items.slice(0, MAX_ITEMS);
    
    for (const item of itemsToProcess) {
      // Check timeout
      if (Date.now() - startTime > MAX_DURATION) {
        console.warn(`Fuzzy search timeout reached after ${MAX_DURATION}ms - returning partial results`);
        break;
      }
      
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

    // Sort by score (highest first) and limit results
    return results.sort((a, b) => b.score - a.score).slice(0, 50);
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
