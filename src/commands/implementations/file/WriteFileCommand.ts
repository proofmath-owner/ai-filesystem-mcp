import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { IFileService } from '../../../core/interfaces/IFileService.js';

export class WriteFileCommand extends BaseCommand {
  readonly name = 'write_file';
  readonly description = 'Write content to a file';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: { type: 'string' as const, description: 'File path to write' },
      content: { type: 'string' as const, description: 'Content to write' }
    },
    required: ['path', 'content']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    this.assertString(args.content, 'content');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fileService = context.container.getService<IFileService>('fileService');
    await fileService.writeFile(context.args.path, context.args.content);
    return this.formatResult(`Successfully wrote to ${context.args.path}`);
  }
}