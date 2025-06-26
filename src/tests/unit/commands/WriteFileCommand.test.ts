import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { WriteFileCommand } from '../../../commands/implementations/file/WriteFileCommand.js';
import { CommandContext } from '../../../core/interfaces/ICommand.js';
import { IFileService } from '../../../core/interfaces/IFileService.js';

describe('WriteFileCommand', () => {
  let command: WriteFileCommand;
  let mockFileService: jest.Mocked<IFileService>;
  let mockContainer: any;

  beforeEach(() => {
    jest.clearAllMocks();

    command = new WriteFileCommand();
    
    // Mock file service
    mockFileService = {
      readFile: jest.fn(),
      readFiles: jest.fn(),
      writeFile: jest.fn(),
      updateFile: jest.fn(),
      moveFile: jest.fn(),
      deleteFile: jest.fn(),
      copyFile: jest.fn(),
      exists: jest.fn(),
      getStats: jest.fn()
    };

    // Mock service container
    mockContainer = {
      getService: jest.fn().mockReturnValue(mockFileService)
    };
  });

  describe('command properties', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('write_file');
    });

    it('should have correct description', () => {
      expect(command.description).toBe('Write content to a file');
    });

    it('should have correct input schema', () => {
      expect(command.inputSchema).toEqual({
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to write' },
          content: { type: 'string', description: 'Content to write' }
        },
        required: ['path', 'content']
      });
    });
  });

  describe('execute', () => {
    it('should write file successfully', async () => {
      // Arrange
      const path = '/test/file.txt';
      const content = 'New content';
      const context: CommandContext = {
        args: { path, content },
        container: mockContainer
      };
      
      mockFileService.writeFile.mockResolvedValue();

      // Act
      const result = await command.execute(context);

      // Assert
      expect(mockContainer.getService).toHaveBeenCalledWith('fileService');
      expect(mockFileService.writeFile).toHaveBeenCalledWith(path, content);
      expect(result).toEqual({        data: `Successfully wrote to ${path}`
      });
    });

    it('should validate path is string', async () => {
      // Arrange
      const context: CommandContext = {
        args: { path: 123, content: 'content' }, // Invalid path type
        container: mockContainer
      };

      // Act & Assert
      await expect(command.execute(context)).rejects.toThrow('path must be a string');
    });

    it('should validate content is string', async () => {
      // Arrange
      const context: CommandContext = {
        args: { path: '/test/file.txt', content: 123 }, // Invalid content type
        container: mockContainer
      };

      // Act & Assert
      await expect(command.execute(context)).rejects.toThrow('content must be a string');
    });

    it('should handle file service errors', async () => {
      // Arrange
      const path = '/test/file.txt';
      const content = 'New content';
      const context: CommandContext = {
        args: { path, content },
        container: mockContainer
      };
      
      mockFileService.writeFile.mockRejectedValue(new Error('Permission denied'));

      // Act & Assert
      await expect(command.execute(context)).rejects.toThrow('Permission denied');
    });
  });
});
