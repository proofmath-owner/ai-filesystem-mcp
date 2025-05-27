import { Command, CommandContext, CommandResult } from '../Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Start Watching Command
 * 파일이나 디렉토리 변경사항을 감시합니다.
 */
export class StartWatchingCommand extends Command {
  readonly name = 'start_watching';
  readonly description = 'Start watching files or directories for changes';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      paths: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } }
        ],
        description: 'Path(s) to watch'
      },
      persistent: { 
        type: 'boolean', 
        description: 'Keep watching persistently' 
      },
      ignoreInitial: { 
        type: 'boolean', 
        description: 'Ignore initial add events' 
      }
    },
    required: ['paths']
  };

  protected validateArgs(args: Record<string, any>): void {
    if (!args.paths) {
      throw new Error('paths is required');
    }
    
    // paths가 string 또는 string array인지 확인
    if (typeof args.paths !== 'string' && !Array.isArray(args.paths)) {
      throw new Error('paths must be a string or an array of strings');
    }
    
    // array인 경우 모든 요소가 string인지 확인
    if (Array.isArray(args.paths)) {
      for (const path of args.paths) {
        if (typeof path !== 'string') {
          throw new Error('All paths must be strings');
        }
      }
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { paths, persistent, ignoreInitial } = context.args;
    return await context.fsManager.startWatching(paths, {
      persistent,
      ignoreInitial
    });
  }
}

/**
 * Stop Watching Command
 * 파일 감시를 중지합니다.
 */
export class StopWatchingCommand extends Command {
  readonly name = 'stop_watching';
  readonly description = 'Stop watching files';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      watcherId: { 
        type: 'string', 
        description: 'Watcher ID to stop' 
      }
    },
    required: ['watcherId']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.watcherId, 'watcherId');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { watcherId } = context.args;
    return await context.fsManager.stopWatching(watcherId);
  }
}

/**
 * Get Watcher Stats Command
 * 파일 감시 통계를 가져옵니다.
 */
export class GetWatcherStatsCommand extends Command {
  readonly name = 'get_watcher_stats';
  readonly description = 'Get statistics about file watchers';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {}
  };

  protected validateArgs(args: Record<string, any>): void {
    // get_watcher_stats는 매개변수가 없음
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    return context.fsManager.getWatcherStats();
  }
}
