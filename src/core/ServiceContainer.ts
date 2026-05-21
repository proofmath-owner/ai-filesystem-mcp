import { CommandRegistry } from '../commands/registry/CommandRegistry.js';
import { CommandLoader } from '../commands/registry/CommandLoader.js';

import { TransactionService } from './services/batch/TransactionService.js';

// Minimal DI container. This server exposes exactly one tool — `transaction` —
// because that is the only operation Claude Code / Codex CLI / similar agents
// cannot do on their own (their per-file Edit is not atomic across files).
//
// Everything else an agent might want (read, write, search, git, shell, …) is
// already a built-in tool of the agent and was intentionally removed from this
// MCP in 3.0.
export class ServiceContainer {
  private services: Map<string, any> = new Map();
  private commandRegistry!: CommandRegistry;

  constructor() {
    this.services.set('transactionService', new TransactionService());
  }

  async initialize(): Promise<void> {
    this.commandRegistry = new CommandRegistry();
    const loader = new CommandLoader(this.commandRegistry);
    await loader.loadCommands();
  }

  getService<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service as T;
  }

  getCommandRegistry(): CommandRegistry {
    return this.commandRegistry;
  }

  async cleanup(): Promise<void> {
    // TransactionService keeps no long-lived handles; nothing to release.
  }
}
