import { BaseCommand } from '../base/BaseCommand.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export class CommandRegistry {
  private commands: Map<string, BaseCommand> = new Map();

  register(command: BaseCommand): void {
    this.commands.set(command.name, command);
  }

  registerMany(commands: BaseCommand[]): void {
    for (const command of commands) {
      this.register(command);
    }
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  get(name: string): BaseCommand | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): BaseCommand[] {
    return Array.from(this.commands.values());
  }

  getAllTools(): Tool[] {
    return this.getAllCommands().map(cmd => ({
      name: cmd.name,
      description: cmd.description,
      inputSchema: {
        ...cmd.inputSchema,
        type: 'object' as const
      }
    }));
  }

  async execute(name: string, context: any): Promise<any> {
    const command = this.get(name);
    if (!command) {
      throw new Error(`Command not found: ${name}`);
    }
    
    const result = await command.execute(context);
    
    // Convert our CommandResult to MCP format
    if (!result.isError) {
      // For successful results, format the data appropriately
      if (typeof result.content?.[0]?.text || JSON.stringify(result.content) === 'string') {
        return {
          content: [{ type: 'text', text: result.content?.[0]?.text || JSON.stringify(result.content) }]
        };
      } else {
        // For objects/arrays, convert to JSON string
        return {
          content: [{ type: 'text', text: JSON.stringify(result.content?.[0]?.text || JSON.stringify(result.content), null, 2) }]
        };
      }
    } else {
      // For errors, throw to let the error handler deal with it
      throw new Error(result.error || 'Unknown error');
    }
  }

  get size(): number {
    return this.commands.size;
  }

  getSummary(): { total: number; byCategory: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    
    for (const command of this.commands.values()) {
      const category = this.getCategoryFromCommand(command);
      byCategory[category] = (byCategory[category] || 0) + 1;
    }
    
    return {
      total: this.commands.size,
      byCategory
    };
  }

  private getCategoryFromCommand(command: BaseCommand): string {
    const parts = command.name.split('_');
    
    if (parts.includes('file') || ['read', 'write', 'update', 'move'].includes(parts[0])) {
      return 'file';
    } else if (parts.includes('directory') || ['create', 'remove', 'list'].includes(parts[0])) {
      return 'directory';
    } else if (parts.includes('git') || parts[0] === 'git') {
      return 'git';
    } else if (parts.includes('search') || ['search', 'fuzzy', 'semantic'].includes(parts[0])) {
      return 'search';
    } else if (parts.includes('code') || ['analyze', 'modify', 'refactor'].includes(parts[0])) {
      return 'code';
    } else if (parts.includes('security') || ['scan', 'encrypt', 'decrypt'].includes(parts[0])) {
      return 'security';
    }
    
    return 'other';
  }
}
