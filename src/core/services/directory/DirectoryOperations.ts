import * as fs from 'fs/promises';
import * as path from 'path';

export class DirectoryOperations {
  async createDirectory(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    await fs.mkdir(dirPath, { recursive: options?.recursive ?? true });
  }

  async removeDirectory(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    await fs.rm(dirPath, { recursive: options?.recursive ?? true, force: true });
  }

  async listDirectory(dirPath: string, options?: { detailed?: boolean; pattern?: string }): Promise<any[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    const results = [];
    for (const entry of entries) {
      if (options?.pattern) {
        // Simple pattern matching - could be enhanced with glob
        const regex = new RegExp(options.pattern.replace('*', '.*'));
        if (!regex.test(entry.name)) continue;
      }
      
      if (options?.detailed) {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);
        results.push({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime,
          created: stats.ctime
        });
      } else {
        results.push({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file'
        });
      }
    }
    
    return results;
  }

  async exists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async getStats(dirPath: string): Promise<any> {
    return fs.stat(dirPath);
  }

  async copyDirectory(source: string, destination: string): Promise<void> {
    await fs.cp(source, destination, { recursive: true });
  }

  async moveDirectory(source: string, destination: string): Promise<void> {
    await fs.rename(source, destination);
  }
}
