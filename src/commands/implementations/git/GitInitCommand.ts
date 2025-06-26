import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { GitService } from '../../../core/services/git/GitService.js';

export class GitInitCommand extends BaseCommand {
  readonly name = 'git_init';
  readonly description = 'Initialize a new git repository';
  readonly inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to initialize repository',
        default: '.'
      },
      bare: {
        type: 'boolean',
        description: 'Create a bare repository',
        default: false
      }
    }
  };


  protected validateArgs(args: Record<string, any>): void {
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
    if (args.bare !== undefined) {
      this.assertBoolean(args.bare, 'bare');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const { path = '.', bare = false } = context.args;
      const gitService = context.container.getService<GitService>('gitService');
      const result = await gitService.gitInit(path, bare);

      return {
        content: [{
          type: 'text',
          text: result.message
        }]
      };
    } catch (error) {
      return this.formatError(error);
    }
  }
}
