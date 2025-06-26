export interface SearchResult {
  path: string;
  line?: number;
  matches?: Array<{ match: string; line: number; column: number }>;
}

export interface ISearchService {
  searchFiles(directory: string, pattern: string): Promise<string[]>;
  searchContent(directory: string, pattern: string, filePattern?: string): Promise<SearchResult[]>;
  searchByDate(directory: string, options: { after?: string; before?: string }): Promise<Array<{ path: string; modified: Date; created: Date }>>;
  searchBySize(directory: string, options: { min?: number; max?: number }): Promise<Array<{ path: string; size: number }>>;
  fuzzySearch(
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
  }>>;
  semanticSearch(
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
  }>;
}
