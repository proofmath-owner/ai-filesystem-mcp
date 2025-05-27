#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

import { FileSystemManager } from './core/FileSystemManager.js';
import { createCommandRegistry } from './core/commands/index.js';
import { createLegacyCommandsRegistry } from './legacy/LegacyCommands.js';

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

// FileSystem 매니저 인스턴스
const fsManager = new FileSystemManager();

// Command Registry 초기화
const commandRegistry = createCommandRegistry();

// Legacy commands 임시 등록 (점진적 마이그레이션)
const legacyRegistry = createLegacyCommandsRegistry(fsManager);

// 도구 목록 요청 처리
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // 새 명령어 시스템의 도구들
  const newTools = commandRegistry.getAllTools();
  
  // Legacy 도구들 (아직 마이그레이션되지 않은 것들)
  const legacyTools = legacyRegistry.tools;
  
  // 모든 도구 합치기
  const allTools = [...newTools, ...legacyTools];
  
  return { tools: allTools };
});

// 도구 실행 요청 처리
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // args가 없거나 객체가 아닌 경우 에러
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments');
    }

    // 새 명령어 시스템에서 찾기
    if (commandRegistry.has(name)) {
      return await commandRegistry.execute(name, {
        args,
        fsManager
      });
    }

    // Legacy 시스템에서 찾기
    const legacyHandler = legacyRegistry.handlers.get(name);
    if (legacyHandler) {
      return await legacyHandler(args);
    }

    // 명령어를 찾을 수 없음
    throw new Error(`Unknown tool: ${name}`);

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
  await fsManager.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await fsManager.cleanup();
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
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error(`AI FileSystem MCP Server v2.0 started`);
    console.error(`- New commands: ${commandRegistry.size}`);
    console.error(`- Legacy commands: ${legacyRegistry.handlers.size}`);
    console.error(`- Total commands: ${commandRegistry.size + legacyRegistry.handlers.size}`);
    
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
