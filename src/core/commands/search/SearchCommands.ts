import { Command, CommandContext, CommandResult } from '../Command.js';
import { FileSystemManager } from '../../FileSystemManager.js';

export class SearchFilesCommand extends Command {
  readonly name = 'search_files';
  readonly description = 'Search for files matching a pattern';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      pattern: { type: 'string' as const, description: 'Glob pattern to search' },
      directory: { type: 'string' as const, description: 'Base directory to search in' }
    },
    required: ['pattern']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.pattern, 'pattern');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.searchFiles(context.args.pattern, context.args.directory);
  }
}

export class SearchContentCommand extends Command {
  readonly name = 'search_content';
  readonly description = 'Search for content within files';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      pattern: { type: 'string' as const, description: 'Text or regex pattern to search' },
      directory: { type: 'string' as const, description: 'Directory to search in' },
      filePattern: { type: 'string' as const, description: 'File pattern to include (e.g., *.ts)' }
    },
    required: ['pattern', 'directory']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.pattern, 'pattern');
    this.assertString(args.directory, 'directory');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.searchContent(
      context.args.pattern, 
      context.args.directory, 
      context.args.filePattern
    );
  }
}

export class SearchByDateCommand extends Command {
  readonly name = 'search_by_date';
  readonly description = 'Search files by creation or modification date';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      directory: { type: 'string' as const, description: 'Directory to search' },
      after: { type: 'string' as const, description: 'After date (ISO format)' },
      before: { type: 'string' as const, description: 'Before date (ISO format)' }
    },
    required: ['directory']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.directory, 'directory');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    const after = context.args.after ? new Date(context.args.after) : undefined;
    const before = context.args.before ? new Date(context.args.before) : undefined;
    return await fsManager.searchByDate(context.args.directory, after, before);
  }
}

export class SearchBySizeCommand extends Command {
  readonly name = 'search_by_size';
  readonly description = 'Search files by size';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      directory: { type: 'string' as const, description: 'Directory to search' },
      min: { type: 'number' as const, description: 'Minimum size in bytes' },
      max: { type: 'number' as const, description: 'Maximum size in bytes' }
    },
    required: ['directory']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.directory, 'directory');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.searchBySize(
      context.args.directory, 
      context.args.min, 
      context.args.max
    );
  }
}

export class FuzzySearchCommand extends Command {
  readonly name = 'fuzzy_search';
  readonly description = 'Search for files with similar names (fuzzy matching)';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      pattern: { type: 'string' as const, description: 'Search pattern' },
      directory: { type: 'string' as const, description: 'Directory to search' },
      threshold: { type: 'number' as const, description: 'Similarity threshold (0-1)' }
    },
    required: ['pattern', 'directory']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.pattern, 'pattern');
    this.assertString(args.directory, 'directory');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.fuzzySearch(
      context.args.pattern, 
      context.args.directory, 
      context.args.threshold
    );
  }
}

export class SemanticSearchCommand extends Command {
  readonly name = 'semantic_search';
  readonly description = 'Search files using natural language query';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      query: { type: 'string' as const, description: 'Natural language search query' },
      directory: { type: 'string' as const, description: 'Directory to search' }
    },
    required: ['query', 'directory']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.query, 'query');
    this.assertString(args.directory, 'directory');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fsManager = context.fsManager as FileSystemManager;
    return await fsManager.semanticSearch(context.args.query, context.args.directory);
  }
}
