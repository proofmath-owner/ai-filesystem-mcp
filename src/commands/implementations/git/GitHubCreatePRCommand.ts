import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { GitService } from '../../../core/services/git/GitService.js';

const GitHubCreatePRArgsSchema = {
    type: 'object',
    properties: {
      // TODO: Add properties from Zod schema
    }
  };


export class GitHubCreatePRCommand extends BaseCommand {
  readonly name = 'github_create_pr';
  readonly description = 'Create a pull request on GitHub';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      title: { type: 'string' as const, description: 'Pull request title' },
      body: { type: 'string' as const, description: 'Pull request body' },
      base: { type: 'string' as const, description: 'Base branch' },
      head: { type: 'string' as const, description: 'Head branch' },
      path: { type: 'string' as const, description: 'Repository path (optional, defaults to current directory)' }
    },
    required: ['title', 'body', 'base', 'head'],
    additionalProperties: false
  };


  protected validateArgs(args: Record<string, any>): void {


    this.assertString(args.title, 'title');


    this.assertString(args.body, 'body');


    this.assertString(args.base, 'base');


    this.assertString(args.head, 'head');

    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const gitService = context.container.getService<GitService>('gitService');
      const pr = await gitService.createPullRequest({
        title: context.args.title as string,
        body: context.args.body as string,
        base: context.args.base as string,
        head: context.args.head as string,
        ...context.args
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Pull request created successfully',
            result: pr
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to create pull request: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
