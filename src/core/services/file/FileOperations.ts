import * as fs from 'fs/promises';
import * as path from 'path';

export class FileOperations {
  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async updateFile(filePath: string, updates: Array<{ oldText: string; newText: string }>): Promise<void> {
    let content = await this.readFile(filePath);
    
    for (const update of updates) {
      content = content.replace(update.oldText, update.newText);
    }
    
    await this.writeFile(filePath, content);
  }

  async moveFile(source: string, destination: string): Promise<void> {
    await fs.rename(source, destination);
  }

  async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  async copyFile(source: string, destination: string): Promise<void> {
    await fs.copyFile(source, destination);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getStats(filePath: string): Promise<any> {
    return fs.stat(filePath);
  }

  async changePermissions(filePath: string, mode: number): Promise<void> {
    await fs.chmod(filePath, mode);
  }

  async readDir(dirPath: string): Promise<any[]> {
    return fs.readdir(dirPath, { withFileTypes: true });
  }
}
