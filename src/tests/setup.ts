// Test setup and global configurations
import { jest } from '@jest/globals';

// Mock console methods to avoid noise in test output
global.console = {
  ...console,
  // Keep console.error for important error messages
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

// Setup test timeout
jest.setTimeout(30000);

// Global test utilities
global.mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  stat: jest.fn(),
  readdir: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
  rmdir: jest.fn(),
};

// Setup environment variables for testing
process.env.NODE_ENV = 'test';
process.env.MCP_SECURITY_LEVEL = 'moderate';
process.env.MCP_CACHE_ENABLED = 'false';