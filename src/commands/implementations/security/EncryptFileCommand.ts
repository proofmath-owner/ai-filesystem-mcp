import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { SecurityService } from '../../../core/services/security/SecurityService.js';

const EncryptFileArgsSchema = {
    type: 'object',
    properties: {
      // TODO: Add properties from Zod schema
    }
  };


export class EncryptFileCommand extends BaseCommand {
  readonly name = 'encrypt_file';
  readonly description = 'Encrypt a file with a password';
  readonly inputSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to encrypt' },
      password: { type: 'string', description: 'Password for encryption' },
      algorithm: { 
        type: 'string', 
        description: 'Encryption algorithm', 
        enum: ['aes-256-gcm', 'aes-256-cbc'],
        default: 'aes-256-gcm'
      },
      outputPath: { type: 'string', description: 'Output path for encrypted file (optional)' }
    },
    required: ['path', 'password'],
    additionalProperties: false
  };


  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    this.assertString(args.password, 'password');
    if (args.algorithm) {
      this.assertString(args.algorithm, 'algorithm');
    }
    if (args.outputPath) {
      this.assertString(args.outputPath, 'outputPath');
    }
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const securityService = context.container.getService<SecurityService>('securityService');
      const result = await securityService.encryptFile(
        context.args.path,
        context.args.password,
        {
          algorithm: context.args.algorithm,
          outputPath: context.args.outputPath
        }
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'File encrypted successfully',
            inputPath: context.args.path,
            outputPath: result.outputPath,
            algorithm: context.args.algorithm,
            size: result.size
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to encrypt file: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
