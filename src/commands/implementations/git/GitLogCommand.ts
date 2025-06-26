import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { GitService } from '../../../core/services/git/GitService.js';

const GitLogArgsSchema = {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        default: 10,
        description: 'Number of commits to show'
      },
      path: {
        type: 'string',
        description: 'Repository path (optional, defaults to current directory)'
      }
    }
  };


export class GitLogCommand extends BaseCommand {
  readonly name = 'git_log';
  readonly description = 'Show commit logs';
  readonly inputSchema = GitLogArgsSchema;


  protected validateArgs(args: Record<string, any>): void {
    if (args.limit !== undefined) {
      this.assertNumber(args.limit, 'limit');
    }
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const gitService = context.container.getService<GitService>('gitService');
      const commits = await gitService.gitLog({
        limit: context.args.limit || 10,
        path: context.args.path
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(commits, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to get git log: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
