/// <reference types="jest" />

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ReadFileCommand } from '../../../commands/implementations/file/ReadFileCommand.js';
import { WriteFileCommand } from '../../../commands/implementations/file/WriteFileCommand.js';
import { UpdateFileCommand } from '../../../commands/implementations/file/UpdateFileCommand.js';
import { MoveFileCommand } from '../../../commands/implementations/file/MoveFileCommand.js';
import { ReadFilesCommand } from '../../../commands/implementations/file/ReadFilesCommand.js';
import { CommandContext } from '../../../core/interfaces/ICommand.js';

describe('FileCommands', () => {
  let mockFileService: {
    readFile: jest.Mock<Promise<any>, [string]>;
    readFiles: jest.Mock<Promise<any>, [string[]]>;
    writeFile: jest.Mock<Promise<any>, [string, string]>;
    updateFile: jest.Mock<Promise<any>, [string, Array<{oldText: string; newText: string}>]>;
    moveFile: jest.Mock<Promise<any>, [string, string]>;
  };
  let mockContainer: {
    getService: jest.Mock<any, [string]>;
  };
  let context: CommandContext;

  beforeEach(() => {
    mockFileService = {
      readFile: jest.fn<Promise<any>, [string]>().mockResolvedValue({
        content: [{ type: 'text', text: 'file content' }]
      }),
      readFiles: jest.fn<Promise<any>, [string[]]>().mockResolvedValue({
        content: [{ type: 'text', text: 'multiple files content' }]
      }),
      writeFile: jest.fn<Promise<any>, [string, string]>().mockResolvedValue({
        content: [{ type: 'text', text: 'Successfully wrote to test.txt' }]
      }),
      updateFile: jest.fn<Promise<any>, [string, Array<{oldText: string; newText: string}>]>().mockResolvedValue({
        content: [{ type: 'text', text: 'Successfully updated test.txt with 1 changes' }]
      }),
      moveFile: jest.fn<Promise<any>, [string, string]>().mockResolvedValue({
        content: [{ type: 'text', text: 'Successfully moved file: src.txt -> dest.txt' }]
      })
    };
    
    mockContainer = {
      getService: jest.fn<any, [string]>().mockImplementation((serviceName: string) => {
        if (serviceName === 'fileService') {
          return mockFileService;
        }
        return mockFileService;
      })
    };
  });

  describe('ReadFileCommand', () => {
    let command: ReadFileCommand;

    beforeEach(() => {
      command = new ReadFileCommand();
    });

    it('should have correct metadata', () => {
      expect(command.name).toBe('read_file');
      expect(command.description).toBe('Read the contents of a file (with intelligent caching)');
      expect(command.inputSchema.required).toContain('path');
    });

    it('should validate path is required', async () => {
      context = { args: {}, container: mockContainer as any };
      
      const result = await command.execute(context);
      
      expect(result.content?.[0]?.text).toContain('Error');
    });

    it('should execute successfully with valid path', async () => {
      context = { args: { path: 'test.txt' }, container: mockContainer as any };
      
      const result = await command.execute(context);
      
      expect(mockFileService.readFile).toHaveBeenCalledWith('test.txt');
      expect(result.content?.[0]?.text).toBe('file content');
    });
  });

  describe('WriteFileCommand', () => {
    let command: WriteFileCommand;

    beforeEach(() => {
      command = new WriteFileCommand();
    });

    it('should have correct metadata', () => {
      expect(command.name).toBe('write_file');
      expect(command.description).toBe('Write content to a file');
      expect(command.inputSchema.required).toContain('path');
      expect(command.inputSchema.required).toContain('content');
    });

    it('should validate required arguments', async () => {
      context = { args: { path: 'test.txt' }, container: mockContainer as any };
      
      const result = await command.execute(context);
      
      expect(result.content?.[0]?.text).toContain('Error');
    });

    it('should execute successfully with valid arguments', async () => {
      context = { 
        args: { path: 'test.txt', content: 'Hello World' }, 
        container: mockContainer as any
      };
      
      const result = await command.execute(context);
      
      expect(mockFileService.writeFile).toHaveBeenCalledWith('test.txt', 'Hello World');
      expect(result.content?.[0]?.text).toBe('Successfully wrote to test.txt');
    });
  });

  describe('UpdateFileCommand', () => {
    let command: UpdateFileCommand;

    beforeEach(() => {
      command = new UpdateFileCommand();
    });

    it('should validate updates array is required', async () => {
      context = { args: { path: 'test.txt' }, container: mockContainer as any };
      
      const result = await command.execute(context);
      
      expect(result.content?.[0]?.text).toContain('Error');
    });

    it('should execute successfully with valid updates', async () => {
      context = { 
        args: { 
          path: 'test.txt', 
          updates: [{ oldText: 'foo', newText: 'bar' }] 
        }, 
        container: mockContainer as any
      };
      
      const result = await command.execute(context);
      
      expect(mockFileService.updateFile).toHaveBeenCalledWith(
        'test.txt', 
        [{ oldText: 'foo', newText: 'bar' }]
      );
    });
  });

  describe('MoveFileCommand', () => {
    let command: MoveFileCommand;

    beforeEach(() => {
      command = new MoveFileCommand();
    });

    it('should validate source and destination are required', async () => {
      context = { args: { source: 'src.txt' }, container: mockContainer as any };
      
      const result = await command.execute(context);
      
      expect(result.content?.[0]?.text).toContain('Error');
    });

    it('should execute successfully with valid arguments', async () => {
      context = { 
        args: { source: 'src.txt', destination: 'dest.txt' }, 
        container: mockContainer as any
      };
      
      const result = await command.execute(context);
      
      expect(mockFileService.moveFile).toHaveBeenCalledWith('src.txt', 'dest.txt');
      expect(result.content?.[0]?.text).toBe('Successfully moved file: src.txt -> dest.txt');
    });
  });

  describe('ReadFilesCommand', () => {
    let command: ReadFilesCommand;

    beforeEach(() => {
      command = new ReadFilesCommand();
    });

    it('should validate paths array is required', async () => {
      context = { args: { paths: 'not-an-array' }, container: mockContainer as any };
      
      const result = await command.execute(context);
      
      expect(result.content?.[0]?.text).toContain('Error');
    });

    it('should execute successfully with valid paths array', async () => {
      context = { 
        args: { paths: ['file1.txt', 'file2.txt'] }, 
        container: mockContainer as any
      };
      
      const result = await command.execute(context);
      
      expect(mockFileService.readFiles).toHaveBeenCalledWith(['file1.txt', 'file2.txt']);
      expect(result.content?.[0]?.text).toBe('multiple files content');
    });
  });
});
