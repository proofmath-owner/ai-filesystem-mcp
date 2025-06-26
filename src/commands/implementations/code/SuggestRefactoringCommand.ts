import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { CodeAnalysisService } from '../../../core/services/code/CodeAnalysisService.js';

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
      const codeService = context.container.getService<CodeAnalysisService>('codeAnalysisService');
      const suggestions = await codeService.suggestRefactoring(
        context.args.path,
        context.args.type
      );

      return this.formatResult(JSON.stringify({
        path: context.args.path,
        totalSuggestions: suggestions.length,
        suggestions: suggestions.map(s => ({
          type: s.type,
          description: s.description,
          severity: s.severity,
          location: s.location,
          suggestion: s.suggestion,
          example: s.example
        }))
      }, null, 2));
    } catch (error) {
      return this.formatError(error);
    }
  }
}
