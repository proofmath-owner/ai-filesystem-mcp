import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { IFileService } from '../../../core/interfaces/IFileService.js';

export class MoveFileCommand extends BaseCommand {
  readonly name = 'move_file';
  readonly description = 'Move or rename a file';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      source: { type: 'string' as const, description: 'Source file path' },
      destination: { type: 'string' as const, description: 'Destination file path' }
    },
    required: ['source', 'destination']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.source, 'source');
    this.assertString(args.destination, 'destination');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fileService = context.container.getService<IFileService>('fileService');
    await fileService.moveFile(context.args.source, context.args.destination);
    return this.formatResult(`Successfully moved ${context.args.source} to ${context.args.destination}`);
  }
}
