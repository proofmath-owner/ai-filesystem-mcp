import { 
  ReadFileCommand, 
  WriteFileCommand, 
  UpdateFileCommand,
  MoveFileCommand,
  ReadFilesCommand 
} from '../../../src/core/commands/file/FileCommands';
import { CommandContext } from '../../../src/core/commands/Command';

describe('FileCommands', () => {
  let mockFsManager: any;
  let context: CommandContext;

  beforeEach(() => {
    mockFsManager = {
      readFile: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'file content' }]
      }),
      readFiles: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'multiple files content' }]
      }),
      writeFile: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Successfully wrote to test.txt' }]
      }),
      updateFile: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Successfully updated test.txt with 1 changes' }]
      }),
      moveFile: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Successfully moved file: src.txt -> dest.txt' }]
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
      context = { args: {}, fsManager: mockFsManager };
      
      const result = await command.execute(context);
      
      expect(result.content[0].text).toContain('Error: path is required and must be a string');
    });

    it('should execute successfully with valid path', async () => {
      context = { args: { path: 'test.txt' }, fsManager: mockFsManager };
      
      const result = await command.execute(context);
      
      expect(mockFsManager.readFile).toHaveBeenCalledWith('test.txt');
      expect(result.content[0].text).toBe('file content');
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
      context = { args: { path: 'test.txt' }, fsManager: mockFsManager };
      
      const result = await command.execute(context);
      
      expect(result.content[0].text).toContain('Error: content is required and must be a string');
    });

    it('should execute successfully with valid arguments', async () => {
      context = { 
        args: { path: 'test.txt', content: 'Hello World' }, 
        fsManager: mockFsManager 
      };
      
      const result = await command.execute(context);
      
      expect(mockFsManager.writeFile).toHaveBeenCalledWith('test.txt', 'Hello World');
      expect(result.content[0].text).toBe('Successfully wrote to test.txt');
    });
  });

  describe('UpdateFileCommand', () => {
    let command: UpdateFileCommand;

    beforeEach(() => {
      command = new UpdateFileCommand();
    });

    it('should validate updates array is required', async () => {
      context = { args: { path: 'test.txt' }, fsManager: mockFsManager };
      
      const result = await command.execute(context);
      
      expect(result.content[0].text).toContain('Error: updates is required and must be an array');
    });

    it('should execute successfully with valid updates', async () => {
      context = { 
        args: { 
          path: 'test.txt', 
          updates: [{ oldText: 'foo', newText: 'bar' }] 
        }, 
        fsManager: mockFsManager 
      };
      
      const result = await command.execute(context);
      
      expect(mockFsManager.updateFile).toHaveBeenCalledWith(
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
      context = { args: { source: 'src.txt' }, fsManager: mockFsManager };
      
      const result = await command.execute(context);
      
      expect(result.content[0].text).toContain('Error: destination is required and must be a string');
    });

    it('should execute successfully with valid arguments', async () => {
      context = { 
        args: { source: 'src.txt', destination: 'dest.txt' }, 
        fsManager: mockFsManager 
      };
      
      const result = await command.execute(context);
      
      expect(mockFsManager.moveFile).toHaveBeenCalledWith('src.txt', 'dest.txt');
      expect(result.content[0].text).toBe('Successfully moved file: src.txt -> dest.txt');
    });
  });

  describe('ReadFilesCommand', () => {
    let command: ReadFilesCommand;

    beforeEach(() => {
      command = new ReadFilesCommand();
    });

    it('should validate paths array is required', async () => {
      context = { args: { paths: 'not-an-array' }, fsManager: mockFsManager };
      
      const result = await command.execute(context);
      
      expect(result.content[0].text).toContain('Error: paths is required and must be an array');
    });

    it('should execute successfully with valid paths array', async () => {
      context = { 
        args: { paths: ['file1.txt', 'file2.txt'] }, 
        fsManager: mockFsManager 
      };
      
      const result = await command.execute(context);
      
      expect(mockFsManager.readFiles).toHaveBeenCalledWith(['file1.txt', 'file2.txt']);
      expect(result.content[0].text).toBe('multiple files content');
    });
  });
});