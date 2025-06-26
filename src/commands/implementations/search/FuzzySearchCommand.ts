import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { SearchService } from '../../../core/services/search/SearchService.js';

export class FuzzySearchCommand extends BaseCommand {
  readonly name = 'fuzzy_search';
  readonly description = 'Search for files using fuzzy matching';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string' as const,
        description: 'Search query'
      },
      directory: {
        type: 'string' as const,
        description: 'Directory to search in',
        default: '.'
      },
      threshold: {
        type: 'number' as const,
        description: 'Matching threshold (0-1)',
        minimum: 0,
        maximum: 1,
        default: 0.6
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of results',
        minimum: 1,
        default: 20
      },
      extensions: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'File extensions to filter by'
      }
    },
    required: ['query']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.query, 'query');
    
    if (args.directory !== undefined) {
      this.assertString(args.directory, 'directory');
    }
    
    if (args.threshold !== undefined) {
      this.assertNumber(args.threshold, 'threshold');
      if (args.threshold < 0 || args.threshold > 1) {
        throw new Error('threshold must be between 0 and 1');
      }
    }
    
    if (args.limit !== undefined) {
      this.assertNumber(args.limit, 'limit');
      if (args.limit <= 0) {
        throw new Error('limit must be a positive number');
      }
    }
    
    if (args.extensions !== undefined) {
      this.assertArray(args.extensions, 'extensions');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const searchService = context.container.getService<SearchService>('searchService');
      const results = await searchService.fuzzySearch(
        context.args.query,
        context.args.directory || '.',
        {
          threshold: context.args.threshold || 0.6,
          limit: context.args.limit || 20,
          extensions: context.args.extensions
        }
      );

      return this.formatResult(JSON.stringify({
        query: context.args.query,
        totalResults: results.length,
        results: results.map(r => ({
          path: r.path,
          score: r.score,
          matchedPart: r.matchedPart
        }))
      }, null, 2));
    } catch (error) {
      return this.formatError(error);
    }
  }
}
