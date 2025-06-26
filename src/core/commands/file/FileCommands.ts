import { Command, CommandContext, CommandResult } from '../Command.js';
import { FileSystemManager } from '../../FileSystemManager.js';

export class ReadFileCommand extends Command {
  readonly name = 'read_file';
  readonly description = 'Read the contents of a file (with intelligent caching)';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: { type: 'string' as const, description: 'File path to read' }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.readFile(context.args.path);
  }
}

export class ReadFilesCommand extends Command {
  readonly name = 'read_files';
  readonly description = 'Read multiple files at once';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      paths: { 
        type: 'array' as const, 
        items: { type: 'string' as const },
        description: 'Array of file paths to read' 
      }
    },
    required: ['paths']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertArray(args.paths, 'paths');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.readFiles(context.args.paths);
  }
}

export class WriteFileCommand extends Command {
  readonly name = 'write_file';
  readonly description = 'Write content to a file';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: { type: 'string' as const, description: 'File path to write' },
      content: { type: 'string' as const, description: 'Content to write' }
    },
    required: ['path', 'content']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    this.assertString(args.content, 'content');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.writeFile(context.args.path, context.args.content);
  }
}

export class UpdateFileCommand extends Command {
  readonly name = 'update_file';
  readonly description = 'Update specific parts of a file';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: { type: 'string' as const, description: 'File path to update' },
      updates: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            oldText: { type: 'string' as const, description: 'Text to find' },
            newText: { type: 'string' as const, description: 'Text to replace with' }
          },
          required: ['oldText', 'newText']
        }
      }
    },
    required: ['path', 'updates']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    this.assertArray(args.updates, 'updates');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.updateFile(context.args.path, context.args.updates);
  }
}

export class MoveFileCommand extends Command {
  readonly name = 'move_file';
  readonly description = 'Move or rename a file';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      source: { type: 'string' as const, description: 'Source file path' },
      destination: { type: 'string' as const, description: 'Destination file path' }
    },
    required: ['source', 'destination']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.source, 'source');
    this.assertString(args.destination, 'destination');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.moveFile(context.args.source, context.args.destination);
  }
}
