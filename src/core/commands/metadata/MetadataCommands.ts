import { Command, CommandContext, CommandResult } from '../Command.js';
import { FileSystemManager } from '../../FileSystemManager.js';

export class AnalyzeProjectCommand extends Command {
  readonly name = 'analyze_project';
  readonly description = 'Analyze project structure and dependencies';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      directory: { type: 'string' as const, description: 'Project directory to analyze' }
    },
    required: ['directory']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.directory, 'directory');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.analyzeProject(context.args.directory);
  }
}

export class GetFileMetadataCommand extends Command {
  readonly name = 'get_file_metadata';
  readonly description = 'Get detailed metadata about a file or directory';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: { type: 'string' as const, description: 'File or directory path' },
      includeHash: { type: 'boolean' as const, description: 'Include SHA256 hash (for files)' }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    if (args.includeHash !== undefined) {
      this.assertBoolean(args.includeHash, 'includeHash');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.getFileMetadata(context.args.path, context.args.includeHash);
  }
}

export class GetDirectoryTreeCommand extends Command {
  readonly name = 'get_directory_tree';
  readonly description = 'Get a tree structure of a directory';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: { type: 'string' as const, description: 'Directory path' },
      maxDepth: { type: 'number' as const, description: 'Maximum depth to traverse' }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    if (args.maxDepth !== undefined) {
      this.assertNumber(args.maxDepth, 'maxDepth');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.getDirectoryTree(context.args.path, context.args.maxDepth);
  }
}

export class CompareFilesCommand extends Command {
  readonly name = 'compare_files';
  readonly description = 'Compare two files to check if they are identical';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      file1: { type: 'string' as const, description: 'First file path' },
      file2: { type: 'string' as const, description: 'Second file path' }
    },
    required: ['file1', 'file2']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.file1, 'file1');
    this.assertString(args.file2, 'file2');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.compareFiles(context.args.file1, context.args.file2);
  }
}

export class FindDuplicateFilesCommand extends Command {
  readonly name = 'find_duplicate_files';
  readonly description = 'Find duplicate files in a directory';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      directory: { type: 'string' as const, description: 'Directory to search for duplicates' }
    },
    required: ['directory']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.directory, 'directory');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.findDuplicateFiles(context.args.directory);
  }
}

export class CreateSymlinkCommand extends Command {
  readonly name = 'create_symlink';
  readonly description = 'Create a symbolic link';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      target: { type: 'string' as const, description: 'Target path' },
      linkPath: { type: 'string' as const, description: 'Symbolic link path' }
    },
    required: ['target', 'linkPath']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.target, 'target');
    this.assertString(args.linkPath, 'linkPath');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.createSymlink(context.args.target, context.args.linkPath);
  }
}

export class DiffFilesCommand extends Command {
  readonly name = 'diff_files';
  readonly description = 'Compare two files and show differences';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      file1: { type: 'string' as const, description: 'First file path' },
      file2: { type: 'string' as const, description: 'Second file path' },
      format: { 
        type: 'string' as const, 
        enum: ['unified', 'side-by-side', 'inline'],
        description: 'Diff output format' 
      }
    },
    required: ['file1', 'file2']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.file1, 'file1');
    this.assertString(args.file2, 'file2');
    if (args.format !== undefined) {
      this.assertString(args.format, 'format');
      if (!['unified', 'side-by-side', 'inline'].includes(args.format)) {
        throw new Error(`Invalid format: ${args.format}. Must be one of: unified, side-by-side, inline`);
      }
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.diffFiles(context.args.file1, context.args.file2, context.args.format);
  }
}
