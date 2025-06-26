import { ISearchService, SearchResult } from '../../interfaces/ISearchService.js';
import { ContentSearcher } from './ContentSearcher.js';
import { FuzzySearcher, FuzzySearchResult } from './FuzzySearcher.js';
import { SemanticSearcher, SemanticSearchResult } from './SemanticSearcher.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export class SearchService implements ISearchService {
  constructor(
    private contentSearcher: ContentSearcher,
    private fuzzySearcher: FuzzySearcher,
    private semanticSearcher: SemanticSearcher
  ) {}

  async searchFiles(directory: string, pattern: string): Promise<string[]> {
    const files = await glob(path.join(directory, pattern), {
      nodir: true,
      ignore: ['**/node_modules/**', '**/.git/**']
    }) as string[];
    return files;
  }

  async searchContent(
    directory: string,
    pattern: string,
    filePattern?: string
  ): Promise<SearchResult[]> {
    return this.contentSearcher.searchContent(directory, pattern, { filePattern });
  }

  async searchByDate(
    directory: string,
    options: { after?: string; before?: string }
  ): Promise<Array<{ path: string; modified: Date; created: Date }>> {
    const results: Array<{ path: string; modified: Date; created: Date }> = [];
    
    const files = await glob(path.join(directory, '**/*'), {
      nodir: true,
      ignore: ['**/node_modules/**', '**/.git/**']
    }) as string[];
    
    const afterDate = options.after ? new Date(options.after) : undefined;
    const beforeDate = options.before ? new Date(options.before) : undefined;

    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        const modified = stats.mtime;
        const created = stats.birthtime;

        let include = true;
        if (afterDate && modified < afterDate) include = false;
        if (beforeDate && modified > beforeDate) include = false;

        if (include) {
          results.push({ path: file, modified, created });
        }
      } catch (error) {
        // Skip files that can't be accessed
      }
    }

    return results.sort((a, b) => b.modified.getTime() - a.modified.getTime());
  }

  async searchBySize(
    directory: string,
    options: { min?: number; max?: number }
  ): Promise<Array<{ path: string; size: number }>> {
    const results: Array<{ path: string; size: number }> = [];
    
    const files = await glob(path.join(directory, '**/*'), {
      nodir: true,
      ignore: ['**/node_modules/**', '**/.git/**']
    }) as string[];

    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        const size = stats.size;

        let include = true;
        if (options.min !== undefined && size < options.min) include = false;
        if (options.max !== undefined && size > options.max) include = false;

        if (include) {
          results.push({ path: file, size });
        }
      } catch (error) {
        // Skip files that can't be accessed
      }
    }

    return results.sort((a, b) => b.size - a.size);
  }

  async semanticSearch(
    query: string,
    directory: string,
    options?: {
      fileTypes?: string[];
      limit?: number;
      includeContent?: boolean;
    }
  ): Promise<{
    interpretation: string;
    files: Array<{
      path: string;
      relevanceScore: number;
      summary: string;
      content?: string;
    }>;
  }> {
    const results = await this.semanticSearcher.semanticSearch(directory, query);
    
    // Filter by file types if specified
    let filteredResults = results;
    if (options?.fileTypes && options.fileTypes.length > 0) {
      filteredResults = results.filter(r => {
        const ext = path.extname(r.path).slice(1);
        return options.fileTypes!.includes(ext);
      });
    }
    
    // Apply limit
    if (options?.limit) {
      filteredResults = filteredResults.slice(0, options.limit);
    }
    
    // Format response
    return {
      interpretation: `Searching for: ${query}`,
      files: filteredResults.map(r => ({
        path: r.path,
        relevanceScore: r.score || 0,
        summary: r.summary || '',
        content: options?.includeContent ? r.content : undefined
      }))
    };
  }

  async fuzzySearch(
    query: string,
    directory: string,
    options?: {
      threshold?: number;
      limit?: number;
      extensions?: string[];
    }
  ): Promise<Array<{
    path: string;
    score: number;
    matchedPart: string;
  }>> {
    const results = await this.fuzzySearcher.fuzzySearch(
      directory,
      query,
      options?.threshold || 0.6
    );
    
    // Filter by extensions if specified
    let filteredResults = results;
    if (options?.extensions && options.extensions.length > 0) {
      filteredResults = results.filter(r => {
        const ext = path.extname(r.path).slice(1);
        return options.extensions!.includes(ext);
      });
    }
    
    // Apply limit
    if (options?.limit) {
      filteredResults = filteredResults.slice(0, options.limit);
    }
    
    return filteredResults.map(r => ({
      path: r.path,
      score: r.score,
      matchedPart: r.matchedPart || path.basename(r.path)
    }));
  }
}
