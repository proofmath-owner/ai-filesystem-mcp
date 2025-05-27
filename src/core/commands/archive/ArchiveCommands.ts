import { Command, CommandContext, CommandResult } from '../Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Compress Files Command
 * 파일들을 압축 파일로 만듭니다.
 */
export class CompressFilesCommand extends Command {
  readonly name = 'compress_files';
  readonly description = 'Compress files into an archive';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'Files to compress'
      },
      outputPath: { 
        type: 'string', 
        description: 'Output archive path' 
      },
      format: {
        type: 'string',
        enum: ['zip', 'tar', 'tar.gz'],
        description: 'Archive format'
      }
    },
    required: ['files', 'outputPath']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertArray(args.files, 'files');
    this.assertString(args.outputPath, 'outputPath');
    
    // 각 파일 경로가 string인지 확인
    for (const file of args.files) {
      if (typeof file !== 'string') {
        throw new Error('All file paths must be strings');
      }
    }
    
    // format이 제공된 경우 유효한지 확인
    if (args.format) {
      const validFormats = ['zip', 'tar', 'tar.gz'];
      if (!validFormats.includes(args.format)) {
        throw new Error(`Invalid format: ${args.format}. Must be one of: ${validFormats.join(', ')}`);
      }
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { files, outputPath, format } = context.args;
    return await context.fsManager.compressFiles(files, outputPath, format);
  }
}

/**
 * Extract Archive Command
 * 압축 파일을 추출합니다.
 */
export class ExtractArchiveCommand extends Command {
  readonly name = 'extract_archive';
  readonly description = 'Extract files from an archive';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      archivePath: { 
        type: 'string', 
        description: 'Archive file path' 
      },
      destination: { 
        type: 'string', 
        description: 'Extraction destination' 
      }
    },
    required: ['archivePath', 'destination']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.archivePath, 'archivePath');
    this.assertString(args.destination, 'destination');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { archivePath, destination } = context.args;
    return await context.fsManager.extractArchive(archivePath, destination);
  }
}
