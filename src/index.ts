#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

import { ServiceContainer } from './core/ServiceContainer.js';

// MCP 서버 초기화
const server = new Server(
  {
    name: 'ai-filesystem-mcp',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Service Container 초기화
const container = new ServiceContainer();

// 도구 목록 요청 처리
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const registry = container.getCommandRegistry();
  const tools = registry.getAllTools();
  
  console.error(`Returning ${tools.length} tools`);
  return { tools };
});

// 도구 실행 요청 처리
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // args가 없거나 객체가 아닌 경우 에러
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments');
    }

    const registry = container.getCommandRegistry();
    return await registry.execute(name, {
      args,
      container
    });

  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
});

// 프로세스 종료 시 정리
process.on('SIGINT', async () => {
  await container.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await container.cleanup();
  process.exit(0);
});

// 에러 핸들링 개선
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// MCP 서버 시작
async function main() {
  try {
    // Container 초기화
    await container.initialize();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    const registry = container.getCommandRegistry();
    console.error(`AI FileSystem MCP Server v2.0 started`);
    console.error(`Total commands: ${registry.size}`);
    
    // List all commands for debugging
    const commands = registry.getAllCommands();
    console.error('Available commands:');
    commands.forEach(cmd => {
      console.error(`  - ${cmd.name}`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 서버 시작
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
