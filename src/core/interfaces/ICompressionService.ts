export interface CompressionResult {
  outputPath: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  filesCount: number;
}

export interface ExtractionResult {
  outputPath: string;
  extractedFiles: string[];
  totalSize: number;
}

export interface ICompressionService {
  compress(
    files: string[],
    outputPath: string,
    options?: {
      format?: 'zip' | 'tar' | 'tar.gz' | 'tgz';
      level?: number;
      includeHidden?: boolean;
    }
  ): Promise<CompressionResult>;

  extract(
    archivePath: string,
    outputPath?: string,
    options?: {
      filter?: string;
      overwrite?: boolean;
    }
  ): Promise<ExtractionResult>;
}