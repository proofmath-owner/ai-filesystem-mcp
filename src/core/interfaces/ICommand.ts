import { ServiceContainer } from '../ServiceContainer.js';

export interface CommandContext {
  args: Record<string, any>;
  container: ServiceContainer;
}

export interface CommandResult {
  content?: Array<{
    type: string;
    text?: string;
    [key: string]: any;
  }>;
  isError?: boolean;
  error?: string;
}

export interface InputSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ICommand {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: InputSchema;
  execute(context: CommandContext): Promise<CommandResult>;
}
