import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ReadFileCommand } from '../../../commands/implementations/file/ReadFileCommand.js';
import { CommandContext } from '../../../core/interfaces/ICommand.js';
import { IFileService } from '../../../core/interfaces/IFileService.js';

describe('ReadFileCommand', () => {
  let command: ReadFileCommand;
  let mockFileService: jest.Mocked<IFileService>;
  let mockContainer: any;

  beforeEach(() => {
    jest.clearAllMocks();

    command = new ReadFileCommand();
    
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
      expect(command.name).toBe('read_file');
    });

    it('should have correct description', () => {
      expect(command.description).toBe('Read the contents of a file (with intelligent caching)');
    });

    it('should have correct input schema', () => {
      expect(command.inputSchema).toEqual({
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to read' }
        },
        required: ['path']
      });
    });
  });

  describe('execute', () => {
    it('should read file successfully', async () => {
      // Arrange
      const path = '/test/file.txt';
      const content = 'File content';
      const context: CommandContext = {
        args: { path },
        container: mockContainer
      };
      
      mockFileService.readFile.mockResolvedValue(content);

      // Act
      const result = await command.execute(context);

      // Assert
      expect(mockContainer.getService).toHaveBeenCalledWith('fileService');
      expect(mockFileService.readFile).toHaveBeenCalledWith(path);
      expect(result).toEqual({        data: content
      });
    });

    it('should validate path is string', async () => {
      // Arrange
      const context: CommandContext = {
        args: { path: 123 }, // Invalid type
        container: mockContainer
      };

      // Act & Assert
      await expect(command.execute(context)).rejects.toThrow('path must be a string');
    });

    it('should handle file service errors', async () => {
      // Arrange
      const path = '/test/file.txt';
      const context: CommandContext = {
        args: { path },
        container: mockContainer
      };
      
      mockFileService.readFile.mockRejectedValue(new Error('File not found'));

      // Act & Assert
      await expect(command.execute(context)).rejects.toThrow('File not found');
    });
  });
});
