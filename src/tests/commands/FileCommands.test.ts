/// <reference types="jest" />

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ReadFileCommand } from '../../commands/implementations/file/ReadFileCommand.js';
import { CommandContext } from '../../core/interfaces/ICommand.js';

describe('FileCommands', () => {
  let mockFsManager: {
    readFile: jest.Mock<Promise<any>, [string]>;
    writeFile: jest.Mock<Promise<any>, [string, string]>;
  };
  let mockContainer: {
    getService: jest.Mock<any, [string]>;
  };
  let context: CommandContext;

  beforeEach(() => {
    mockFsManager = {
      readFile: jest.fn<Promise<any>, [string]>().mockResolvedValue({
        content: [{ type: 'text', text: 'test content' }]
      }),
      writeFile: jest.fn<Promise<any>, [string, string]>().mockResolvedValue({
        content: [{ type: 'text', text: 'File written successfully' }]
      })
    };
    
    mockContainer = {
      getService: jest.fn<any, [string]>().mockReturnValue(mockFsManager)
    };
  });

  describe('ReadFileCommand', () => {
    it('should have correct metadata', () => {
      const cmd = new ReadFileCommand();
      expect(cmd.name).toBe('read_file');
      expect(cmd.description).toBe('Read the contents of a file (with intelligent caching)');
      expect(cmd.inputSchema.required).toContain('path');
    });

    it('should validate required path argument', async () => {
      const cmd = new ReadFileCommand();
      context = { args: {}, container: mockContainer as any };
      
      const result = await cmd.execute(context);
      expect(result.content?.[0]?.text).toContain('Error');
    });

    it('should execute successfully with valid args', async () => {
      const cmd = new ReadFileCommand();
      context = { args: { path: 'test.txt' }, container: mockContainer as any };
      
      const result = await cmd.execute(context);
      expect(mockFsManager.readFile).toHaveBeenCalledWith('test.txt');
      expect(result.content?.[0]?.text).toBe('test content');
    });
  });
});
