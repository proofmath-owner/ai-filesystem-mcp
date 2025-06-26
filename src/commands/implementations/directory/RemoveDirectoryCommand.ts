import { BaseCommand, CommandContext, CommandResult } from '../../base/BaseCommand.js';

export class RemoveDirectoryCommand extends BaseCommand {
  readonly name = 'remove_directory';
  readonly description = 'Remove a directory and all its contents';
  readonly inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Directory path to remove'
      },
      recursive: {
        type: 'boolean',
        description: 'Remove recursively',
        default: true
      }
    },
    required: ['path']
  };


  protected validateArgs(args: Record<string, any>): void {


    this.assertString(args.path, 'path');


  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path, recursive = true } = context.args;
    const directoryService = context.container.getService('directoryService') as any;
    
    await directoryService.removeDirectory(path, { recursive });
    
    return this.formatResult(`Directory removed: ${path}`);
  }
}
