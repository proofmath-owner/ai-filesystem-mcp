#!/usr/bin/env node

/**
 * AI FileSystem MCP Server v3.0
 * 
 * This is the new modularized entry point for the AI FileSystem MCP server.
 * It uses a clean architecture with:
 * - Service-based design with dependency injection
 * - Command pattern for all operations
 * - Proper error handling and monitoring
 * - Easy extensibility and testability
 */

import { MCPServer } from './server/MCPServer.js';

// Global flag to track if we're shutting down
let isShuttingDown = false;

async function main() {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
AI FileSystem MCP Server v3.0

A powerful Model Context Protocol server for file system operations.

Usage:
  node index-new.js [options]

Options:
  -h, --help     Show this help message
  -v, --version  Show version information

For more information, visit: https://github.com/your-repo/ai-filesystem-mcp
`);
    process.exit(0);
  }

  // Check for version flag
  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    console.log('AI FileSystem MCP Server v3.0');
    process.exit(0);
  }

  const server = new MCPServer();
  
  // Prevent multiple shutdown attempts
  const shutdown = async (code: number = 0) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    try {
      await server.cleanup();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    
    process.exit(code);
  };

  // Setup global error handlers
  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
  
  try {
    await server.start();
    
    // Keep the process alive
    process.stdin.resume();
  } catch (error) {
    console.error('Failed to start server:', error);
    await shutdown(1);
  }
}

// Start the server
main().catch(async (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
