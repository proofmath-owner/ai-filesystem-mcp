import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { SecurityService } from '../../../core/services/security/SecurityService.js';

const DecryptFileArgsSchema = {
    type: 'object',
    properties: {
      // TODO: Add properties from Zod schema
    }
  };


export class DecryptFileCommand extends BaseCommand {
  readonly name = 'decrypt_file';
  readonly description = 'Decrypt an encrypted file with a password';
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
      const securityService = context.container.getService<SecurityService>('securityService');
      const result = await securityService.decryptFile(
        context.args.path,
        context.args.password,
        context.args.outputPath
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'File decrypted successfully',
            inputPath: context.args.path,
            outputPath: result.outputPath,
            size: result.size
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to decrypt file: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
