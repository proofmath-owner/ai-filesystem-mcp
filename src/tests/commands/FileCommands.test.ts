import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ReadFileCommand } from '../src/core/commands/file/FileCommands.js';
import { CommandContext } from '../src/core/commands/Command.js';

describe('FileCommands', () => {
  let mockFsManager: any;
  let context: CommandContext;

  beforeEach(() => {
    mockFsManager = {
      readFile: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'test content' }]
      }),
      writeFile: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'File written successfully' }]
      })
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
      context = { args: {}, fsManager: mockFsManager };
      
      const result = await cmd.execute(context);
      expect(result.content[0].text).toContain('Error: path is required');
    });

    it('should execute successfully with valid args', async () => {
      const cmd = new ReadFileCommand();
      context = { args: { path: 'test.txt' }, fsManager: mockFsManager };
      
      const result = await cmd.execute(context);
      expect(mockFsManager.readFile).toHaveBeenCalledWith('test.txt');
      expect(result.content[0].text).toBe('test content');
    });
  });
});