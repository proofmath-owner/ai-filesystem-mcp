import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { IFileService } from '../../../core/interfaces/IFileService.js';

export class ReadFileCommand extends BaseCommand {
  readonly name = 'read_file';
  readonly description = 'Read the contents of a file (with intelligent caching)';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: { type: 'string' as const, description: 'File path to read' }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fileService = context.container.getService<IFileService>('fileService');
    const content = await fileService.readFile(context.args.path);
    return this.formatResult(content);
  }
}