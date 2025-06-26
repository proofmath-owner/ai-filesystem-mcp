import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { ISearchService } from '../../../core/interfaces/ISearchService.js';

export class SearchFilesCommand extends BaseCommand {
  readonly name = 'search_files';
  readonly description = 'Search for files matching a pattern';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      pattern: { type: 'string' as const, description: 'Glob pattern to search' },
      directory: { type: 'string' as const, description: 'Base directory to search in' }
    },
    required: ['pattern', 'directory']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.pattern, 'pattern');
    this.assertString(args.directory, 'directory');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const searchService = context.container.getService<ISearchService>('searchService');
    const results = await searchService.searchFiles(context.args.directory, context.args.pattern);

    if (results.length === 0) {
      return this.formatResult('No files found matching the pattern');
    }

    const formatted = results.slice(0, 100).join('\n');
    const message = results.length > 100 
      ? `Found ${results.length} files (showing first 100):\n${formatted}`
      : `Found ${results.length} files:\n${formatted}`;

    return this.formatResult(message);
  }
}