import { Command, CommandContext, CommandResult } from '../Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Analyze Code Command
 * TypeScript/JavaScript 코드 구조를 분석합니다.
 */
export class AnalyzeCodeCommand extends Command {
  readonly name = 'analyze_code';
  readonly description = 'Analyze TypeScript/JavaScript code structure';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'File path to analyze' 
      }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path } = context.args;
    return await context.fsManager.analyzeCode(path);
  }
}

/**
 * Modify Code Command
 * AST 변환을 사용하여 코드를 수정합니다.
 */
export class ModifyCodeCommand extends Command {
  readonly name = 'modify_code';
  readonly description = 'Modify code using AST transformations';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'File path to modify' 
      },
      modifications: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['rename', 'addImport', 'removeImport', 'addFunction', 'updateFunction', 'addProperty'],
              description: 'Modification type'
            },
            target: { 
              type: 'string', 
              description: 'Target symbol/function/class name' 
            },
            newName: { 
              type: 'string', 
              description: 'New name for rename' 
            },
            importPath: { 
              type: 'string', 
              description: 'Import path' 
            },
            importName: { 
              type: 'string', 
              description: 'Import name' 
            },
            functionCode: { 
              type: 'string', 
              description: 'Function code' 
            },
            propertyName: { 
              type: 'string', 
              description: 'Property name' 
            },
            propertyValue: { 
              type: 'string', 
              description: 'Property value' 
            }
          },
          required: ['type']
        }
      }
    },
    required: ['path', 'modifications']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    this.assertArray(args.modifications, 'modifications');
    
    // 각 modification의 type이 유효한지 검증
    const validTypes = ['rename', 'addImport', 'removeImport', 'addFunction', 'updateFunction', 'addProperty'];
    for (const mod of args.modifications) {
      if (!mod.type || !validTypes.includes(mod.type)) {
        throw new Error(`Invalid modification type: ${mod.type}. Must be one of: ${validTypes.join(', ')}`);
      }
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path, modifications } = context.args;
    return await context.fsManager.modifyCode(path, modifications);
  }
}
