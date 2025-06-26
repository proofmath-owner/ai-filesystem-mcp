export interface DiffResult {
  additions: number;
  deletions: number;
  changes: number;
  content: string;
}

export interface IDiffService {
  compareFiles(
    file1: string,
    file2: string,
    options?: {
      format?: 'unified' | 'context' | 'side-by-side' | 'json';
      context?: number;
      ignoreWhitespace?: boolean;
    }
  ): Promise<DiffResult>;
}