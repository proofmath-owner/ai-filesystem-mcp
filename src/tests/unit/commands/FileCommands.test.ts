import { WriteFileCommand, ReadFileCommand, UpdateFileCommand, MoveFileCommand, ReadFilesCommand } from '../../../commands/implementations/file/index.js';
import { CommandContext } from '../../../core/interfaces/ICommand.js';
import { ServiceContainer } from '../../../core/ServiceContainer.js';

// Mock the file service
const mockFileService = {
  readFile: jest.fn(),
  readFiles: jest.fn(),
  writeFile: jest.fn(),
  updateFile: jest.fn(),
  moveFile: jest.fn(),
  copyFile: jest.fn(),
  deleteFile: jest.fn(),
  exists: jest.fn(),
  getStats: jest.fn()
};

describe('File Commands', () => {
  let container: ServiceContainer;
  let context: CommandContext;

  beforeEach(() => {
    container = new ServiceContainer();
    container.register('fileService', mockFileService);
    
    context = {
      container,
      args: {}
    };

    jest.clearAllMocks();
  });

  describe('WriteFileCommand', () => {
    let command: WriteFileCommand;

    beforeEach(() => {
      command = new WriteFileCommand();
    });

    it('should have correct name and description', () => {
      expect(command.name).toBe('write_file');
      expect(command.description).toBe('Write content to a file');
    });

    it('should have correct input schema', () => {
      expect(command.inputSchema.properties).toHaveProperty('path');
      expect(command.inputSchema.properties).toHaveProperty('content');
      expect(command.inputSchema.required).toContain('path');
      expect(command.inputSchema.required).toContain('content');
    });

    it('should validate args correctly', () => {
      expect(() => command['validateArgs']({ 
        path: '/test/file.txt', 
        content: 'test content' 
      })).not.toThrow();
    });

    it('should throw error for missing path', () => {
      expect(() => command['validateArgs']({ content: 'test' })).toThrow();
    });

    it('should throw error for missing content', () => {
      expect(() => command['validateArgs']({ path: '/test/file.txt' })).toThrow();
    });

    it('should execute command successfully', async () => {
      mockFileService.writeFile.mockResolvedValue(undefined);
      
      context.args = { path: '/test/file.txt', content: 'Hello World' };
      
      const result = await command['executeCommand'](context);
      
      expect(mockFileService.writeFile).toHaveBeenCalledWith('/test/file.txt', 'Hello World');
      expect(result.content[0].text).toBe('Successfully wrote to /test/file.txt');
    });

    it('should handle write errors', async () => {
      mockFileService.writeFile.mockRejectedValue(new Error('Permission denied'));
      
      context.args = { path: '/test/file.txt', content: 'Hello World' };
      
      const result = await command['executeCommand'](context);
      
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Permission denied');
    });
  });

  describe('ReadFileCommand', () => {
    let command: ReadFileCommand;

    beforeEach(() => {
      command = new ReadFileCommand();
    });

    it('should have correct name and description', () => {
      expect(command.name).toBe('read_file');
      expect(command.description).toBe('Read content from a file');
    });

    it('should validate args correctly', () => {
      expect(() => command['validateArgs']({ path: '/test/file.txt' })).not.toThrow();
    });

    it('should throw error for missing path', () => {
      expect(() => command['validateArgs']({})).toThrow();
    });

    it('should execute command successfully', async () => {
      const fileContent = 'Hello World\nThis is a test file';
      mockFileService.readFile.mockResolvedValue(fileContent);
      
      context.args = { path: '/test/file.txt' };
      
      const result = await command['executeCommand'](context);
      
      expect(mockFileService.readFile).toHaveBeenCalledWith('/test/file.txt');
      expect(result.content[0].text).toBe(fileContent);
    });

    it('should handle read errors', async () => {
      mockFileService.readFile.mockRejectedValue(new Error('File not found'));
      
      context.args = { path: '/nonexistent/file.txt' };
      
      const result = await command['executeCommand'](context);
      
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('File not found');
    });
  });

  describe('ReadFilesCommand', () => {
    let command: ReadFilesCommand;

    beforeEach(() => {
      command = new ReadFilesCommand();
    });

    it('should have correct name and description', () => {
      expect(command.name).toBe('read_files');
      expect(command.description).toBe('Read content from multiple files');
    });

    it('should validate args correctly', () => {
      expect(() => command['validateArgs']({ 
        paths: ['/test/file1.txt', '/test/file2.txt'] 
      })).not.toThrow();
    });

    it('should throw error for invalid paths argument', () => {
      expect(() => command['validateArgs']({ paths: 'not-array' })).toThrow();
    });

    it('should execute command successfully', async () => {
      const mockResults = [
        { path: '/test/file1.txt', content: 'Content 1' },
        { path: '/test/file2.txt', content: 'Content 2' }
      ];
      mockFileService.readFiles.mockResolvedValue(mockResults);
      
      context.args = { paths: ['/test/file1.txt', '/test/file2.txt'] };
      
      const result = await command['executeCommand'](context);
      
      expect(mockFileService.readFiles).toHaveBeenCalledWith(['/test/file1.txt', '/test/file2.txt']);
      expect(result.content[0].text).toContain('Content 1');
      expect(result.content[0].text).toContain('Content 2');
    });

    it('should handle partial failures', async () => {
      const mockResults = [
        { path: '/test/file1.txt', content: 'Content 1' },
        { path: '/test/file2.txt', error: 'File not found' }
      ];
      mockFileService.readFiles.mockResolvedValue(mockResults);
      
      context.args = { paths: ['/test/file1.txt', '/test/file2.txt'] };
      
      const result = await command['executeCommand'](context);
      
      expect(result.content[0].text).toContain('Content 1');
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('File not found');
    });
  });

  describe('UpdateFileCommand', () => {
    let command: UpdateFileCommand;

    beforeEach(() => {
      command = new UpdateFileCommand();
    });

    it('should have correct name and description', () => {
      expect(command.name).toBe('update_file');
      expect(command.description).toBe('Update file content with find and replace');
    });

    it('should validate args correctly', () => {
      expect(() => command['validateArgs']({ 
        path: '/test/file.txt',
        updates: [{ oldText: 'old', newText: 'new' }]
      })).not.toThrow();
    });

    it('should throw error for missing updates', () => {
      expect(() => command['validateArgs']({ 
        path: '/test/file.txt'
      })).toThrow();
    });

    it('should execute command successfully', async () => {
      mockFileService.updateFile.mockResolvedValue(undefined);
      
      context.args = { 
        path: '/test/file.txt',
        updates: [
          { oldText: 'Hello', newText: 'Hi' },
          { oldText: 'World', newText: 'Universe' }
        ]
      };
      
      const result = await command['executeCommand'](context);
      
      expect(mockFileService.updateFile).toHaveBeenCalledWith('/test/file.txt', [
        { oldText: 'Hello', newText: 'Hi' },
        { oldText: 'World', newText: 'Universe' }
      ]);
      expect(result.content[0].text).toBe('Successfully updated /test/file.txt');
    });

    it('should handle update errors', async () => {
      mockFileService.updateFile.mockRejectedValue(new Error('Pattern not found'));
      
      context.args = { 
        path: '/test/file.txt',
        updates: [{ oldText: 'nonexistent', newText: 'new' }]
      };
      
      const result = await command['executeCommand'](context);
      
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Pattern not found');
    });
  });

  describe('MoveFileCommand', () => {
    let command: MoveFileCommand;

    beforeEach(() => {
      command = new MoveFileCommand();
    });

    it('should have correct name and description', () => {
      expect(command.name).toBe('move_file');
      expect(command.description).toBe('Move or rename a file');
    });

    it('should validate args correctly', () => {
      expect(() => command['validateArgs']({ 
        source: '/test/file.txt',
        destination: '/test/newfile.txt'
      })).not.toThrow();
    });

    it('should throw error for missing source', () => {
      expect(() => command['validateArgs']({ 
        destination: '/test/newfile.txt'
      })).toThrow();
    });

    it('should throw error for missing destination', () => {
      expect(() => command['validateArgs']({ 
        source: '/test/file.txt'
      })).toThrow();
    });

    it('should execute command successfully', async () => {
      mockFileService.moveFile.mockResolvedValue(undefined);
      
      context.args = { 
        source: '/test/file.txt',
        destination: '/test/newfile.txt'
      };
      
      const result = await command['executeCommand'](context);
      
      expect(mockFileService.moveFile).toHaveBeenCalledWith('/test/file.txt', '/test/newfile.txt');
      expect(result.content[0].text).toBe('Successfully moved /test/file.txt to /test/newfile.txt');
    });

    it('should handle move errors', async () => {
      mockFileService.moveFile.mockRejectedValue(new Error('Destination already exists'));
      
      context.args = { 
        source: '/test/file.txt',
        destination: '/test/existing.txt'
      };
      
      const result = await command['executeCommand'](context);
      
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Destination already exists');
    });
  });
});