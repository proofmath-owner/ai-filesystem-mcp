import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';

export class GitStatusCommand extends BaseCommand {
  readonly name = 'git_status';
  readonly description = 'Get git repository status';
  readonly inputSchema = {
    type: 'object',
    properties: {}
  };


  protected validateArgs(args: Record<string, any>): void {


    // No validation needed


  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const gitService = context.container.getService('gitService') as any;
    const status = await gitService.getStatus();
    
    return this.formatResult(status);
  }
}
