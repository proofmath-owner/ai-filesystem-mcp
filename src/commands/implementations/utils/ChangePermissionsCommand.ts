import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { FileService } from '../../../core/services/file/FileService.js';



export class ChangePermissionsCommand extends BaseCommand {
  readonly name = 'change_permissions';
  readonly description = 'Change file or directory permissions';
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
