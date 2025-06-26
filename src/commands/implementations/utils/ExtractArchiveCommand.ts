import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { CompressionService } from '../../../core/services/utils/CompressionService.js';

const ExtractArchiveArgsSchema = {
    type: 'object',
    properties: {
      // TODO: Add properties from Zod schema
    }
  };


export class ExtractArchiveCommand extends BaseCommand {
  readonly name = 'extract_archive';
  readonly description = 'Extract files from an archive';
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
      const compressionService = context.container.getService<CompressionService>('compressionService');
      const result = await compressionService.extract(
        context.args.archivePath,
        context.args.outputPath,
        {
          filter: context.args.filter,
          overwrite: context.args.overwrite
        }
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Archive extracted successfully',
            archivePath: context.args.archivePath,
            outputPath: result.outputPath,
            extractedFiles: result.extractedFiles,
            totalSize: result.totalSize
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to extract archive: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
