import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { ISearchService } from '../../../core/interfaces/ISearchService.js';

export class SearchContentCommand extends BaseCommand {
  readonly name = 'search_content';
  readonly description = 'Search for text content within files. Supports both plain text and regular expressions';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      pattern: { 
        type: 'string' as const, 
        description: 'Text or regex pattern to search. Examples: "TODO", "function\\s+\\w+", "console\\.log" (escape special chars)' 
      },
      directory: { 
        type: 'string' as const, 
        description: 'Directory to search in (absolute or relative path). Searches recursively through all subdirectories' 
      },
      filePattern: { 
        type: 'string' as const, 
        description: 'Glob pattern for files to include. Examples: "*.js", "src/**/*.ts", "**/*.{js,ts}" (default: all files)',
        default: '**/*'
      }
    },
    required: ['pattern', 'directory']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.pattern, 'pattern');
    this.assertString(args.directory, 'directory');
    if (args.filePattern !== undefined) {
      this.assertString(args.filePattern, 'filePattern');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const searchService = context.container.getService<ISearchService>('searchService');
    const results = await searchService.searchContent(
      context.args.directory,
      context.args.pattern,
      context.args.filePattern
    );

    if (results.length === 0) {
      return this.formatResult('No matches found');
    }

    const formatted = results.slice(0, 100).map(r => 
      `${r.path}:${r.line || 0}:${r.matches?.[0]?.column || 0} - ${r.matches?.[0]?.match || ""}`
    ).join('\n');

    const message = results.length > 100
      ? `Found ${results.length} matches (showing first 100):\n${formatted}`
      : `Found ${results.length} matches:\n${formatted}`;

    return this.formatResult(message);
  }
}