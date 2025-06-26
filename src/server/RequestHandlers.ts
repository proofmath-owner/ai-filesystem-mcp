import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { ServiceContainer } from '../core/ServiceContainer.js';
import { ErrorHandler } from './ErrorHandler.js';

export class RequestHandlers {
  constructor(
    private container: ServiceContainer,
    private errorHandler: ErrorHandler
  ) {}

  setupHandlers(server: Server): void {
    // Handle tool list requests
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const registry = this.container.getCommandRegistry();
      return { tools: registry.getAllTools() };
    });

    // Handle tool execution requests
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments');
        }

        const registry = this.container.getCommandRegistry();
        
        if (!registry.has(name)) {
          throw new Error(`Unknown tool: ${name}`);
        }

        // Execute command with context
        const result = await registry.execute(name, {
          args,
          container: this.container
        });

        return result;
      } catch (error) {
        return this.errorHandler.handleError(error);
      }
    });
  }
}
