import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { TransactionService } from '../../../core/services/batch/TransactionService.js';

const TransactionOperationSchema = {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['create', 'read', 'update', 'delete'],
        description: 'Type of operation'
      },
      path: {
        type: 'string',
        description: 'File path for the operation'
      },
      content: {
        type: 'string',
        description: 'Content for create/update operations'
      },
      encoding: {
        type: 'string',
        description: 'File encoding',
        default: 'utf8'
      }
    },
    required: ['type', 'path']
  };

const TransactionArgsSchema = {
    type: 'object',
    properties: {
      operations: {
        type: 'array',
        items: TransactionOperationSchema,
        description: 'List of file operations to execute'
      },
      rollbackOnError: {
        type: 'boolean',
        description: 'Whether to rollback all operations if any fails',
        default: true
      }
    },
    required: ['operations']
  };


export class TransactionCommand extends BaseCommand {
  readonly name = 'transaction';
  readonly description = 'Execute file operations in an atomic transaction';
  readonly inputSchema = {
    type: 'object',
    properties: {
      operations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['create', 'read', 'update', 'delete'],
              description: 'Type of operation'
            },
            path: {
              type: 'string',
              description: 'File path for the operation'
            },
            content: {
              type: 'string',
              description: 'Content for create/update operations'
            },
            encoding: {
              type: 'string',
              description: 'File encoding',
              default: 'utf8'
            }
          },
          required: ['type', 'path']
        },
        description: 'List of file operations to execute'
      },
      rollbackOnError: {
        type: 'boolean',
        description: 'Whether to rollback all operations if any fails',
        default: true
      }
    },
    required: ['operations'],
    additionalProperties: false
  };


  protected validateArgs(args: Record<string, any>): void {
    if (!Array.isArray(args.operations)) {
      throw new Error('operations is required and must be an array');
    }
    
    if (args.operations.length === 0) {
      throw new Error('operations array cannot be empty');
    }
    
    const validTypes = ['create', 'read', 'update', 'delete'];
    
    for (const [index, operation] of args.operations.entries()) {
      if (!operation.type || typeof operation.type !== 'string') {
        throw new Error(`Operation ${index}: type is required and must be a string`);
      }
      
      if (!validTypes.includes(operation.type)) {
        throw new Error(`Operation ${index}: type must be one of: ${validTypes.join(', ')}`);
      }
      
      if (!operation.path || typeof operation.path !== 'string') {
        throw new Error(`Operation ${index}: path is required and must be a string`);
      }
      
      if (['create', 'update'].includes(operation.type) && typeof operation.content !== 'string') {
        throw new Error(`Operation ${index}: content is required for ${operation.type} operations`);
      }
      
      if (operation.encoding && typeof operation.encoding !== 'string') {
        throw new Error(`Operation ${index}: encoding must be a string`);
      }
    }
    
    if (args.rollbackOnError !== undefined && typeof args.rollbackOnError !== 'boolean') {
      throw new Error('rollbackOnError must be a boolean');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const transactionService = context.container.getService<TransactionService>('transactionService');
      const result = await transactionService.executeTransaction(
        context.args.operations,
        context.args.rollbackOnError
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Transaction completed successfully',
            transactionId: result.transactionId,
            operations: result.operations.length,
            status: result.status,
            completedAt: result.completedAt
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Transaction failed: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
