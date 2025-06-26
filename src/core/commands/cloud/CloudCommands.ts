import { Command, CommandContext, CommandResult } from '../Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Sync With Cloud Command
 * 로컬 디렉토리와 클라우드 스토리지를 동기화합니다.
 */
export class SyncWithCloudCommand extends Command {
  readonly name = 'sync_with_cloud';
  readonly description = 'Sync local directory with cloud storage';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      localPath: { 
        type: 'string', 
        description: 'Local directory path' 
      },
      remotePath: { 
        type: 'string', 
        description: 'Remote path' 
      },
      cloudType: {
        type: 'string',
        enum: ['s3', 'gcs'],
        description: 'Cloud storage type'
      }
    },
    required: ['localPath', 'remotePath']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.localPath, 'localPath');
    this.assertString(args.remotePath, 'remotePath');
    
    // cloudType은 선택사항이지만, 제공된 경우 유효한 값인지 확인
    if (args.cloudType !== undefined) {
      this.assertString(args.cloudType, 'cloudType');
      if (!['s3', 'gcs'].includes(args.cloudType)) {
        throw new Error(`Invalid cloudType: ${args.cloudType}. Must be 's3' or 'gcs'`);
      }
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { localPath, remotePath, cloudType } = context.args;
    return await context.fsManager.syncWithCloud(localPath, remotePath, cloudType);
  }
}
