import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { IGitService } from '../../../core/interfaces/IGitService.js';

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
    const gitService = context.container.getService<IGitService>('gitService');
    const status = await gitService.status(context.args.path);
    
    // Format the status object into readable text
    let output = `Git Status for: ${status.branch || 'unknown'}\n\n`;
    
    if (status.staged.length > 0) {
      output += `Staged files (${status.staged.length}):\n`;
      status.staged.forEach(file => output += `  A  ${file}\n`);
      output += '\n';
    }
    
    if (status.modified.length > 0) {
      output += `Modified files (${status.modified.length}):\n`;
      status.modified.forEach(file => output += `  M  ${file}\n`);
      output += '\n';
    }
    
    if (status.untracked.length > 0) {
      output += `Untracked files (${status.untracked.length}):\n`;
      status.untracked.forEach(file => output += `  ?  ${file}\n`);
      output += '\n';
    }
    
    if (status.staged.length === 0 && status.modified.length === 0 && 
        status.untracked.length === 0) {
      output += 'Working tree clean\n';
    }
    
    if (status.ahead > 0) {
      output += `\nAhead of remote by ${status.ahead} commit(s)\n`;
    }
    
    if (status.behind > 0) {
      output += `\nBehind remote by ${status.behind} commit(s)\n`;
    }
    
    return this.formatResult(output.trim());
  }
}
