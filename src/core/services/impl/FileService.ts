import { promises as fs, Stats } from 'fs';
import * as path from 'path';
import { IFileService, UpdateOperation, FileMetadata } from '../interfaces/IFileService.js';
import { CommandResult } from '../../commands/Command.js';
import { CacheManager } from '../../CacheManager.js';
import { FileUtils } from '../../FileUtils.js';
import { DiffManager } from '../../DiffManager.js';
import { MonitoringManager } from '../../MonitoringManager.js';
import { ErrorHandlingManager } from '../../ErrorHandlingManager.js';

export class FileService implements IFileService {
  constructor(
    private cacheManager: CacheManager,
    private fileUtils: FileUtils,
    private diffManager: DiffManager,
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

  async readFile(filePath: string): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const absolutePath = path.resolve(filePath);
      
      // Check cache
      const cached = await this.cacheManager.get(absolutePath);
      if (cached) {
        await this.monitoringManager.logOperation({
          type: 'read',
          path: absolutePath,
          success: true,
          metadata: { duration: Date.now() - startTime, size: Buffer.byteLength(cached) }
        });
        
        return {
          content: [{ type: 'text', text: cached }]
        };
      }
      
      // Read file
      const content = await fs.readFile(absolutePath, 'utf-8');
      
      // Cache result
      await this.cacheManager.set(absolutePath, content);
      
      await this.monitoringManager.logOperation({
        type: 'read',
        path: absolutePath,
        success: true,
        metadata: { duration: Date.now() - startTime, size: Buffer.byteLength(content) }
      });
      
      return {
        content: [{ type: 'text', text: content }]
      };
    } catch (error) {
      await this.monitoringManager.logOperation({
        type: 'read',
        path: filePath,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { duration: Date.now() - startTime }
      });
      
      return this.handleError(error, 'read', filePath);
    }
  }

  async readFiles(paths: string[]): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const results = await Promise.all(
        paths.map(async (filePath) => {
          try {
            const result = await this.readFile(filePath);
            return {
              path: filePath,
              content: result.content[0].text,
              success: true
            };
          } catch (error) {
            return {
              path: filePath,
              error: error instanceof Error ? error.message : 'Unknown error',
              success: false
            };
          }
        })
      );
      
      await this.monitoringManager.logOperation({
        type: 'read',
        path: paths.join(', '),
        success: true,
        metadata: { duration: Date.now() - startTime, size: 0 }
      });
      
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
      };
    } catch (error) {
      return this.handleError(error, 'read_multiple', paths.join(', '));
    }
  }

  async writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const absolutePath = path.resolve(filePath);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      
      // Write file
      await fs.writeFile(absolutePath, content, encoding);
      
      // Invalidate cache
      await this.cacheManager.invalidate(absolutePath);
      
      await this.monitoringManager.logOperation({
        type: 'write',
        path: absolutePath,
        success: true,
        metadata: { duration: Date.now() - startTime, size: Buffer.byteLength(content) }
      });
      
      return {
        content: [{ type: 'text', text: `File written successfully: ${absolutePath}` }]
      };
    } catch (error) {
      await this.monitoringManager.logOperation({
        type: 'write',
        path: filePath,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { duration: Date.now() - startTime }
      });
      
      return this.handleError(error, 'write', filePath);
    }
  }

  async updateFile(filePath: string, updates: UpdateOperation[]): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const absolutePath = path.resolve(filePath);
      
      // Read current content
      let content = await fs.readFile(absolutePath, 'utf-8');
      
      // Apply updates
      for (const update of updates) {
        content = content.replace(update.oldText, update.newText);
      }
      
      // Write updated content
      await fs.writeFile(absolutePath, content);
      
      // Invalidate cache
      await this.cacheManager.invalidate(absolutePath);
      
      await this.monitoringManager.logOperation({
        type: 'write',
        path: absolutePath,
        success: true,
        metadata: { duration: Date.now() - startTime }
      });
      
      return {
        content: [{ type: 'text', text: `File updated successfully: ${absolutePath}` }]
      };
    } catch (error) {
      return this.handleError(error, 'update', filePath);
    }
  }

  async moveFile(source: string, destination: string): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const sourcePath = path.resolve(source);
      const destPath = path.resolve(destination);
      
      // Ensure destination directory exists
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      
      // Move file
      await fs.rename(sourcePath, destPath);
      
      // Invalidate cache for both paths
      await this.cacheManager.invalidate(sourcePath);
      await this.cacheManager.invalidate(destPath);
      
      await this.monitoringManager.logOperation({
        type: 'move',
        path: sourcePath,
        success: true,
        metadata: { duration: Date.now() - startTime }
      });
      
      return {
        content: [{ type: 'text', text: `File moved from ${sourcePath} to ${destPath}` }]
      };
    } catch (error) {
      return this.handleError(error, 'move', source);
    }
  }

  async getFileMetadata(filePath: string): Promise<CommandResult> {
    try {
      const absolutePath = path.resolve(filePath);
      const stats: Stats = await fs.stat(absolutePath);
      
      const metadata: FileMetadata = {
        path: absolutePath,
        size: stats.size,
        mode: stats.mode,
        modifiedTime: stats.mtime,
        createdTime: stats.birthtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        isSymbolicLink: stats.isSymbolicLink()
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(metadata, null, 2) }]
      };
    } catch (error) {
      return this.handleError(error, 'stat', filePath);
    }
  }

  async getDirectoryTree(dirPath: string, maxDepth: number = 5): Promise<CommandResult> {
    try {
      const tree = await this.fileUtils.createDirectoryTree(dirPath, maxDepth);
      return {
        content: [{ type: 'text', text: JSON.stringify(tree, null, 2) }]
      };
    } catch (error) {
      return this.handleError(error, 'readdir', dirPath);
    }
  }

  async createSymlink(target: string, linkPath: string): Promise<CommandResult> {
    try {
      const absoluteTarget = path.resolve(target);
      const absoluteLink = path.resolve(linkPath);
      
      await fs.symlink(absoluteTarget, absoluteLink);
      
      return {
        content: [{ type: 'text', text: `Symlink created: ${absoluteLink} -> ${absoluteTarget}` }]
      };
    } catch (error) {
      return this.handleError(error, 'symlink', linkPath);
    }
  }

  async compareFiles(file1: string, file2: string): Promise<CommandResult> {
    try {
      const isIdentical = await this.fileUtils.compareFiles(file1, file2);
      return {
        content: [{ 
          type: 'text', 
          text: isIdentical ? 'Files are identical' : 'Files are different'
        }]
      };
    } catch (error) {
      return this.handleError(error, 'compare', `${file1} vs ${file2}`);
    }
  }

  async findDuplicateFiles(directory: string): Promise<CommandResult> {
    try {
      const duplicates = await this.fileUtils.findDuplicates(directory);
      return {
        content: [{ type: 'text', text: JSON.stringify(duplicates, null, 2) }]
      };
    } catch (error) {
      return this.handleError(error, 'find_duplicates', directory);
    }
  }

  async diffFiles(file1: string, file2: string): Promise<CommandResult> {
    try {
      const content1 = await fs.readFile(path.resolve(file1), 'utf-8');
      const content2 = await fs.readFile(path.resolve(file2), 'utf-8');
      
      const diffResult = this.diffManager.diff(content1, content2);
      const diff = diffResult.formatted;
      
      return {
        content: [{ type: 'text', text: diff }]
      };
    } catch (error) {
      return this.handleError(error, 'diff', `${file1} vs ${file2}`);
    }
  }
}