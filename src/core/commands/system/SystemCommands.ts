import { Command, CommandContext, CommandResult } from '../Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Get FileSystem Stats Command
 * 파일 시스템 성능 및 모니터링 통계를 가져옵니다.
 */
export class GetFileSystemStatsCommand extends Command {
  readonly name = 'get_filesystem_stats';
  readonly description = 'Get file system performance and monitoring statistics';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {}
  };

  protected validateArgs(args: Record<string, any>): void {
    // get_filesystem_stats는 매개변수가 없음
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    return await context.fsManager.getFileSystemStats();
  }
}
