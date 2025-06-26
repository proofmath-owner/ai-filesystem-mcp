import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { CodeAnalysisService } from '../../../core/services/code/CodeAnalysisService.js';

const FormatCodeArgsSchema = {
    type: 'object',
    properties: {
      // TODO: Add properties from Zod schema
    }
  };


export class FormatCodeCommand extends BaseCommand {
  readonly name = 'format_code';
  readonly description = 'Format code using specified style guide';
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
      const codeService = context.container.getService<CodeAnalysisService>('codeAnalysisService');
      const result = await codeService.formatCode(
        context.args.path,
        {
          style: context.args.style,
          config: context.args.config,
          fix: context.args.fix
        }
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: result.modified ? 'Code formatted successfully' : 'Code is already properly formatted',
            path: context.args.path,
            style: context.args.style,
            modified: result.modified,
            changes: result.changes
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to format code: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
