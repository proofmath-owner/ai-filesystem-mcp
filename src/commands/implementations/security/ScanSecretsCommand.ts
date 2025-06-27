import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { ISecurityService } from '../../../core/interfaces/ISecurityService.js';

export class ScanSecretsCommand extends BaseCommand {
  readonly name = 'scan_secrets';
  readonly description = 'Scan directory for hardcoded secrets, API keys, passwords, and sensitive data. Detects AWS keys, tokens, credentials';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      directory: { 
        type: 'string' as const, 
        description: 'Directory to scan recursively (absolute or relative path). Excludes node_modules, .git, dist by default' 
      }
    },
    required: ['directory']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.directory, 'directory');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const securityService = context.container.getService<ISecurityService>('securityService');
    const results = await securityService.scanSecrets(context.args.directory);
    
    if (results.length === 0) {
      return this.formatResult('✅ No secrets found - repository appears clean');
    }
    
    // Group by severity
    const grouped = results.reduce((acc, secret) => {
      const severity = secret.severity || 'medium';
      if (!acc[severity]) acc[severity] = [];
      acc[severity].push(secret);
      return acc;
    }, {} as Record<string, typeof results>);
    
    let output = `🔍 Secret Scan Results: Found ${results.length} potential secrets\n\n`;
    
    const severityOrder = ['critical', 'high', 'medium', 'low'];
    const severityEmojis = { critical: '🚨', high: '⚠️', medium: '⚡', low: '💡' };
    
    for (const severity of severityOrder) {
      if (grouped[severity] && grouped[severity].length > 0) {
        output += `${severityEmojis[severity as keyof typeof severityEmojis] || '📍'} ${severity.toUpperCase()} (${grouped[severity].length}):\n`;
        grouped[severity].forEach(secret => {
          output += `  ${secret.path}:${secret.line || '?'} - ${secret.type || 'Secret detected'}\n`;
        });
        output += '\n';
      }
    }
    
    output += `\n⚠️  Please review and remove or secure these secrets before committing.`;
    
    return this.formatResult(output.trim());
  }
}