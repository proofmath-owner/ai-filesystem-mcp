import { promises as fs, Stats } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { ISearchService, SearchOptions, DateSearchOptions, SizeSearchOptions } from '../interfaces/ISearchService.js';
import { CommandResult } from '../../commands/Command.js';
import { AdvancedSearchManager } from '../../AdvancedSearchManager.js';
import { MonitoringManager } from '../../MonitoringManager.js';
import { ErrorHandlingManager } from '../../ErrorHandlingManager.js';

interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
}

export class SearchService implements ISearchService {
  constructor(
    private searchManager: AdvancedSearchManager,
    private monitoringManager: MonitoringManager,
    private errorManager: ErrorHandlingManager
  ) {}

  private async handleError(error: unknown, operation: string, path?: string): Promise<CommandResult> {
    const errorContext = {
      operation,
      path,
      error,
      timestamp: new Date()
    };
    const recovery = await this.errorManager.analyzeError(errorContext);
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n${recovery.suggestions.map(s => s.message).join('\n')}`
      }]
    };
  }

  async searchFiles(directory: string, pattern: string, options?: SearchOptions): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const searchPattern = path.join(directory, '**', pattern);
      const files = await glob(searchPattern, {
        ignore: options?.includeHidden ? [] : ['**/.*'],
        nocase: !options?.caseSensitive
      });
      
      const limitedFiles = options?.maxResults ? files.slice(0, options.maxResults) : files;
      
      await this.monitoringManager.logOperation({
        type: 'read',
        path: directory,
        success: true,
        metadata: { duration: Date.now() - startTime }
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            pattern,
            directory,
            matches: limitedFiles,
            totalMatches: files.length,
            limited: options?.maxResults ? files.length > options.maxResults : false
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError(error, 'search_files', directory);
    }
  }

  async searchContent(directory: string, contentPattern: string, filePattern?: string, options?: SearchOptions): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const searchFilePattern = filePattern || '*';
      const files = await glob(path.join(directory, '**', searchFilePattern), {
        ignore: options?.includeHidden ? [] : ['**/.*']
      });
      
      const results: SearchResult[] = [];
      const contentRegex = new RegExp(contentPattern, options?.caseSensitive ? 'g' : 'gi');
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const lines = content.split('\n');
          
          lines.forEach((line, lineIndex) => {
            let match;
            while ((match = contentRegex.exec(line)) !== null) {
              results.push({
                file,
                line: lineIndex + 1,
                column: match.index + 1,
                match: match[0],
                context: line.trim()
              });
              
              if (options?.maxResults && results.length >= options.maxResults) {
                break;
              }
            }
            
            if (options?.maxResults && results.length >= options.maxResults) {
              return;
            }
          });
          
          if (options?.maxResults && results.length >= options.maxResults) {
            break;
          }
        } catch (err) {
          // Skip files that can't be read
        }
      }
      
      await this.monitoringManager.logOperation({
        type: 'read',
        path: directory,
        success: true,
        metadata: { duration: Date.now() - startTime }
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            contentPattern,
            filePattern,
            directory,
            matches: results,
            totalFiles: files.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError(error, 'search_content', directory);
    }
  }

  async searchByDate(directory: string, options: DateSearchOptions): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const pattern = options.pattern || '**/*';
      const files = await glob(path.join(directory, pattern), {
        ignore: options.includeHidden ? [] : ['**/.*'],
        stat: true
      });
      
      const results = [];
      
      for (const file of files) {
        try {
          const stats = await fs.stat(file);
          const modifiedTime = stats.mtime;
          
          if (modifiedTime >= options.startDate && modifiedTime <= options.endDate) {
            results.push({
              file,
              modifiedTime,
              size: stats.size
            });
            
            if (options.maxResults && results.length >= options.maxResults) {
              break;
            }
          }
        } catch (err) {
          // Skip files that can't be accessed
        }
      }
      
      // Sort by date
      results.sort((a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime());
      
      await this.monitoringManager.logOperation({
        type: 'read',
        path: directory,
        success: true,
        metadata: { duration: Date.now() - startTime }
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            directory,
            startDate: options.startDate,
            endDate: options.endDate,
            matches: results,
            totalFiles: files.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError(error, 'search_by_date', directory);
    }
  }

  async searchBySize(directory: string, options: SizeSearchOptions): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const pattern = options.pattern || '**/*';
      const files = await glob(path.join(directory, pattern), {
        ignore: options.includeHidden ? [] : ['**/.*'],
        stat: true
      });
      
      const results = [];
      
      for (const file of files) {
        try {
          const stats = await fs.stat(file);
          
          if (stats.size >= options.minSize && stats.size <= options.maxSize && stats.isFile()) {
            results.push({
              file,
              size: stats.size,
              humanSize: this.formatFileSize(stats.size),
              modifiedTime: stats.mtime
            });
            
            if (options.maxResults && results.length >= options.maxResults) {
              break;
            }
          }
        } catch (err) {
          // Skip files that can't be accessed
        }
      }
      
      // Sort by size
      results.sort((a, b) => b.size - a.size);
      
      await this.monitoringManager.logOperation({
        type: 'read',
        path: directory,
        success: true,
        metadata: { duration: Date.now() - startTime }
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            directory,
            minSize: options.minSize,
            maxSize: options.maxSize,
            matches: results,
            totalFiles: files.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError(error, 'search_by_size', directory);
    }
  }

  async fuzzySearch(directory: string, query: string, options?: SearchOptions): Promise<CommandResult> {
    try {
      const result = await this.searchManager.fuzzySearch(
        query, 
        directory, 
        options?.fuzzyThreshold || 0.3
      );
      
      // Limit results if needed
      const limitedResults = options?.maxResults 
        ? result.slice(0, options.maxResults)
        : result;
      
      return {
        content: [{ type: 'text', text: JSON.stringify(limitedResults, null, 2) }]
      };
    } catch (error) {
      return this.handleError(error, 'fuzzy_search', directory);
    }
  }

  async semanticSearch(directory: string, query: string, options?: SearchOptions): Promise<CommandResult> {
    try {
      const result = await this.searchManager.semanticSearch(query, directory);
      
      // Limit results if needed
      const limitedResults = options?.maxResults 
        ? result.slice(0, options.maxResults)
        : result.slice(0, 20);
      
      return {
        content: [{ type: 'text', text: JSON.stringify(limitedResults, null, 2) }]
      };
    } catch (error) {
      return this.handleError(error, 'semantic_search', directory);
    }
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}