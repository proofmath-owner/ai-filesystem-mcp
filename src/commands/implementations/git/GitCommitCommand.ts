import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { IGitService } from '../../../core/interfaces/IGitService.js';

export class GitCommitCommand extends BaseCommand {
  readonly name = 'git_commit';
  readonly description = 'Commit changes to git';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      message: { type: 'string' as const, description: 'Commit message' },
      files: { 
        type: 'array' as const, 
        items: { type: 'string' as const },
        description: 'Specific files to commit (optional)' 
      },
      path: {
        type: 'string' as const,
        description: 'Repository path (optional, defaults to current directory)'
      }
    },
    required: ['message']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.message, 'message');
    if (args.files !== undefined) {
      this.assertArray(args.files, 'files');
      args.files.forEach((file: any, index: number) => {
        this.assertString(file, `files[${index}]`);
      });
    }
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const gitService = context.container.getService<IGitService>('gitService');
    
    await gitService.commit(context.args.message, context.args.files, context.args.path);
    
    return this.formatResult(`Successfully committed changes`);
  }
}
