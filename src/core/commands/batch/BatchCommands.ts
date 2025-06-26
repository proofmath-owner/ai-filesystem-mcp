import { Command, CommandContext, CommandResult } from '../Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Batch Operations Command
 * 여러 파일 작업을 일괄적으로 실행합니다.
 */
export class BatchOperationsCommand extends Command {
  readonly name = 'batch_operations';
  readonly description = 'Execute multiple file operations in batch';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      operations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            op: {
              type: 'string',
              enum: ['rename', 'move', 'copy', 'delete', 'chmod'],
              description: 'Operation type'
            },
            files: {
              type: 'array',
              description: 'Files to operate on'
            },
            options: {
              type: 'object',
              description: 'Operation options'
            }
          }
        }
      }
    },
    required: ['operations']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertArray(args.operations, 'operations');
    
    // 각 operation 검증
    const validOps = ['rename', 'move', 'copy', 'delete', 'chmod'];
    for (const operation of args.operations) {
      if (!operation.op || !validOps.includes(operation.op)) {
        throw new Error(`Invalid operation type: ${operation.op}. Must be one of: ${validOps.join(', ')}`);
      }
      
      if (!Array.isArray(operation.files)) {
        throw new Error('Each operation must have a files array');
      }
      
      // files 배열의 각 요소가 문자열인지 확인
      for (const file of operation.files) {
        if (typeof file !== 'string') {
          throw new Error('All file paths must be strings');
        }
      }
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { operations } = context.args;
    return await context.fsManager.batchOperations(operations);
  }
}
