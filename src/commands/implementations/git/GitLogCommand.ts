import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { GitService } from '../../../core/services/git/GitService.js';

const GitLogArgsSchema = {
    type: 'object',
    properties: {
      // TODO: Add properties from Zod schema
    }
  };


export class GitLogCommand extends BaseCommand {
  readonly name = 'git_log';
  readonly description = 'Show commit logs';
  readonly inputSchema = {
    type: 'object',
    properties: {},
    additionalProperties: false
  };


  protected validateArgs(args: Record<string, any>): void {


    // No required fields to validate


  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const gitService = context.container.getService<GitService>('gitService');
      const commits = await gitService.gitLog(context.args);

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
