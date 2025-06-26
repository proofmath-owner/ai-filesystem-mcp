import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { GitService } from '../../../core/services/git/GitService.js';

const GitAddArgsSchema = {
    type: 'object',
    properties: {
      // TODO: Add properties from Zod schema
    }
  };


export class GitAddCommand extends BaseCommand {
  readonly name = 'git_add';
  readonly description = 'Add file contents to the index';
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
      
      let result;
      if (context.args.all) {
        result = await gitService.gitAddAll();
      } else {
        result = await gitService.gitAdd(context.args.files);
      }

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
          text: `Failed to add files: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
