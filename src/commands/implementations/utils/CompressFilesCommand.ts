import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { CompressionService } from '../../../core/services/utils/CompressionService.js';

const CompressFilesArgsSchema = {
    type: 'object',
    properties: {
      // TODO: Add properties from Zod schema
    }
  };


export class CompressFilesCommand extends BaseCommand {
  readonly name = 'compress_files';
  readonly description = 'Compress files or directories into an archive';
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
      const result = await compressionService.compress(
        context.args.files,
        context.args.outputPath,
        {
          format: context.args.format,
          level: context.args.compressionLevel,
          includeHidden: context.args.includeHidden
        }
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Files compressed successfully',
            outputPath: result.outputPath,
            format: context.args.format,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            compressionRatio: result.compressionRatio,
            filesCount: result.filesCount
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to compress files: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
