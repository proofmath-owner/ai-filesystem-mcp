import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { FileService } from '../../../core/services/file/FileService.js';

const GetFileMetadataArgsSchema = {
    type: 'object',
    properties: {
      // TODO: Add properties from Zod schema
    }
  };


export class GetFileMetadataCommand extends BaseCommand {
  readonly name = 'get_file_metadata';
  readonly description = 'Get detailed metadata about a file or directory';
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
      const fileService = context.container.getService<FileService>('fileService');
      const metadata = await fileService.getMetadata(context.args.path);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            path: metadata.path,
            name: metadata.name,
            size: metadata.size,
            created: metadata.created,
            modified: metadata.modified,
            accessed: metadata.accessed,
            isDirectory: metadata.isDirectory,
            isFile: metadata.isFile,
            isSymbolicLink: metadata.isSymbolicLink,
            permissions: metadata.permissions,
            uid: metadata.uid,
            gid: metadata.gid
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to get file metadata: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
