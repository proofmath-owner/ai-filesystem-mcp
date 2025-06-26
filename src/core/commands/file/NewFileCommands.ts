import { Command, CommandContext, CommandResult } from '../Command.js';
import { ServiceManager } from '../../services/ServiceManager.js';
import { IFileService } from '../../services/interfaces/IFileService.js';

export class NewReadFileCommand extends Command {
  readonly name = 'read_file_v2';
  readonly description = 'Read the contents of a file (using new service architecture)';
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
    if (context.serviceManager) {
      // Use new service architecture
      const serviceManager = context.serviceManager as ServiceManager;
      const fileService = serviceManager.get<IFileService>('fileService');
      return await fileService.readFile(context.args.path);
    } else {
      // Fallback to old architecture
      const fsManager = context.fsManager;
      return await fsManager.readFile(context.args.path);
    }
  }
}

export class NewWriteFileCommand extends Command {
  readonly name = 'write_file_v2';
  readonly description = 'Write content to a file (using new service architecture)';
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
    if (context.serviceManager) {
      // Use new service architecture
      const serviceManager = context.serviceManager as ServiceManager;
      const fileService = serviceManager.get<IFileService>('fileService');
      return await fileService.writeFile(context.args.path, context.args.content);
    } else {
      // Fallback to old architecture
      const fsManager = context.fsManager;
      return await fsManager.writeFile(context.args.path, context.args.content);
    }
  }
}

export class NewReadFilesCommand extends Command {
  readonly name = 'read_files_v2';
  readonly description = 'Read multiple files at once (using new service architecture)';
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
    if (context.serviceManager) {
      // Use new service architecture
      const serviceManager = context.serviceManager as ServiceManager;
      const fileService = serviceManager.get<IFileService>('fileService');
      return await fileService.readFiles(context.args.paths);
    } else {
      // Fallback to old architecture
      const fsManager = context.fsManager;
      return await fsManager.readFiles(context.args.paths);
    }
  }
}