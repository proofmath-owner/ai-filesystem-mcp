import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { GitService } from '../../../core/services/git/GitService.js';

const GitBranchArgsSchema = {
    type: 'object',
    properties: {
      // TODO: Add properties from Zod schema
    }
  };


export class GitBranchCommand extends BaseCommand {
  readonly name = 'git_branch';
  readonly description = 'List, create, or delete branches';
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

      switch (context.args.action) {
        case 'list':
          result = await gitService.gitBranchList(context.args.all, context.args.remote);
          break;
        case 'create':
          if (!context.args.name) {
            throw new Error('Branch name is required for create action');
          }
          result = await gitService.gitBranchCreate(context.args.name);
          break;
        case 'delete':
          if (!context.args.name) {
            throw new Error('Branch name is required for delete action');
          }
          result = await gitService.gitBranchDelete(context.args.name, context.args.force);
          break;
        case 'rename':
          if (!context.args.name || !context.args.newName) {
            throw new Error('Both name and newName are required for rename action');
          }
          result = await gitService.gitBranchRename(context.args.name, context.args.newName);
          break;
        default:
          throw new Error(`Unknown action: ${context.args.action}`);
      }

      return {
        content: [{
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to execute branch command: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
