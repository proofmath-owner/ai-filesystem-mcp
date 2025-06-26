import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { DiffService } from '../../../core/services/utils/DiffService.js';

const DiffFilesArgsSchema = {
    type: 'object',
    properties: {
      // TODO: Add properties from Zod schema
    }
  };


export class DiffFilesCommand extends BaseCommand {
  readonly name = 'diff_files';
  readonly description = 'Compare two files and show differences';
  readonly inputSchema = {
    type: 'object',
    properties: {},
    additionalProperties: false
  };


  protected validateArgs(args: Record<string, any>): void {


    // No required fields to validate


  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const diffService = context.container.getService<DiffService>('diffService');
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
