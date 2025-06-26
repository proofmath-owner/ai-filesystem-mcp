import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { SearchService } from '../../../core/services/search/SearchService.js';

export class SemanticSearchCommand extends BaseCommand {
  readonly name = 'semantic_search';
  readonly description = 'Search files using semantic understanding';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string' as const,
        description: 'Natural language search query'
      },
      directory: {
        type: 'string' as const,
        description: 'Directory to search in',
        default: '.'
      },
      fileTypes: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'File types to search (e.g., ["js", "ts", "py"])'
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of results',
        minimum: 1,
        default: 10
      },
      includeContent: {
        type: 'boolean' as const,
        description: 'Include file content in results',
        default: false
      }
    },
    required: ['query']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.query, 'query');
    
    if (args.directory !== undefined) {
      this.assertString(args.directory, 'directory');
    }
    
    if (args.fileTypes !== undefined) {
      this.assertArray(args.fileTypes, 'fileTypes');
    }
    
    if (args.limit !== undefined) {
      this.assertNumber(args.limit, 'limit');
      if (args.limit <= 0) {
        throw new Error('limit must be a positive number');
      }
    }
    
    if (args.includeContent !== undefined) {
      this.assertBoolean(args.includeContent, 'includeContent');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const searchService = context.container.getService<SearchService>('searchService');
      const results = await searchService.semanticSearch(
        context.args.query,
        context.args.directory || '.',
        {
          fileTypes: context.args.fileTypes,
          limit: context.args.limit || 10,
          includeContent: context.args.includeContent || false
        }
      );

      return this.formatResult(JSON.stringify({
        query: context.args.query,
        interpretation: results.interpretation,
        totalResults: results.files.length,
        files: results.files.map(f => ({
          path: f.path,
          relevanceScore: f.relevanceScore,
          summary: f.summary,
          data: f.content
        }))
      }, null, 2));
    } catch (error) {
      return this.formatError(error);
    }
  }
}
