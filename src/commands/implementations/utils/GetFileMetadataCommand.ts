import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { IFileService } from '../../../core/services/interfaces/IFileService.js';

export class GetFileMetadataCommand extends BaseCommand {
  readonly name = 'get_file_metadata';
  readonly description = 'Get detailed metadata about a file or directory';
  readonly inputSchema = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'Path to the file or directory' 
      },
      includeHidden: { 
        type: 'boolean', 
        description: 'Include hidden file information',
        default: false 
      }
    },
    required: ['path'],
    additionalProperties: false
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    if (args.includeHidden !== undefined) {
      this.assertBoolean(args.includeHidden, 'includeHidden');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const fileService = context.container.getService<IFileService>('fileService');
      const result = await fileService.getFileMetadata(context.args.path);
      
      // Parse the JSON response from the service
      const metadata = JSON.parse(result.content[0].text);

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
