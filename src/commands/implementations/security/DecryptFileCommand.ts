import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { ISecurityService } from '../../../core/interfaces/ISecurityService.js';

export class DecryptFileCommand extends BaseCommand {
  readonly name = 'decrypt_file';
  readonly description = 'Decrypt an encrypted file with a password';
  readonly inputSchema = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'Path to the encrypted file' 
      },
      password: { 
        type: 'string', 
        description: 'Decryption password' 
      },
      outputPath: { 
        type: 'string', 
        description: 'Output path for decrypted file (optional)' 
      }
    },
    required: ['path', 'password'],
    additionalProperties: false
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    this.assertString(args.password, 'password');
    if (args.outputPath !== undefined) {
      this.assertString(args.outputPath, 'outputPath');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const securityService = context.container.getService<ISecurityService>('securityService');
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
