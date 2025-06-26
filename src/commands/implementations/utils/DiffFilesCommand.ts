import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { IDiffService } from '../../../core/interfaces/IDiffService.js';

export class DiffFilesCommand extends BaseCommand {
  readonly name = 'diff_files';
  readonly description = 'Compare two files and show differences';
  readonly inputSchema = {
    type: 'object',
    properties: {
      file1: { 
        type: 'string', 
        description: 'Path to the first file' 
      },
      file2: { 
        type: 'string', 
        description: 'Path to the second file' 
      },
      format: { 
        type: 'string',
        enum: ['unified', 'context', 'side-by-side', 'json'],
        description: 'Output format for the diff',
        default: 'unified'
      },
      context: { 
        type: 'number', 
        description: 'Number of context lines to show',
        minimum: 0,
        default: 3 
      },
      ignoreWhitespace: { 
        type: 'boolean', 
        description: 'Ignore whitespace differences',
        default: false 
      }
    },
    required: ['file1', 'file2'],
    additionalProperties: false
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.file1, 'file1');
    this.assertString(args.file2, 'file2');
    if (args.format !== undefined) {
      this.assertString(args.format, 'format');
      const validFormats = ['unified', 'context', 'side-by-side', 'json'];
      if (!validFormats.includes(args.format)) {
        throw new Error(`Format must be one of: ${validFormats.join(', ')}`);
      }
    }
    if (args.context !== undefined) {
      this.assertNumber(args.context, 'context');
      if (args.context < 0) {
        throw new Error('Context must be a non-negative number');
      }
    }
    if (args.ignoreWhitespace !== undefined) {
      this.assertBoolean(args.ignoreWhitespace, 'ignoreWhitespace');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const diffService = context.container.getService<IDiffService>('diffService');
      const diff = await diffService.compareFiles(
        context.args.file1,
        context.args.file2,
        {
          format: context.args.format,
          context: context.args.context,
          ignoreWhitespace: context.args.ignoreWhitespace
        }
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            file1: context.args.file1,
            file2: context.args.file2,
            format: context.args.format,
            additions: diff.additions,
            deletions: diff.deletions,
            changes: diff.changes,
            diff: diff.content
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to compare files: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
