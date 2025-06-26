import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { GitService } from '../../../core/services/git/GitService.js';

const GitBranchArgsSchema = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'create', 'delete', 'rename'],
        default: 'list',
        description: 'Branch action to perform'
      },
      name: {
        type: 'string',
        description: 'Branch name (for create/delete/rename)'
      },
      newName: {
        type: 'string',
        description: 'New branch name (for rename)'
      },
      all: {
        type: 'boolean',
        default: false,
        description: 'Show all branches including remotes'
      },
      remote: {
        type: 'boolean',
        default: false,
        description: 'Show remote branches only'
      },
      force: {
        type: 'boolean',
        default: false,
        description: 'Force delete'
      },
      path: {
        type: 'string',
        description: 'Repository path (optional, defaults to current directory)'
      }
    }
  };


export class GitBranchCommand extends BaseCommand {
  readonly name = 'git_branch';
  readonly description = 'List, create, or delete branches';
  readonly inputSchema = GitBranchArgsSchema;


  protected validateArgs(args: Record<string, any>): void {
    if (args.action && !['list', 'create', 'delete', 'rename'].includes(args.action)) {
      throw new Error('action must be one of: list, create, delete, rename');
    }
    if (args.name !== undefined) {
      this.assertString(args.name, 'name');
    }
    if (args.newName !== undefined) {
      this.assertString(args.newName, 'newName');
    }
    if (args.all !== undefined) {
      this.assertBoolean(args.all, 'all');
    }
    if (args.remote !== undefined) {
      this.assertBoolean(args.remote, 'remote');
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
      let result;

      const { action = 'list', name, newName, all = false, remote = false, force = false, path } = context.args;
      
      switch (action) {
        case 'list':
          result = await gitService.gitBranchList(all, remote, path);
          break;
        case 'create':
          if (!name) {
            throw new Error('Branch name is required for create action');
          }
          result = await gitService.gitBranchCreate(name, path);
          break;
        case 'delete':
          if (!name) {
            throw new Error('Branch name is required for delete action');
          }
          result = await gitService.gitBranchDelete(name, force, path);
          break;
        case 'rename':
          if (!name || !newName) {
            throw new Error('Both name and newName are required for rename action');
          }
          result = await gitService.gitBranchRename(name, newName, path);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
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
