import { Command, CommandContext, CommandResult } from '../Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Create Transaction Command
 * 여러 파일 작업을 트랜잭션으로 처리합니다.
 */
export class CreateTransactionCommand extends Command {
  readonly name = 'create_transaction';
  readonly description = 'Create a transaction for multiple file operations';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      operations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['write', 'update', 'remove'],
              description: 'Operation type'
            },
            path: { 
              type: 'string', 
              description: 'File path' 
            },
            content: { 
              type: 'string', 
              description: 'Content for write operation' 
            },
            updates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  oldText: { type: 'string' },
                  newText: { type: 'string' }
                }
              },
              description: 'Updates for update operation'
            }
          },
          required: ['type', 'path']
        }
      }
    },
    required: ['operations']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertArray(args.operations, 'operations');
    
    // 각 operation 검증
    const validTypes = ['write', 'update', 'remove'];
    for (const op of args.operations) {
      if (!op.type || !validTypes.includes(op.type)) {
        throw new Error(`Invalid operation type: ${op.type}. Must be one of: ${validTypes.join(', ')}`);
      }
      
      if (!op.path || typeof op.path !== 'string') {
        throw new Error('Each operation must have a path');
      }
      
      // 타입별 추가 검증
      if (op.type === 'write' && typeof op.content !== 'string') {
        throw new Error('Write operation requires content');
      }
      
      if (op.type === 'update' && !Array.isArray(op.updates)) {
        throw new Error('Update operation requires updates array');
      }
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { operations } = context.args;
    const transaction = context.fsManager.createTransaction();
    
    // 각 operation을 트랜잭션에 추가
    for (const op of operations) {
      switch (op.type) {
        case 'write':
          transaction.write(op.path, op.content);
          break;
        case 'update':
          transaction.update(op.path, op.updates);
          break;
        case 'remove':
          transaction.remove(op.path);
          break;
      }
    }
    
    // 트랜잭션 커밋
    const result = await transaction.commit();
    
    return {
      content: [{
        type: 'text',
        text: result.success 
          ? `Transaction completed successfully: ${result.operations} operations`
          : `Transaction failed: ${result.error}. Rolled back to ${result.rollbackPath}`
      }]
    };
  }
}
