import { CommandRegistry } from './CommandRegistry.js';
import { TransactionCommand } from '../implementations/batch/TransactionCommand.js';

// One tool, one reason: agents have no native primitive for atomic multi-file
// changes with rollback. That is the entire surface this MCP exposes.
export class CommandLoader {
  constructor(private readonly registry: CommandRegistry) {}

  async loadCommands(): Promise<void> {
    this.registry.registerMany([new TransactionCommand()]);
  }
}
