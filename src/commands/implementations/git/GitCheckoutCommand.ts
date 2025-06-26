import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { GitService } from '../../../core/services/git/GitService.js';

const GitCheckoutArgsSchema = {
    type: 'object',
    properties: {
      branch: {
        type: 'string',
        description: 'Branch name to checkout'
      },
      create: {
        type: 'boolean',
        default: false,
        description: 'Create a new branch'
      },
      force: {
        type: 'boolean',
        default: false,
        description: 'Force checkout (discard local changes)'
      },
      path: {
        type: 'string',
        description: 'Repository path (optional, defaults to current directory)'
      }
    },
    required: ['branch']
  };


export class GitCheckoutCommand extends BaseCommand {
  readonly name = 'git_checkout';
  readonly description = 'Switch branches or restore working tree files';
  readonly inputSchema = GitCheckoutArgsSchema;


  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.branch, 'branch');
    if (args.create !== undefined) {
      this.assertBoolean(args.create, 'create');
    }
    if (args.force !== undefined) {
      this.assertBoolean(args.force, 'force');
    }
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const gitService = context.container.getService<GitService>('gitService');
      const result = await gitService.gitCheckout(
        context.args.branch,
        context.args.create,
        context.args.force,
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
          text: `Failed to checkout: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
