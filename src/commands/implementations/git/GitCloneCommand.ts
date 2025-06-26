import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { GitService } from '../../../core/services/git/GitService.js';

const GitCloneArgsSchema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Repository URL'
      },
      directory: {
        type: 'string',
        description: 'Destination directory (optional)'
      },
      branch: {
        type: 'string',
        description: 'Branch to clone (optional)'
      },
      depth: {
        type: 'number',
        description: 'Create a shallow clone with history truncated to specified number of commits'
      },
      bare: {
        type: 'boolean',
        default: false,
        description: 'Create a bare repository'
      }
    },
    required: ['url']
  };


export class GitCloneCommand extends BaseCommand {
  readonly name = 'git_clone';
  readonly description = 'Clone a repository into a new directory';
  readonly inputSchema = GitCloneArgsSchema;


  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.url, 'url');
    if (args.directory !== undefined) {
      this.assertString(args.directory, 'directory');
    }
    if (args.branch !== undefined) {
      this.assertString(args.branch, 'branch');
    }
    if (args.depth !== undefined) {
      this.assertNumber(args.depth, 'depth');
    }
    if (args.bare !== undefined) {
      this.assertBoolean(args.bare, 'bare');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const gitService = context.container.getService<GitService>('gitService');
      const result = await gitService.gitClone(
        context.args.url,
        context.args.directory,
        context.args.branch,
        context.args.depth,
        context.args.bare
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
          text: `Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
