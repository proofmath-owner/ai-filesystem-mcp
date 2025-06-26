import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { GitService } from '../../../core/services/git/GitService.js';

const GitPullArgsSchema = {
    type: 'object',
    properties: {
      remote: { 
        type: 'string', 
        default: 'origin', 
        description: 'Remote name' 
      },
      branch: { 
        type: 'string', 
        description: 'Branch name (optional)' 
      },
      rebase: {
        type: 'boolean',
        default: false,
        description: 'Rebase instead of merge'
      },
      path: {
        type: 'string',
        description: 'Repository path (optional, defaults to current directory)'
      }
    }
  };


export class GitPullCommand extends BaseCommand {
  readonly name = 'git_pull';
  readonly description = 'Fetch from and integrate with another repository or a local branch';
  readonly inputSchema = GitPullArgsSchema;


  protected validateArgs(args: Record<string, any>): void {
    if (args.remote !== undefined) {
      this.assertString(args.remote, 'remote');
    }
    if (args.branch !== undefined) {
      this.assertString(args.branch, 'branch');
    }
    if (args.rebase !== undefined) {
      this.assertBoolean(args.rebase, 'rebase');
    }
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const gitService = context.container.getService<GitService>('gitService');
      const result = await gitService.gitPull(
        context.args.remote || 'origin',
        context.args.branch,
        context.args.rebase,
        context.args.path
      );

      return {
        content: [{
          type: 'text',
          text: result.message
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to pull: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
