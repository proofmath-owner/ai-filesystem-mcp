import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';

export class GitStatusCommand extends BaseCommand {
  readonly name = 'git_status';
  readonly description = 'Get git repository status';
  readonly inputSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Repository path (defaults to current directory)' }
    }
  };


  protected validateArgs(args: Record<string, any>): void {
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const gitService = context.container.getService('gitService') as any;
    const status = await gitService.status(context.args.path);
    
    return this.formatResult(status);
  }
}
