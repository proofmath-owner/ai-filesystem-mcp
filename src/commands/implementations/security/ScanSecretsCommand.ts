import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { ISecurityService } from '../../../core/interfaces/ISecurityService.js';

export class ScanSecretsCommand extends BaseCommand {
  readonly name = 'scan_secrets';
  readonly description = 'Scan directory for hardcoded secrets and sensitive data';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      directory: { type: 'string' as const, description: 'Directory to scan' }
    },
    required: ['directory']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.directory, 'directory');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const securityService = context.container.getService<ISecurityService>('securityService');
    const results = await securityService.scanSecrets(context.args.directory);
    
    const formatted = `Secret Scan Results:\nFound ${results.length} potential secrets\n\n${results.map(r => 
      `- ${r.path}: ${r.type || 'Secret found'}`
    ).join('\n')}`;
    
    return this.formatResult(formatted);
  }
}