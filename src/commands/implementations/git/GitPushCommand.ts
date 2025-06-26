import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { GitService } from '../../../core/services/git/GitService.js';

const GitPushArgsSchema = {
    type: 'object',
    properties: {
      remote: { 
        type: 'string', 
        default: 'origin', 
        description: 'Remote name' 
      },
      branch: { 
        type: 'string', 
        description: 'Branch name (optional, uses current)' 
      },
      force: { 
        type: 'boolean', 
        default: false, 
        description: 'Force push' 
      },
      setUpstream: {
        type: 'boolean',
        default: false,
        description: 'Set upstream tracking branch'
      },
      path: {
        type: 'string',
        description: 'Repository path (optional, defaults to current directory)'
      }
    }
  };


export class GitPushCommand extends BaseCommand {
  readonly name = 'git_push';
  readonly description = 'Update remote refs along with associated objects';
  readonly inputSchema = GitPushArgsSchema;


  protected validateArgs(args: Record<string, any>): void {
    if (args.remote !== undefined) {
      this.assertString(args.remote, 'remote');
    }
    if (args.branch !== undefined) {
      this.assertString(args.branch, 'branch');
    }
    if (args.force !== undefined) {
      this.assertBoolean(args.force, 'force');
    }
    if (args.setUpstream !== undefined) {
      this.assertBoolean(args.setUpstream, 'setUpstream');
    }
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const gitService = context.container.getService<GitService>('gitService');
      const result = await gitService.gitPush(
        context.args.remote || 'origin',
        context.args.branch,
        context.args.force,
        context.args.setUpstream,
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
          text: `Failed to push: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
