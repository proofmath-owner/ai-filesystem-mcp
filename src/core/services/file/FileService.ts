import * as fs from 'fs/promises';
import * as path from 'path';
import { IFileService } from '../../interfaces/IFileService.js';

export class FileService implements IFileService {
  async readFile(filePath: string): Promise<string> {
    try {
      const absolutePath = path.resolve(filePath);
      const content = await fs.readFile(absolutePath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  async readFiles(paths: string[]): Promise<Array<{ path: string; content?: string; error?: string }>> {
    const results = await Promise.all(
      paths.map(async (filePath) => {
        try {
          const content = await this.readFile(filePath);
          return { path: filePath, content };
        } catch (error) {
          return { 
            path: filePath, 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      })
    );
    return results;
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const absolutePath = path.resolve(filePath);
      const dir = path.dirname(absolutePath);
      
      // Create directory if it doesn't exist
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      await fs.writeFile(absolutePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error}`);
    }
  }

  async updateFile(filePath: string, updates: Array<{ oldText: string; newText: string }>): Promise<void> {
    try {
      let content = await this.readFile(filePath);
      
      for (const update of updates) {
        const oldContent = content;
        content = content.replace(update.oldText, update.newText);
        
        if (oldContent === content) {
          throw new Error(`Could not find text to replace: "${update.oldText}"`);
        }
      }
      
      await this.writeFile(filePath, content);
    } catch (error) {
      throw new Error(`Failed to update file ${filePath}: ${error}`);
    }
  }

  async moveFile(source: string, destination: string): Promise<void> {
    try {
      const sourcePath = path.resolve(source);
      const destPath = path.resolve(destination);
      
      // Create destination directory if needed
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });
      
      // Move file
      await fs.rename(sourcePath, destPath);
    } catch (error) {
      throw new Error(`Failed to move file from ${source} to ${destination}: ${error}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const absolutePath = path.resolve(filePath);
      await fs.unlink(absolutePath);
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error}`);
    }
  }

  async copyFile(source: string, destination: string): Promise<void> {
    try {
      const sourcePath = path.resolve(source);
      const destPath = path.resolve(destination);
      
      // Create destination directory if needed
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });
      
      // Copy file
      await fs.copyFile(sourcePath, destPath);
    } catch (error) {
      throw new Error(`Failed to copy file from ${source} to ${destination}: ${error}`);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const absolutePath = path.resolve(filePath);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  async getStats(filePath: string): Promise<any> {
    try {
      const absolutePath = path.resolve(filePath);
      const stats = await fs.stat(absolutePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        isSymbolicLink: stats.isSymbolicLink()
      };
    } catch (error) {
      throw new Error(`Failed to get stats for ${filePath}: ${error}`);
    }
  }

  async changePermissions(filePath: string, mode: string | number): Promise<void> {
    try {
      const absolutePath = path.resolve(filePath);
      const numericMode = typeof mode === 'string' ? parseInt(mode, 8) : mode;
      await fs.chmod(absolutePath, numericMode);
    } catch (error) {
      throw new Error(`Failed to change permissions for ${filePath}: ${error}`);
    }
  }

  async getMetadata(filePath: string): Promise<any> {
    try {
      const absolutePath = path.resolve(filePath);
      const stats = await fs.stat(absolutePath);
      return {
        path: absolutePath,
        name: path.basename(absolutePath),
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        isSymbolicLink: stats.isSymbolicLink(),
        permissions: stats.mode.toString(8),
        uid: stats.uid,
        gid: stats.gid
      };
    } catch (error) {
      throw new Error(`Failed to get metadata for ${filePath}: ${error}`);
    }
  }
}
