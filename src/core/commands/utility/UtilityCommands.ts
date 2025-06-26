import { Command, CommandContext, CommandResult } from '../Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Touch Command
 * 파일을 생성하거나 타임스탬프를 업데이트합니다.
 */
export class TouchCommand extends Command {
  readonly name = 'touch';
  readonly description = 'Create an empty file or update timestamps';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'File path' 
      },
      createOnly: {
        type: 'boolean',
        description: 'Only create if file does not exist',
        default: false
      }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    if (args.createOnly !== undefined) {
      this.assertBoolean(args.createOnly, 'createOnly');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path, createOnly = false } = context.args;
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    
    try {
      const absolutePath = pathModule.resolve(path);
      
      try {
        await fs.access(absolutePath);
        // File exists
        if (!createOnly) {
          const now = new Date();
          await fs.utimes(absolutePath, now, now);
          return {
            content: [{
              type: 'text',
              text: `Updated timestamps for: ${path}`
            }]
          };
        } else {
          return {
            content: [{
              type: 'text',
              text: `File already exists: ${path}`
            }]
          };
        }
      } catch {
        // File doesn't exist, create it
        const dir = pathModule.dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(absolutePath, '');
        return {
          content: [{
            type: 'text',
            text: `Created empty file: ${path}`
          }]
        };
      }
    } catch (error) {
      throw new Error(`Failed to touch file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Copy File Command
 * 단일 파일을 복사합니다.
 */
export class CopyFileCommand extends Command {
  readonly name = 'copy_file';
  readonly description = 'Copy a single file';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      source: { 
        type: 'string', 
        description: 'Source file path' 
      },
      destination: { 
        type: 'string', 
        description: 'Destination file path' 
      },
      overwrite: {
        type: 'boolean',
        description: 'Overwrite if destination exists',
        default: false
      }
    },
    required: ['source', 'destination']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.source, 'source');
    this.assertString(args.destination, 'destination');
    if (args.overwrite !== undefined) {
      this.assertBoolean(args.overwrite, 'overwrite');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { source, destination, overwrite = false } = context.args;
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    
    try {
      const absoluteSource = pathModule.resolve(source);
      const absoluteDestination = pathModule.resolve(destination);
      
      // Check if destination exists
      if (!overwrite) {
        try {
          await fs.access(absoluteDestination);
          throw new Error('Destination file already exists. Use overwrite: true to replace.');
        } catch (e: any) {
          if (e.code !== 'ENOENT') throw e;
        }
      }
      
      // Create destination directory if needed
      const destDir = pathModule.dirname(absoluteDestination);
      await fs.mkdir(destDir, { recursive: true });
      
      // Copy file
      await fs.copyFile(absoluteSource, absoluteDestination);
      
      return {
        content: [{
          type: 'text',
          text: `Successfully copied: ${source} -> ${destination}`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to copy file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Delete Files Command
 * 여러 파일을 한번에 삭제합니다.
 */
export class DeleteFilesCommand extends Command {
  readonly name = 'delete_files';
  readonly description = 'Delete multiple files';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      paths: { 
        type: 'array',
        items: { type: 'string' },
        description: 'Array of file paths to delete' 
      },
      force: {
        type: 'boolean',
        description: 'Force deletion without confirmation',
        default: false
      }
    },
    required: ['paths']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertArray(args.paths, 'paths');
    args.paths.forEach((path: any, index: number) => {
      if (typeof path !== 'string') {
        throw new Error(`Invalid path at index ${index}: expected string`);
      }
    });
    if (args.force !== undefined) {
      this.assertBoolean(args.force, 'force');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { paths, force = false } = context.args;
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    
    const results = {
      deleted: [] as string[],
      failed: [] as { path: string; error: string }[]
    };
    
    for (const path of paths) {
      try {
        const absolutePath = pathModule.resolve(path);
        
        // Safety check
        const dangerousPaths = ['/bin', '/usr', '/etc', '/System', '/Windows'];
        if (!force && dangerousPaths.some(dp => absolutePath.startsWith(dp))) {
          results.failed.push({ 
            path, 
            error: 'Cannot delete system files without force flag' 
          });
          continue;
        }
        
        await fs.unlink(absolutePath);
        results.deleted.push(path);
      } catch (error) {
        results.failed.push({ 
          path, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    
    let resultText = `Deletion complete:\n`;
    resultText += `✅ Deleted: ${results.deleted.length} files\n`;
    if (results.deleted.length > 0) {
      resultText += results.deleted.map(p => `  - ${p}`).join('\n') + '\n';
    }
    
    if (results.failed.length > 0) {
      resultText += `\n❌ Failed: ${results.failed.length} files\n`;
      resultText += results.failed.map(f => `  - ${f.path}: ${f.error}`).join('\n');
    }
    
    return {
      content: [{
        type: 'text',
        text: resultText
      }]
    };
  }
}

/**
 * Get Working Directory Command
 * 현재 작업 디렉토리를 가져옵니다.
 */
export class GetWorkingDirectoryCommand extends Command {
  readonly name = 'pwd';
  readonly description = 'Get current working directory';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {}
  };

  protected validateArgs(args: Record<string, any>): void {
    // No arguments to validate
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const cwd = process.cwd();
      return {
        content: [{
          type: 'text',
          text: `Current working directory: ${cwd}`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to get working directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Disk Usage Command
 * 디스크 사용량을 확인합니다.
 */
export class DiskUsageCommand extends Command {
  readonly name = 'disk_usage';
  readonly description = 'Get disk usage information';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'Path to check disk usage for',
        default: '.'
      },
      humanReadable: {
        type: 'boolean',
        description: 'Show sizes in human readable format',
        default: true
      }
    }
  };

  protected validateArgs(args: Record<string, any>): void {
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
    if (args.humanReadable !== undefined) {
      this.assertBoolean(args.humanReadable, 'humanReadable');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path = '.', humanReadable = true } = context.args;
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    
    const formatBytes = (bytes: number): string => {
      if (!humanReadable) return bytes.toString();
      
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let size = bytes;
      let unitIndex = 0;
      
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      
      return `${size.toFixed(2)} ${units[unitIndex]}`;
    };
    
    const calculateSize = async (dirPath: string): Promise<number> => {
      let totalSize = 0;
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = pathModule.join(dirPath, entry.name);
        
        try {
          if (entry.isDirectory()) {
            totalSize += await calculateSize(fullPath);
          } else {
            const stats = await fs.stat(fullPath);
            totalSize += stats.size;
          }
        } catch (error) {
          // Skip files we can't access
        }
      }
      
      return totalSize;
    };
    
    try {
      const absolutePath = pathModule.resolve(path);
      const stats = await fs.stat(absolutePath);
      
      if (stats.isDirectory()) {
        const size = await calculateSize(absolutePath);
        return {
          content: [{
            type: 'text',
            text: `Disk usage for ${path}: ${formatBytes(size)}`
          }]
        };
      } else {
        return {
          content: [{
            type: 'text',
            text: `File size of ${path}: ${formatBytes(stats.size)}`
          }]
        };
      }
    } catch (error) {
      throw new Error(`Failed to get disk usage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Watch Directory Command
 * 디렉토리 변경사항을 실시간으로 감시합니다.
 */
export class WatchDirectoryCommand extends Command {
  readonly name = 'watch_directory';
  readonly description = 'Watch directory for changes';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'Directory path to watch' 
      },
      recursive: {
        type: 'boolean',
        description: 'Watch subdirectories recursively',
        default: true
      },
      events: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['add', 'change', 'unlink', 'addDir', 'unlinkDir']
        },
        description: 'Events to watch for',
        default: ['add', 'change', 'unlink']
      }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    if (args.recursive !== undefined) {
      this.assertBoolean(args.recursive, 'recursive');
    }
    if (args.events !== undefined) {
      this.assertArray(args.events, 'events');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path, recursive = true, events = ['add', 'change', 'unlink'] } = context.args;
    
    // Delegate to the existing file watcher system
    return await context.fsManager.startWatching(path, {
      persistent: true,
      recursive,
      ignoreInitial: true,
      events
    });
  }
}
