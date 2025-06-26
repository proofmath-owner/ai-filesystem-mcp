import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { IFileService } from '../../../core/interfaces/IFileService.js';

export class UpdateFileCommand extends BaseCommand {
  readonly name = 'update_file';
  readonly description = 'Update specific parts of a file';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: { type: 'string' as const, description: 'File path to update' },
      updates: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            oldText: { type: 'string' as const, description: 'Text to find' },
            newText: { type: 'string' as const, description: 'Text to replace with' }
          },
          required: ['oldText', 'newText']
        }
      }
    },
    required: ['path', 'updates']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    this.assertArray(args.updates, 'updates');
    
    for (let i = 0; i < args.updates.length; i++) {
      const update = args.updates[i];
      this.assertObject(update, `updates[${i}]`);
      this.assertString(update.oldText, `updates[${i}].oldText`);
      this.assertString(update.newText, `updates[${i}].newText`);
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fileService = context.container.getService<IFileService>('fileService');
    await fileService.updateFile(context.args.path, context.args.updates);
    return this.formatResult(`Successfully updated ${context.args.path}`);
  }
}
