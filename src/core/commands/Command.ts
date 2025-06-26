import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface CommandContext {
  args: Record<string, any>;
  fsManager: any; // FileSystemManager 타입은 나중에 import
  serviceManager?: any; // ServiceManager for new services
}

export interface CommandResult {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export abstract class Command {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: Tool['inputSchema'];

  /**
   * 인자 검증
   */
  protected abstract validateArgs(args: Record<string, any>): void;

  /**
   * 명령 실행
   */
  protected abstract executeCommand(context: CommandContext): Promise<CommandResult>;

  /**
   * 명령 실행 (검증 포함)
   */
  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      this.validateArgs(context.args);
      return await this.executeCommand(context);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * Tool 객체로 변환
   */
  toTool(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema
    };
  }

  /**
   * 공통 검증 헬퍼
   */
  protected assertString(value: any, fieldName: string): string {
    if (!value || typeof value !== 'string') {
      throw new Error(`${fieldName} is required and must be a string`);
    }
    return value;
  }

  protected assertArray(value: any, fieldName: string): any[] {
    if (!Array.isArray(value)) {
      throw new Error(`${fieldName} is required and must be an array`);
    }
    return value;
  }

  protected assertNumber(value: any, fieldName: string): number {
    if (typeof value !== 'number') {
      throw new Error(`${fieldName} is required and must be a number`);
    }
    return value;
  }

  protected assertBoolean(value: any, fieldName: string): boolean {
    if (typeof value !== 'boolean') {
      throw new Error(`${fieldName} is required and must be a boolean`);
    }
    return value;
  }
}
