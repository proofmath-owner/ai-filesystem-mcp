import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { IFileService } from '../../../core/interfaces/IFileService.js';

export class ReadFilesCommand extends BaseCommand {
  readonly name = 'read_files';
  readonly description = 'Read multiple files at once';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      paths: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Array of file paths to read'
      }
    },
    required: ['paths']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertArray(args.paths, 'paths');
    
    for (let i = 0; i < args.paths.length; i++) {
      this.assertString(args.paths[i], `paths[${i}]`);
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fileService = context.container.getService<IFileService>('fileService');
    const results = await fileService.readFiles(context.args.paths);
    return this.formatResult(JSON.stringify(results, null, 2));
  }
}
