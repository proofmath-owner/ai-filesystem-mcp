import * as fs from 'fs/promises';
import * as path from 'path';
import archiver from 'archiver';
import { createReadStream, createWriteStream } from 'fs';
import AdmZip from 'adm-zip';
import tar from 'tar';

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

export class CompressionService {
  async compress(
    files: string[],
    outputPath: string,
    options?: {
      format?: 'zip' | 'tar' | 'tar.gz' | 'tgz';
      level?: number;
      includeHidden?: boolean;
    }
  ): Promise<CompressionResult> {
    const format = options?.format || 'zip';
    let totalSize = 0;
    let filesCount = 0;

    // Calculate total size
    for (const file of files) {
      const stats = await fs.stat(file);
      if (stats.isDirectory()) {
        const dirSize = await this.getDirectorySize(file);
        totalSize += dirSize.size;
        filesCount += dirSize.count;
      } else {
        totalSize += stats.size;
        filesCount++;
      }
    }

    if (format === 'zip') {
      await this.createZip(files, outputPath, options?.level || 6);
    } else if (format === 'tar' || format === 'tar.gz' || format === 'tgz') {
      await this.createTar(files, outputPath, format !== 'tar');
    }

    const compressedStats = await fs.stat(outputPath);
    const compressedSize = compressedStats.size;

    return {
      outputPath,
      originalSize: totalSize,
      compressedSize,
      compressionRatio: totalSize > 0 ? (1 - compressedSize / totalSize) : 0,
      filesCount
    };
  }

  async extract(
    archivePath: string,
    outputPath?: string,
    options?: {
      filter?: string;
      overwrite?: boolean;
    }
  ): Promise<ExtractionResult> {
    const ext = path.extname(archivePath).toLowerCase();
    const extractPath = outputPath || path.dirname(archivePath);
    
    await fs.mkdir(extractPath, { recursive: true });

    let extractedFiles: string[] = [];
    let totalSize = 0;

    if (ext === '.zip') {
      const result = await this.extractZip(archivePath, extractPath, options);
      extractedFiles = result.files;
      totalSize = result.size;
    } else if (ext === '.tar' || ext === '.gz' || ext === '.tgz') {
      const result = await this.extractTar(archivePath, extractPath, options);
      extractedFiles = result.files;
      totalSize = result.size;
    } else {
      throw new Error(`Unsupported archive format: ${ext}`);
    }

    return {
      outputPath: extractPath,
      extractedFiles,
      totalSize
    };
  }

  private async createZip(files: string[], outputPath: string, level: number): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);

      for (const file of files) {
        const stat = await fs.stat(file);
        if (stat.isDirectory()) {
          archive.directory(file, path.basename(file));
        } else {
          archive.file(file, { name: path.basename(file) });
        }
      }

      archive.finalize();
    });
  }

  private async createTar(files: string[], outputPath: string, gzip: boolean): Promise<void> {
    const options: tar.CreateOptions & { file?: string } = {
      gzip
    } as any;
    // @ts-ignore - tar types issue
    options.file = outputPath;

    await tar.create(options, files);
  }

  private async extractZip(
    archivePath: string,
    extractPath: string,
    options?: { filter?: string; overwrite?: boolean }
  ): Promise<{ files: string[]; size: number }> {
    const zip = new AdmZip(archivePath);
    const entries = zip.getEntries();
    const extractedFiles: string[] = [];
    let totalSize = 0;

    for (const entry of entries) {
      if (options?.filter && !entry.entryName.includes(options.filter)) {
        continue;
      }

      const targetPath = path.join(extractPath, entry.entryName);
      
      if (!options?.overwrite) {
        try {
          await fs.access(targetPath);
          continue; // Skip if file exists
        } catch {
          // File doesn't exist, proceed
        }
      }

      if (entry.isDirectory) {
        await fs.mkdir(targetPath, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        zip.extractEntryTo(entry, path.dirname(targetPath), false, options?.overwrite);
        extractedFiles.push(targetPath);
        totalSize += entry.header.size;
      }
    }

    return { files: extractedFiles, size: totalSize };
  }

  private async extractTar(
    archivePath: string,
    extractPath: string,
    options?: { filter?: string; overwrite?: boolean }
  ): Promise<{ files: string[]; size: number }> {
    const extractedFiles: string[] = [];
    let totalSize = 0;

    await tar.extract({
      file: archivePath,
      cwd: extractPath,
      filter: options?.filter ? (path) => path.includes(options.filter!) : undefined,
      keep: !options?.overwrite,
      onentry: (entry) => {
        extractedFiles.push(entry.path);
        totalSize += entry.size;
      }
    });

    return { files: extractedFiles, size: totalSize };
  }

  private async getDirectorySize(dirPath: string): Promise<{ size: number; count: number }> {
    let size = 0;
    let count = 0;

    const files = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        const dirInfo = await this.getDirectorySize(filePath);
        size += dirInfo.size;
        count += dirInfo.count;
      } else {
        const stats = await fs.stat(filePath);
        size += stats.size;
        count++;
      }
    }

    return { size, count };
  }
}
