import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { BatchService } from '../../../core/services/batch/BatchService.js';

export class BatchOperationsCommand extends BaseCommand {
  readonly name = 'batch_operations';
  readonly description = 'Execute multiple file operations in batch';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      operations: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            op: {
              type: 'string' as const,
              enum: ['rename', 'move', 'copy', 'delete']
            },
            files: {
              type: 'array' as const,
              items: {
                type: 'object' as const,
                properties: {
                  from: { type: 'string' as const },
                  to: { type: 'string' as const },
                  pattern: { type: 'string' as const },
                  replacement: { type: 'string' as const }
                },
                required: ['from']
              }
            }
          },
          required: ['op', 'files']
        }
      },
      dryRun: {
        type: 'boolean' as const,
        default: false
      },
      continueOnError: {
        type: 'boolean' as const,
        default: true
      }
    },
    required: ['operations']
  };


  protected validateArgs(args: Record<string, any>): void {
    this.assertArray(args.operations, 'operations');
    
    // Validate each operation
    args.operations.forEach((op: any, index: number) => {
      this.assertString(op.op, `operations[${index}].op`);
      this.assertArray(op.files, `operations[${index}].files`);
    });
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const batchService = context.container.getService<BatchService>('batchService');
      
      const result = await batchService.executeBatch(
        context.args.operations,
        {
          dryRun: context.args.dryRun,
          continueOnError: context.args.continueOnError
        }
      );
      
      return this.formatResult(JSON.stringify({
        message: context.args.dryRun ? 'Dry run completed' : 'Batch operations completed',
        totalOperations: result.totalOperations,
        successful: result.successful,
        failed: result.failed,
        operations: result.operations,
        errors: result.errors
      }, null, 2));
    } catch (error) {
      return this.formatError(error);
    }
  }
}
