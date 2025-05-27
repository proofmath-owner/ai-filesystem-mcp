import { promises as fs } from 'fs';
import * as path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';
// @ts-ignore - archiver types may not be perfect
import archiver from 'archiver';
// @ts-ignore - extract-zip types may not be perfect  
import extract from 'extract-zip';
import tar from 'tar';

interface CompressionResult {
  size: number;
  compressed: number;
  ratio: number;
  format: string;
}

interface ExtractionResult {
  files: string[];
  size: number;
}

export class CompressionManager {
  async compressFiles(
    files: string[], 
    outputPath: string, 
    format: 'zip' | 'tar' | 'tar.gz' = 'zip'
  ): Promise<CompressionResult> {
    let totalSize = 0;
    
    // Calculate total size
    for (const file of files) {
      const stat = await fs.stat(file);
      if (stat.isFile()) {
        totalSize += stat.size;
      }
    }
    
    switch (format) {
      case 'zip':
        await this.createZip(files, outputPath);
        break;
      case 'tar':
        await this.createTar(files, outputPath);
        break;
      case 'tar.gz':
        await this.createTarGz(files, outputPath);
        break;
    }
    
    const compressedStat = await fs.stat(outputPath);
    const compressedSize = compressedStat.size;
    
    return {
      size: totalSize,
      compressed: compressedSize,
      ratio: totalSize > 0 ? compressedSize / totalSize : 0,
      format
    };
  }

  private async createZip(files: string[], outputPath: string): Promise<void> {
    // Note: In a real implementation, you'd use a proper zip library
    // For now, this is a simplified version
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    return new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      
      archive.pipe(output);
      
      for (const file of files) {
        const name = path.basename(file);
        archive.file(file, { name });
      }
      
      archive.finalize();
    });
  }

  private async createTar(files: string[], outputPath: string): Promise<void> {
    await tar.create({
      file: outputPath,
      cwd: process.cwd()
    }, files);
  }

  private async createTarGz(files: string[], outputPath: string): Promise<void> {
    await tar.create({
      file: outputPath,
      gzip: true,
      cwd: process.cwd()
    }, files);
  }

  async extractArchive(archivePath: string, destination: string): Promise<ExtractionResult> {
    await fs.mkdir(destination, { recursive: true });
    
    // Ensure absolute path for extract-zip
    const absoluteDestination = path.resolve(destination);
    
    const format = this.detectFormat(archivePath);
    let files: string[] = [];
    
    switch (format) {
      case 'zip':
        await extract(archivePath, { dir: absoluteDestination });
        files = await this.listExtractedFiles(absoluteDestination);
        break;
      case 'tar':
      case 'tar.gz':
        await tar.extract({
          file: archivePath,
          cwd: absoluteDestination
        });
        files = await this.listExtractedFiles(absoluteDestination);
        break;
      default:
        throw new Error(`Unsupported archive format: ${format}`);
    }
    
    // Calculate total size
    let totalSize = 0;
    for (const file of files) {
      const stat = await fs.stat(path.join(absoluteDestination, file));
      if (stat.isFile()) {
        totalSize += stat.size;
      }
    }
    
    return {
      files,
      size: totalSize
    };
  }

  private detectFormat(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.zip') return 'zip';
    if (ext === '.tar') return 'tar';
    if (filePath.endsWith('.tar.gz') || ext === '.tgz') return 'tar.gz';
    return 'unknown';
  }

  private async listExtractedFiles(directory: string): Promise<string[]> {
    const files: string[] = [];
    
    async function walk(dir: string, base: string = '') {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(base, entry.name);
        
        if (entry.isDirectory()) {
          await walk(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    }
    
    await walk(directory);
    return files;
  }

  async compressFile(filePath: string): Promise<string> {
    const outputPath = `${filePath}.gz`;
    
    await pipeline(
      createReadStream(filePath),
      createGzip(),
      createWriteStream(outputPath)
    );
    
    return outputPath;
  }

  async decompressFile(filePath: string): Promise<string> {
    const outputPath = filePath.replace(/\.gz$/, '');
    
    await pipeline(
      createReadStream(filePath),
      createGunzip(),
      createWriteStream(outputPath)
    );
    
    return outputPath;
  }
}
