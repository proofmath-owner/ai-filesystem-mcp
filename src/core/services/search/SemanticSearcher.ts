import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { promisify } from 'util';

const globAsync = promisify(glob);
// Natural language processing would require additional libraries
// For now, we'll implement a simple keyword-based semantic search

export interface SemanticSearchResult {
  path: string;
  score: number;
  summary?: string;
  content?: string;
}

export class SemanticSearcher {
  private readonly fileTypeKeywords: Record<string, string[]> = {
    configuration: ['config', 'settings', 'options', 'preferences', 'env', 'rc'],
    database: ['db', 'database', 'schema', 'migration', 'model', 'entity'],
    test: ['test', 'spec', 'e2e', 'unit', 'integration', 'jest', 'mocha'],
    documentation: ['readme', 'docs', 'guide', 'manual', 'help', 'md', 'markdown'],
    source: ['src', 'source', 'lib', 'core', 'main', 'index'],
    style: ['css', 'scss', 'sass', 'less', 'style', 'theme'],
    build: ['build', 'dist', 'output', 'compiled', 'bundle', 'webpack'],
    package: ['package', 'lock', 'yarn', 'npm', 'dependencies']
  };

  async semanticSearch(
    directory: string,
    query: string
  ): Promise<SemanticSearchResult[]> {
    const results: SemanticSearchResult[] = [];
    const queryKeywords = this.extractKeywords(query.toLowerCase());
    
    // Get all files and directories
    const items = await globAsync(path.join(directory, '**/*'), {
      mark: true,
      ignore: ['**/node_modules/**', '**/.git/**']
    });

    for (const item of items as string[]) {
      const isDirectory = item.endsWith('/');
      const itemPath = isDirectory ? item.slice(0, -1) : item;
      const basename = path.basename(itemPath).toLowerCase();
      const ext = path.extname(itemPath).toLowerCase();
      
      // Calculate semantic score
      const { score, reason } = this.calculateSemanticScore(
        basename,
        ext,
        itemPath,
        queryKeywords
      );
      
      if (score > 0) {
        results.push({
          path: itemPath,
          score,
          summary: reason
        });
      }
    }

    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score).slice(0, 50);
  }

  private extractKeywords(query: string): string[] {
    // Simple keyword extraction
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    return query
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.replace(/[^a-z0-9]/g, ''));
  }

  private calculateSemanticScore(
    filename: string,
    extension: string,
    filepath: string,
    queryKeywords: string[]
  ): { score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // Check for exact matches
    for (const keyword of queryKeywords) {
      if (filename.includes(keyword)) {
        score += 10;
        reasons.push(`filename contains "${keyword}"`);
      }
      if (filepath.includes(keyword)) {
        score += 5;
        reasons.push(`path contains "${keyword}"`);
      }
    }

    // Check semantic categories
    for (const [category, keywords] of Object.entries(this.fileTypeKeywords)) {
      const categoryMatch = queryKeywords.some(qk => 
        category.includes(qk) || qk.includes(category)
      );
      
      if (categoryMatch) {
        const fileMatchesCategory = keywords.some(kw => 
          filename.includes(kw) || extension.includes(kw)
        );
        
        if (fileMatchesCategory) {
          score += 7;
          reasons.push(`matches ${category} category`);
        }
      }
    }

    // Extension matching
    for (const keyword of queryKeywords) {
      if (extension === `.${keyword}`) {
        score += 8;
        reasons.push(`extension matches "${keyword}"`);
      }
    }

    return {
      score,
      reason: reasons.join(', ') || 'no specific match'
    };
  }
}
