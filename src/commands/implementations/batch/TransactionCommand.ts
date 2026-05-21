import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import {
  TransactionService,
  TransactionOperation,
} from '../../../core/services/batch/TransactionService.js';

// Each op shape must stay in sync with TransactionService.executeOperation().
// The op kinds are deliberately distinct:
//   - create  : new file at path; requires content
//   - write   : write (overwrite) file at existing path; requires content
//   - update  : in-place text replacement; requires updates[]
//   - move    : rename path -> destination
//   - delete  : remove file or directory at path
const OP_TYPES = ['create', 'write', 'update', 'move', 'delete'] as const;
type OpType = (typeof OP_TYPES)[number];

export class TransactionCommand extends BaseCommand {
  readonly name = 'transaction';
  readonly description =
    'Apply a batch of file create/write/update/move/delete operations atomically. ' +
    'If any operation fails (and rollbackOnError is true, the default), all prior ' +
    'operations in the batch are reverted from on-disk backups. This is the one ' +
    'thing the agent\'s built-in per-file Edit cannot do.';

  readonly inputSchema = {
    type: 'object',
    properties: {
      operations: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: [...OP_TYPES],
              description:
                'Operation kind. create=new file, write=overwrite, update=text replace, move=rename, delete=remove.',
            },
            path: {
              type: 'string',
              description: 'Target file or directory path.',
            },
            content: {
              type: 'string',
              description: 'Required for "create" and "write".',
            },
            destination: {
              type: 'string',
              description: 'Required for "move" (new path).',
            },
            updates: {
              type: 'array',
              description:
                'Required for "update". Each entry is { oldText, newText } and is applied in order via string replace.',
              items: {
                type: 'object',
                properties: {
                  oldText: { type: 'string' },
                  newText: { type: 'string' },
                },
                required: ['oldText', 'newText'],
                additionalProperties: false,
              },
            },
          },
          required: ['type', 'path'],
          additionalProperties: false,
        },
        description: 'Ordered list of file operations to execute as one atomic batch.',
      },
      rollbackOnError: {
        type: 'boolean',
        description:
          'When true (default), any failure rolls all completed ops in the batch back from backup.',
        default: true,
      },
    },
    required: ['operations'],
    additionalProperties: false,
  };

  protected validateArgs(args: Record<string, any>): void {
    if (!Array.isArray(args.operations)) {
      throw new Error('operations is required and must be an array');
    }
    if (args.operations.length === 0) {
      throw new Error('operations array cannot be empty');
    }

    args.operations.forEach((op: any, i: number) => this.validateOp(op, i));

    if (args.rollbackOnError !== undefined && typeof args.rollbackOnError !== 'boolean') {
      throw new Error('rollbackOnError must be a boolean');
    }
  }

  private validateOp(op: any, i: number): void {
    if (typeof op?.type !== 'string') {
      throw new Error(`operations[${i}]: "type" is required and must be a string`);
    }
    if (!(OP_TYPES as readonly string[]).includes(op.type)) {
      throw new Error(`operations[${i}]: "type" must be one of: ${OP_TYPES.join(', ')}`);
    }
    if (typeof op.path !== 'string' || op.path.length === 0) {
      throw new Error(`operations[${i}]: "path" is required and must be a non-empty string`);
    }

    const type = op.type as OpType;

    if (type === 'create' || type === 'write') {
      if (typeof op.content !== 'string') {
        throw new Error(`operations[${i}] (${type}): "content" is required and must be a string`);
      }
    }

    if (type === 'move') {
      if (typeof op.destination !== 'string' || op.destination.length === 0) {
        throw new Error(`operations[${i}] (move): "destination" is required and must be a string`);
      }
    }

    if (type === 'update') {
      if (!Array.isArray(op.updates) || op.updates.length === 0) {
        throw new Error(
          `operations[${i}] (update): "updates" is required and must be a non-empty array`,
        );
      }
      op.updates.forEach((u: any, j: number) => {
        if (typeof u?.oldText !== 'string' || typeof u?.newText !== 'string') {
          throw new Error(
            `operations[${i}].updates[${j}]: both "oldText" and "newText" are required strings`,
          );
        }
      });
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const transactionService = context.container.getService<TransactionService>('transactionService');
    const operations = context.args.operations as TransactionOperation[];
    const rollbackOnError =
      context.args.rollbackOnError === undefined ? true : Boolean(context.args.rollbackOnError);

    try {
      const result = await transactionService.executeTransaction(operations, rollbackOnError);

      return this.formatResult(
        JSON.stringify(
          {
            transactionId: result.transactionId,
            status: result.status,
            operations: result.operations.length,
            completedAt: result.completedAt,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      return this.formatError(error);
    }
  }
}
