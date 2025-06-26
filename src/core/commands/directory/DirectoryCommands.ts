import { Command, CommandContext, CommandResult } from '../Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Create Directory Command
 * 디렉토리를 생성합니다.
 */
export class CreateDirectoryCommand extends Command {
  readonly name = 'create_directory';
  readonly description = 'Create a new directory';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'Directory path to create' 
      },
      recursive: {
        type: 'boolean',
        description: 'Create parent directories if they do not exist',
        default: true
      }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    if (args.recursive !== undefined) {
      this.assertBoolean(args.recursive, 'recursive');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path, recursive = true } = context.args;
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    
    try {
      const absolutePath = pathModule.resolve(path);
      await fs.mkdir(absolutePath, { recursive });
      
      return {
        content: [{
          type: 'text',
          text: `Successfully created directory: ${path}`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to create directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Remove Directory Command
 * 디렉토리를 삭제합니다.
 */
export class RemoveDirectoryCommand extends Command {
  readonly name = 'remove_directory';
  readonly description = 'Remove a directory';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'Directory path to remove' 
      },
      recursive: {
        type: 'boolean',
        description: 'Remove directory and all its contents',
        default: false
      },
      force: {
        type: 'boolean',
        description: 'Force removal even if not empty',
        default: false
      }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    if (args.recursive !== undefined) {
      this.assertBoolean(args.recursive, 'recursive');
    }
    if (args.force !== undefined) {
      this.assertBoolean(args.force, 'force');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path, recursive = false, force = false } = context.args;
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    
    try {
      const absolutePath = pathModule.resolve(path);
      
      // 안전성 검사
      const dangerousPaths = ['/bin', '/usr', '/etc', '/System', '/Windows', '/Program Files'];
      if (dangerousPaths.some(dp => absolutePath.startsWith(dp))) {
        throw new Error('Cannot remove system directories');
      }
      
      if (recursive || force) {
        await fs.rm(absolutePath, { recursive: true, force: true });
      } else {
        await fs.rmdir(absolutePath);
      }
      
      return {
        content: [{
          type: 'text',
          text: `Successfully removed directory: ${path}`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to remove directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * List Directory Command
 * 디렉토리 내용을 나열합니다.
 */
export class ListDirectoryCommand extends Command {
  readonly name = 'list_directory';
  readonly description = 'List directory contents';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'Directory path to list' 
      },
      detailed: {
        type: 'boolean',
        description: 'Show detailed information (size, permissions, dates)',
        default: false
      },
      hidden: {
        type: 'boolean',
        description: 'Show hidden files (starting with .)',
        default: false
      },
      sortBy: {
        type: 'string',
        enum: ['name', 'size', 'date', 'extension'],
        description: 'Sort files by',
        default: 'name'
      }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    if (args.detailed !== undefined) {
      this.assertBoolean(args.detailed, 'detailed');
    }
    if (args.hidden !== undefined) {
      this.assertBoolean(args.hidden, 'hidden');
    }
    if (args.sortBy !== undefined) {
      const validSorts = ['name', 'size', 'date', 'extension'];
      if (!validSorts.includes(args.sortBy)) {
        throw new Error(`Invalid sortBy value. Must be one of: ${validSorts.join(', ')}`);
      }
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path, detailed = false, hidden = false, sortBy = 'name' } = context.args;
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    
    try {
      const absolutePath = pathModule.resolve(path);
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      
      // 필터링
      let filtered = entries;
      if (!hidden) {
        filtered = entries.filter(entry => !entry.name.startsWith('.'));
      }
      
      // 상세 정보 수집
      const items = await Promise.all(filtered.map(async entry => {
        const fullPath = pathModule.join(absolutePath, entry.name);
        const stats = await fs.stat(fullPath);
        
        return {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other',
          size: stats.size,
          modified: stats.mtime,
          permissions: stats.mode.toString(8).slice(-3),
          extension: entry.isFile() ? pathModule.extname(entry.name) : ''
        };
      }));
      
      // 정렬
      items.sort((a, b) => {
        switch (sortBy) {
          case 'size':
            return b.size - a.size;
          case 'date':
            return b.modified.getTime() - a.modified.getTime();
          case 'extension':
            return a.extension.localeCompare(b.extension);
          default:
            return a.name.localeCompare(b.name);
        }
      });
      
      // 포맷팅
      let result = `Directory: ${path}\n`;
      result += `Total items: ${items.length}\n\n`;
      
      if (detailed) {
        result += 'Type  Permissions  Size        Modified              Name\n';
        result += '----  -----------  ----------  -------------------  ----\n';
        items.forEach(item => {
          const type = item.type === 'directory' ? 'DIR ' : 'FILE';
          const size = item.size.toString().padStart(10);
          const date = item.modified.toISOString().slice(0, 19);
          result += `${type}  ${item.permissions}        ${size}  ${date}  ${item.name}\n`;
        });
      } else {
        const dirs = items.filter(i => i.type === 'directory');
        const files = items.filter(i => i.type === 'file');
        
        if (dirs.length > 0) {
          result += 'Directories:\n';
          dirs.forEach(d => result += `  📁 ${d.name}/\n`);
          result += '\n';
        }
        
        if (files.length > 0) {
          result += 'Files:\n';
          files.forEach(f => result += `  📄 ${f.name}\n`);
        }
      }
      
      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Copy Directory Command
 * 디렉토리를 복사합니다.
 */
export class CopyDirectoryCommand extends Command {
  readonly name = 'copy_directory';
  readonly description = 'Copy a directory recursively';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      source: { 
        type: 'string', 
        description: 'Source directory path' 
      },
      destination: { 
        type: 'string', 
        description: 'Destination directory path' 
      },
      overwrite: {
        type: 'boolean',
        description: 'Overwrite existing files',
        default: false
      },
      preserveTimestamps: {
        type: 'boolean',
        description: 'Preserve file timestamps',
        default: true
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
    if (args.preserveTimestamps !== undefined) {
      this.assertBoolean(args.preserveTimestamps, 'preserveTimestamps');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { source, destination, overwrite = false, preserveTimestamps = true } = context.args;
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    
    const copyRecursive = async (src: string, dest: string): Promise<number> => {
      let fileCount = 0;
      const entries = await fs.readdir(src, { withFileTypes: true });
      
      await fs.mkdir(dest, { recursive: true });
      
      for (const entry of entries) {
        const srcPath = pathModule.join(src, entry.name);
        const destPath = pathModule.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          fileCount += await copyRecursive(srcPath, destPath);
        } else {
          try {
            if (!overwrite) {
              await fs.access(destPath);
              continue; // Skip if exists and overwrite is false
            }
          } catch {
            // File doesn't exist, proceed with copy
          }
          
          await fs.copyFile(srcPath, destPath);
          
          if (preserveTimestamps) {
            const stats = await fs.stat(srcPath);
            await fs.utimes(destPath, stats.atime, stats.mtime);
          }
          
          fileCount++;
        }
      }
      
      return fileCount;
    };
    
    try {
      const absoluteSource = pathModule.resolve(source);
      const absoluteDestination = pathModule.resolve(destination);
      
      const fileCount = await copyRecursive(absoluteSource, absoluteDestination);
      
      return {
        content: [{
          type: 'text',
          text: `Successfully copied directory: ${source} -> ${destination}\nCopied ${fileCount} files`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to copy directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Move Directory Command
 * 디렉토리를 이동합니다.
 */
export class MoveDirectoryCommand extends Command {
  readonly name = 'move_directory';
  readonly description = 'Move or rename a directory';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      source: { 
        type: 'string', 
        description: 'Source directory path' 
      },
      destination: { 
        type: 'string', 
        description: 'Destination directory path' 
      }
    },
    required: ['source', 'destination']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.source, 'source');
    this.assertString(args.destination, 'destination');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { source, destination } = context.args;
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    
    try {
      const absoluteSource = pathModule.resolve(source);
      const absoluteDestination = pathModule.resolve(destination);
      
      // 대상이 소스의 하위 디렉토리인지 확인
      if (absoluteDestination.startsWith(absoluteSource + pathModule.sep)) {
        throw new Error('Cannot move directory into itself');
      }
      
      await fs.rename(absoluteSource, absoluteDestination);
      
      return {
        content: [{
          type: 'text',
          text: `Successfully moved directory: ${source} -> ${destination}`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to move directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
