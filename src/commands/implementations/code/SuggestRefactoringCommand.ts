import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { ICodeAnalysisService } from '../../../core/interfaces/ICodeAnalysisService.js';

export class SuggestRefactoringCommand extends BaseCommand {
  readonly name = 'suggest_refactoring';
  readonly description = 'Suggest code refactoring improvements';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string' as const,
        description: 'Path to the code file'
      },
      type: {
        type: 'string' as const,
        description: 'Type of refactoring to focus on',
        enum: ['all', 'complexity', 'naming', 'structure', 'performance']
      }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    
    if (args.type !== undefined) {
      this.assertString(args.type, 'type');
      const validTypes = ['all', 'complexity', 'naming', 'structure', 'performance'];
      if (!validTypes.includes(args.type)) {
        throw new Error(`type must be one of: ${validTypes.join(', ')}`);
      }
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const codeService = context.container.getService<ICodeAnalysisService>('codeAnalysisService');
      
      // Convert type string to options object
      const options: {
        focusAreas?: Array<'complexity' | 'naming' | 'duplication' | 'performance' | 'structure'>;
        maxSuggestions?: number;
      } = {};
      
      if (context.args.type && context.args.type !== 'all') {
        options.focusAreas = [context.args.type as any];
      }
      
      const suggestions = await codeService.suggestRefactoring(
        context.args.path,
        options
      );

      if (suggestions.length === 0) {
        return this.formatResult(`✅ No refactoring suggestions found for ${context.args.path}\nCode appears to be well-structured!`);
      }

      // Format as readable text instead of JSON
      let output = `🛠️ Refactoring Suggestions for: ${context.args.path}\n\n`;
      output += `Found ${suggestions.length} suggestions:\n\n`;

      // Group by severity
      const grouped = suggestions.reduce((acc, suggestion) => {
        const severity = suggestion.severity || 'medium';
        if (!acc[severity]) acc[severity] = [];
        acc[severity].push(suggestion);
        return acc;
      }, {} as Record<string, typeof suggestions>);

      const severityOrder = ['high', 'medium', 'low'];
      const severityEmojis = { high: '🚨', medium: '⚠️', low: '💡' };

      for (const severity of severityOrder) {
        if (grouped[severity] && grouped[severity].length > 0) {
          output += `${severityEmojis[severity as keyof typeof severityEmojis]} ${severity.toUpperCase()} (${grouped[severity].length}):\n`;
          grouped[severity].forEach((suggestion, index) => {
            output += `\n${index + 1}. ${suggestion.type} - Line ${suggestion.location.line}\n`;
            output += `   Problem: ${suggestion.description}\n`;
            output += `   Solution: ${suggestion.suggestion}\n`;
            if (suggestion.example) {
              output += `   Example: ${suggestion.example}\n`;
            }
          });
          output += '\n';
        }
      }

      return this.formatResult(output.trim());
    } catch (error) {
      return this.formatError(error);
    }
  }
}
