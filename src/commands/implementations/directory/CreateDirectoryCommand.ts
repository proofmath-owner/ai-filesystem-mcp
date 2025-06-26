import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { IDirectoryService } from '../../../core/interfaces/IDirectoryService.js';

export class CreateDirectoryCommand extends BaseCommand {
  readonly name = 'create_directory';
  readonly description = 'Create a new directory';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: { type: 'string' as const, description: 'Directory path to create' },
      recursive: { type: 'boolean' as const, description: 'Create parent directories if needed' }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    if (args.recursive !== undefined) {
      this.assertBoolean(args.recursive, 'recursive');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const directoryService = context.container.getService<IDirectoryService>('directoryService');
    await directoryService.createDirectory(
      context.args.path,
      { recursive: context.args.recursive }
    );
    return this.formatResult(`Directory created: ${context.args.path}`);
  }
}
