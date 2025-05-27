import { Command, CommandContext, CommandResult } from '../Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Git Status Command
 * Git 저장소의 상태를 확인합니다.
 */
export class GitStatusCommand extends Command {
  readonly name = 'git_status';
  readonly description = 'Get git repository status';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {}
  };

  protected validateArgs(args: Record<string, any>): void {
    // git_status는 매개변수가 없음
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    return await context.fsManager.gitStatus();
  }
}

/**
 * Git Commit Command
 * 변경사항을 Git에 커밋합니다.
 */
export class GitCommitCommand extends Command {
  readonly name = 'git_commit';
  readonly description = 'Commit changes to git';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      message: { 
        type: 'string', 
        description: 'Commit message' 
      },
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific files to commit (optional)'
      }
    },
    required: ['message']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.message, 'message');
    
    // files가 제공된 경우에만 검증
    if (args.files !== undefined && !Array.isArray(args.files)) {
      throw new Error('files must be an array of strings');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { message, files } = context.args;
    return await context.fsManager.gitCommit(message, files);
  }
}
