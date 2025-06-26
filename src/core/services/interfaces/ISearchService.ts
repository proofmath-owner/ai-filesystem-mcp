import { CommandResult } from '../../commands/Command.js';

export interface SearchOptions {
  pattern?: string;
  maxResults?: number;
  includeHidden?: boolean;
  caseSensitive?: boolean;
  fuzzyThreshold?: number;
}

export interface DateSearchOptions extends SearchOptions {
  startDate: Date;
  endDate: Date;
}

export interface SizeSearchOptions extends SearchOptions {
  minSize: number;
  maxSize: number;
}

export interface ISearchService {
  // File search operations
  searchFiles(directory: string, pattern: string, options?: SearchOptions): Promise<CommandResult>;
  searchContent(directory: string, contentPattern: string, filePattern?: string, options?: SearchOptions): Promise<CommandResult>;
  
  // Date and size based search
  searchByDate(directory: string, options: DateSearchOptions): Promise<CommandResult>;
  searchBySize(directory: string, options: SizeSearchOptions): Promise<CommandResult>;
  
  // Advanced search
  fuzzySearch(directory: string, query: string, options?: SearchOptions): Promise<CommandResult>;
  semanticSearch(directory: string, query: string, options?: SearchOptions): Promise<CommandResult>;
}