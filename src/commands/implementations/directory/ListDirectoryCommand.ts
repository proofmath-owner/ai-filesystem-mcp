import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { IDirectoryService } from '../../../core/interfaces/IDirectoryService.js';

export class ListDirectoryCommand extends BaseCommand {
  readonly name = 'list_directory';
  readonly description = 'List contents of a directory';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: { type: 'string' as const, description: 'Directory path to list' },
      detailed: { type: 'boolean' as const, description: 'Include detailed file information' },
      pattern: { type: 'string' as const, description: 'Filter pattern (e.g., *.txt)' }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    if (args.detailed !== undefined) {
      this.assertBoolean(args.detailed, 'detailed');
    }
    if (args.pattern !== undefined) {
      this.assertString(args.pattern, 'pattern');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const directoryService = context.container.getService<IDirectoryService>('directoryService');
    const results = await directoryService.listDirectory(
      context.args.path,
      {
        detailed: context.args.detailed,
        pattern: context.args.pattern
      }
    );
    return this.formatResult(JSON.stringify(results, null, 2));
  }
}
