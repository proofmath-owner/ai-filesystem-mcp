import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../core/interfaces/ICommand.js';
import { ICodeAnalysisService } from '../../../core/interfaces/ICodeAnalysisService.js';

export class ModifyCodeCommand extends BaseCommand {
  readonly name = 'modify_code';
  readonly description = 'Modify code using AST transformations';
  readonly inputSchema = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'Path to the code file to modify' 
      },
      modifications: { 
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { 
              type: 'string',
              enum: ['rename', 'addImport', 'removeImport', 'addFunction', 'updateFunction', 'addProperty'],
              description: 'Type of modification'
            },
            target: { type: 'string', description: 'Target element name' },
            newName: { type: 'string', description: 'New name for rename operations' },
            importName: { type: 'string', description: 'Import name for import operations' },
            importPath: { type: 'string', description: 'Import path for import operations' },
            functionCode: { type: 'string', description: 'Function code for function operations' },
            propertyName: { type: 'string', description: 'Property name for property operations' },
            propertyValue: { type: 'string', description: 'Property value for property operations' }
          },
          required: ['type']
        },
        description: 'Array of modifications to apply'
      }
    },
    required: ['path', 'modifications'],
    additionalProperties: false
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    this.assertArray(args.modifications, 'modifications');
    
    if (args.modifications.length === 0) {
      throw new Error('At least one modification is required');
    }
    
    // Validate each modification
    args.modifications.forEach((mod: any, index: number) => {
      if (typeof mod !== 'object') {
        throw new Error(`Modification ${index} must be an object`);
      }
      if (!mod.type) {
        throw new Error(`Modification ${index} must have a type`);
      }
      const validTypes = ['rename', 'addImport', 'removeImport', 'addFunction', 'updateFunction', 'addProperty'];
      if (!validTypes.includes(mod.type)) {
        throw new Error(`Modification ${index} type must be one of: ${validTypes.join(', ')}`);
      }
    });
  }


  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const codeService = context.container.getService<ICodeAnalysisService>('codeAnalysisService');
      const result = await codeService.modifyCode(context.args.path, context.args.modifications);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Code modified successfully',
            path: context.args.path,
            modifications: result.appliedModifications,
            backup: result.backupPath
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to modify code: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}
