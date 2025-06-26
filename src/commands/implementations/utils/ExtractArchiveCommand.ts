import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { ICompressionService } from '../../../core/interfaces/ICompressionService.js';

export class ExtractArchiveCommand extends BaseCommand {
  readonly name = 'extract_archive';
  readonly description = 'Extract files from an archive';
  readonly inputSchema = {
    type: 'object',
    properties: {
      archivePath: { 
        type: 'string', 
        description: 'Path to the archive file' 
      },
      outputPath: { 
        type: 'string', 
        description: 'Directory to extract files to' 
      },
      filter: { 
        type: 'string',
        description: 'File pattern to extract (optional)' 
      },
      overwrite: { 
        type: 'boolean', 
        description: 'Whether to overwrite existing files',
        default: false 
      }
    },
    required: ['archivePath', 'outputPath'],
    additionalProperties: false
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.archivePath, 'archivePath');
    this.assertString(args.outputPath, 'outputPath');
    if (args.filter !== undefined) {
      this.assertString(args.filter, 'filter');
    }
    if (args.overwrite !== undefined) {
      this.assertBoolean(args.overwrite, 'overwrite');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const compressionService = context.container.getService<ICompressionService>('compressionService');
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
