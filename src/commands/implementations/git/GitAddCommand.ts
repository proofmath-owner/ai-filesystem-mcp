import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { GitService } from '../../../core/services/git/GitService.js';

const GitAddArgsSchema = {
    type: 'object',
    properties: {
      files: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } }
        ],
        description: 'File(s) to stage, or "." for all'
      },
      path: {
        type: 'string',
        description: 'Repository path (optional, defaults to current directory)'
      }
    },
    required: ['files']
  };


export class GitAddCommand extends BaseCommand {
  readonly name = 'git_add';
  readonly description = 'Add file contents to the index';
  readonly inputSchema = GitAddArgsSchema;


  protected validateArgs(args: Record<string, any>): void {
    if (typeof args.files !== 'string' && !Array.isArray(args.files)) {
      throw new Error('files must be a string or array of strings');
    }
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const gitService = context.container.getService<GitService>('gitService');
      
      let result;
      const files = context.args.files;
      const path = context.args.path;
      
      if (files === '.' || files === '*') {
        result = await gitService.gitAddAll(path);
      } else {
        result = await gitService.gitAdd(files, path);
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
