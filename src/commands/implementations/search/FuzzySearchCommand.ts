import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { SearchService } from '../../../core/services/search/SearchService.js';

export class FuzzySearchCommand extends BaseCommand {
  readonly name = 'fuzzy_search';
  readonly description = 'Search for files using fuzzy matching algorithm. Finds files with similar names even with typos or partial matches';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      pattern: {
        type: 'string' as const,
        description: 'Search pattern for fuzzy matching. Examples: "test" finds "testfile.txt", "src/util" finds "src/utilities.js"'
      },
      directory: {
        type: 'string' as const,
        description: 'Directory to search in (absolute or relative path). Default: current directory (".")',
        default: '.'
      },
      threshold: {
        type: 'number' as const,
        description: 'Similarity threshold (0-1). Lower = more matches. 0.9 = high similarity, 0.5 = moderate, 0.3 = loose matching (default)',
        minimum: 0,
        maximum: 1,
        default: 0.3
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of results to return (1-1000). Higher values may impact performance',
        minimum: 1,
        maximum: 1000,
        default: 20
      },
      extensions: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Filter results by file extensions. Examples: [".js", ".ts"] or ["js", "ts"] (dots optional)'
      }
    },
    required: ['pattern']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.pattern, 'pattern');
    
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
        context.args.pattern,
        context.args.directory || '.',
        {
          threshold: context.args.threshold || 0.3,
          limit: context.args.limit || 20,
          extensions: context.args.extensions
        }
      );

      return this.formatResult(JSON.stringify({
        pattern: context.args.pattern,
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
