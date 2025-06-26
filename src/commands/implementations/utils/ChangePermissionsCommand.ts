import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { IFileService } from '../../../core/services/interfaces/IFileService.js';

export class ChangePermissionsCommand extends BaseCommand {
  readonly name = 'change_permissions';
  readonly description = 'Change file or directory permissions';
  readonly inputSchema = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'Path to the file or directory' 
      },
      permissions: { 
        type: 'string', 
        description: 'Permissions in octal format (e.g., "755") or symbolic format (e.g., "rwxr-xr-x")',
        pattern: '^([0-7]{3,4}|[rwx-]{9})$'
      },
      recursive: { 
        type: 'boolean', 
        description: 'Apply permissions recursively to directories',
        default: false 
      }
    },
    required: ['path', 'permissions'],
    additionalProperties: false
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    this.assertString(args.permissions, 'permissions');
    if (args.recursive !== undefined) {
      this.assertBoolean(args.recursive, 'recursive');
    }
    
    // Validate permissions format
    const permissions = args.permissions;
    const octalPattern = /^[0-7]{3,4}$/;
    const symbolicPattern = /^[rwx-]{9}$/;
    
    if (!octalPattern.test(permissions) && !symbolicPattern.test(permissions)) {
      throw new Error('Permissions must be in octal format (e.g., "755") or symbolic format (e.g., "rwxr-xr-x")');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const fileService = context.container.getService<IFileService>('fileService');
      await fileService.changePermissions(
        context.args.path,
        context.args.permissions
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Permissions changed successfully',
            path: context.args.path,
            permissions: context.args.permissions,
            recursive: context.args.recursive || false
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to change permissions: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
