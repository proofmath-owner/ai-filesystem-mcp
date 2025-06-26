import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ServiceContainer } from '../core/ServiceContainer.js';
import { RequestHandlers } from './RequestHandlers.js';
import { ErrorHandler } from './ErrorHandler.js';

export class MCPServer {
  private server: Server;
  private container: ServiceContainer;
  private handlers: RequestHandlers;
  private errorHandler: ErrorHandler;

  constructor() {
    this.container = new ServiceContainer();
    this.errorHandler = new ErrorHandler();
    this.handlers = new RequestHandlers(this.container, this.errorHandler);
    
    this.server = new Server(
      {
        name: 'ai-filesystem-mcp',
        version: '3.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupProcessHandlers();
  }

  private setupHandlers(): void {
    this.handlers.setupHandlers(this.server);
  }

  private setupProcessHandlers(): void {
    // Graceful shutdown handlers
    process.on('SIGINT', async () => {
      console.error('\nReceived SIGINT, shutting down gracefully...');
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('\nReceived SIGTERM, shutting down gracefully...');
      await this.cleanup();
      process.exit(0);
    });

    // Error handlers
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Log but don't exit - let the server continue running
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      // For uncaught exceptions, we should exit as the process may be in an undefined state
      this.cleanup().finally(() => process.exit(1));
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize container (loads commands)
      await this.container.initialize();
      
      // Setup handlers after commands are loaded
      this.setupHandlers();
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      const registry = this.container.getCommandRegistry();
      const summary = registry.getSummary();
      
      console.error(`\n╔════════════════════════════════════════════╗`);
      console.error(`║   AI FileSystem MCP Server v3.0 Started    ║`);
      console.error(`╠════════════════════════════════════════════╣`);
      console.error(`║ Total Commands: ${String(summary.total).padEnd(27)}║`);
      console.error(`╠════════════════════════════════════════════╣`);
      console.error(`║ Commands by Category:                      ║`);
      
      for (const [category, count] of Object.entries(summary.byCategory)) {
        const line = `║   ${category}: ${String(count).padEnd(37 - category.length)}║`;
        console.error(line);
      }
      
      console.error(`╚════════════════════════════════════════════╝\n`);
    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    console.error('Cleaning up resources...');
    await this.container.cleanup();
    console.error('Cleanup complete.');
  }
}
