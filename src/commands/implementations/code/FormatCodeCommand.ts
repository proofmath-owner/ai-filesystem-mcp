import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { CodeAnalysisService } from '../../../core/services/code/CodeAnalysisService.js';

const FormatCodeArgsSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to format'
      },
      style: {
        type: 'string',
        description: 'Code style guide to use (e.g., prettier, eslint)',
        default: 'prettier'
      },
      config: {
        type: 'object',
        description: 'Configuration options for the formatter',
        additionalProperties: true
      },
      fix: {
        type: 'boolean',
        description: 'Whether to fix issues automatically',
        default: true
      }
    },
    required: ['path']
  };


export class FormatCodeCommand extends BaseCommand {
  readonly name = 'format_code';
  readonly description = 'Format code using specified style guide';
  readonly inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to format'
      },
      style: {
        type: 'string',
        description: 'Code style guide to use (e.g., prettier, eslint)',
        default: 'prettier'
      },
      config: {
        type: 'object',
        description: 'Configuration options for the formatter',
        additionalProperties: true
      },
      fix: {
        type: 'boolean',
        description: 'Whether to fix issues automatically',
        default: true
      }
    },
    required: ['path'],
    additionalProperties: false
  };


  protected validateArgs(args: Record<string, any>): void {
    if (!args.path || typeof args.path !== 'string') {
      throw new Error('path is required and must be a string');
    }
    
    if (args.style && typeof args.style !== 'string') {
      throw new Error('style must be a string');
    }
    
    if (args.config && typeof args.config !== 'object') {
      throw new Error('config must be an object');
    }
    
    if (args.fix !== undefined && typeof args.fix !== 'boolean') {
      throw new Error('fix must be a boolean');
    }
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
