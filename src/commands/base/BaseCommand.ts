import { ICommand, CommandContext, CommandResult, InputSchema } from '../../core/interfaces/ICommand.js';

export type { CommandContext, CommandResult };

export abstract class BaseCommand implements ICommand {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: InputSchema;

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      // Validate arguments
      this.validateArgs(context.args);
      
      // Execute the command
      return await this.executeCommand(context);
    } catch (error) {
      return this.formatError(error);
    }
  }

  protected abstract validateArgs(args: Record<string, any>): void;
  protected abstract executeCommand(context: CommandContext): Promise<CommandResult>;

  protected formatResult(message: string, data?: any): CommandResult {
    return {
      content: [{
        type: 'text',
        text: message
      }],
      ...(data && { data })
    };
  }

  protected formatError(error: any): CommandResult {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `Error: ${message}`
      }],
      isError: true,
      error: message
    };
  }

  // Validation helpers
  protected assertString(value: any, name: string): void {
    if (typeof value !== 'string') {
      throw new Error(`${name} is required and must be a string`);
    }
  }

  protected assertNumber(value: any, name: string): void {
    if (typeof value !== 'number') {
      throw new Error(`${name} is required and must be a number`);
    }
  }

  protected assertBoolean(value: any, name: string): void {
    if (typeof value !== 'boolean') {
      throw new Error(`${name} is required and must be a boolean`);
    }
  }

  protected assertArray(value: any, name: string): void {
    if (!Array.isArray(value)) {
      throw new Error(`${name} is required and must be an array`);
    }
  }

  protected assertObject(value: any, name: string): void {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`${name} is required and must be an object`);
    }
  }
}
