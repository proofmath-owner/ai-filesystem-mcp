import { CompressFilesCommand, ExtractArchiveCommand } from '../../../commands/implementations/archive/ArchiveCommands';
import { ServiceContainer } from '../../../core/ServiceContainer';
import { CompressionService } from '../../../core/services/compression/CompressionService';

describe('Archive Commands', () => {
  let container: ServiceContainer;
  let mockCompressionService: jest.Mocked<CompressionService>;

  beforeEach(async () => {
    container = new ServiceContainer();
    
    // Create mock compression service
    mockCompressionService = {
      compressFiles: jest.fn(),
      extractArchive: jest.fn(),
      listArchiveContents: jest.fn(),
      getSupportedFormats: jest.fn(),
      initialize: jest.fn(),
      dispose: jest.fn(),
    } as any;

    container.register('compressionService', mockCompressionService);
  });

  afterEach(async () => {
    await container.dispose();
    jest.clearAllMocks();
  });

  describe('CompressFilesCommand', () => {
    let command: CompressFilesCommand;

    beforeEach(() => {
      command = new CompressFilesCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('compress_files');
      expect(schema.description).toContain('Compress files');
      expect(schema.inputSchema.properties).toHaveProperty('files');
      expect(schema.inputSchema.properties).toHaveProperty('outputPath');
    });

    it('should validate required arguments', () => {
      const result = command.validateArgs({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Files are required');
      expect(result.errors).toContain('Output path is required');
    });

    it('should validate files argument is array', () => {
      const result = command.validateArgs({
        files: 'not-an-array',
        outputPath: '/test/archive.zip'
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Files must be an array');
    });

    it('should execute compression successfully', async () => {
      const args = {
        files: ['/test/file1.txt', '/test/file2.txt', '/test/dir/'],
        outputPath: '/test/archive.zip',
        compressionLevel: 6,
        format: 'zip' as const
      };

      const mockResult = {
        success: true,
        archivePath: '/test/archive.zip',
        originalSize: 2048,
        compressedSize: 1024,
        compressionRatio: 0.5,
        filesProcessed: 3,
        format: 'zip' as const
      };

      mockCompressionService.compressFiles.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockCompressionService.compressFiles).toHaveBeenCalledWith(
        ['/test/file1.txt', '/test/file2.txt', '/test/dir/'],
        '/test/archive.zip',
        {
          compressionLevel: 6,
          format: 'zip'
        }
      );
      expect(result.content[0].text).toContain('Files compressed successfully');
      expect(result.content[0].text).toContain('3 files processed');
      expect(result.content[0].text).toContain('Compression ratio: 50%');
      expect(result.content[0].text).toContain('2048 bytes → 1024 bytes');
    });

    it('should handle compression with different formats', async () => {
      const args = {
        files: ['/test/data/'],
        outputPath: '/test/backup.tar.gz',
        format: 'tar.gz' as const
      };

      const mockResult = {
        success: true,
        archivePath: '/test/backup.tar.gz',
        originalSize: 4096,
        compressedSize: 1536,
        compressionRatio: 0.625,
        filesProcessed: 15,
        format: 'tar.gz' as const
      };

      mockCompressionService.compressFiles.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockCompressionService.compressFiles).toHaveBeenCalledWith(
        ['/test/data/'],
        '/test/backup.tar.gz',
        {
          format: 'tar.gz'
        }
      );
      expect(result.content[0].text).toContain('tar.gz format');
    });

    it('should handle compression errors', async () => {
      const args = {
        files: ['/test/nonexistent.txt'],
        outputPath: '/test/archive.zip'
      };

      mockCompressionService.compressFiles.mockRejectedValue(new Error('File not found'));

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File not found');
    });

    it('should handle empty files array', async () => {
      const args = {
        files: [],
        outputPath: '/test/empty.zip'
      };

      const result = command.validateArgs(args);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one file is required');
    });
  });

  describe('ExtractArchiveCommand', () => {
    let command: ExtractArchiveCommand;

    beforeEach(() => {
      command = new ExtractArchiveCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('extract_archive');
      expect(schema.description).toContain('Extract archive');
      expect(schema.inputSchema.properties).toHaveProperty('archivePath');
      expect(schema.inputSchema.properties).toHaveProperty('outputDirectory');
    });

    it('should validate required arguments', () => {
      const result = command.validateArgs({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Archive path is required');
      expect(result.errors).toContain('Output directory is required');
    });

    it('should execute extraction successfully', async () => {
      const args = {
        archivePath: '/test/archive.zip',
        outputDirectory: '/test/extracted/',
        overwrite: true
      };

      const mockResult = {
        success: true,
        extractedPath: '/test/extracted/',
        filesExtracted: 5,
        totalSize: 2048,
        format: 'zip' as const,
        files: [
          '/test/extracted/file1.txt',
          '/test/extracted/file2.txt',
          '/test/extracted/dir/file3.txt'
        ]
      };

      mockCompressionService.extractArchive.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockCompressionService.extractArchive).toHaveBeenCalledWith(
        '/test/archive.zip',
        '/test/extracted/',
        {
          overwrite: true
        }
      );
      expect(result.content[0].text).toContain('Archive extracted successfully');
      expect(result.content[0].text).toContain('5 files extracted');
      expect(result.content[0].text).toContain('Total size: 2048 bytes');
      expect(result.content[0].text).toContain('file1.txt');
      expect(result.content[0].text).toContain('file2.txt');
    });

    it('should handle extraction with selective files', async () => {
      const args = {
        archivePath: '/test/large-archive.tar.gz',
        outputDirectory: '/test/partial/',
        selectedFiles: ['important.txt', 'config/settings.json']
      };

      const mockResult = {
        success: true,
        extractedPath: '/test/partial/',
        filesExtracted: 2,
        totalSize: 512,
        format: 'tar.gz' as const,
        files: [
          '/test/partial/important.txt',
          '/test/partial/config/settings.json'
        ]
      };

      mockCompressionService.extractArchive.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockCompressionService.extractArchive).toHaveBeenCalledWith(
        '/test/large-archive.tar.gz',
        '/test/partial/',
        {
          selectedFiles: ['important.txt', 'config/settings.json']
        }
      );
      expect(result.content[0].text).toContain('2 files extracted');
    });

    it('should handle password-protected archives', async () => {
      const args = {
        archivePath: '/test/protected.zip',
        outputDirectory: '/test/secure/',
        password: 'secretpassword'
      };

      const mockResult = {
        success: true,
        extractedPath: '/test/secure/',
        filesExtracted: 3,
        totalSize: 1024,
        format: 'zip' as const,
        files: [
          '/test/secure/confidential.txt',
          '/test/secure/data.json'
        ]
      };

      mockCompressionService.extractArchive.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockCompressionService.extractArchive).toHaveBeenCalledWith(
        '/test/protected.zip',
        '/test/secure/',
        {
          password: 'secretpassword'
        }
      );
      expect(result.content[0].text).toContain('Password-protected archive');
    });

    it('should handle extraction errors', async () => {
      const args = {
        archivePath: '/test/corrupted.zip',
        outputDirectory: '/test/output/'
      };

      mockCompressionService.extractArchive.mockRejectedValue(new Error('Archive is corrupted'));

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Archive is corrupted');
    });

    it('should handle wrong password', async () => {
      const args = {
        archivePath: '/test/protected.zip',
        outputDirectory: '/test/output/',
        password: 'wrongpassword'
      };

      mockCompressionService.extractArchive.mockRejectedValue(new Error('Invalid password'));

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid password');
    });

    it('should handle destination directory creation', async () => {
      const args = {
        archivePath: '/test/archive.zip',
        outputDirectory: '/test/new-dir/',
        createDirectory: true
      };

      const mockResult = {
        success: true,
        extractedPath: '/test/new-dir/',
        filesExtracted: 2,
        totalSize: 512,
        format: 'zip' as const,
        files: ['/test/new-dir/file1.txt']
      };

      mockCompressionService.extractArchive.mockResolvedValue(mockResult);

      const context = { container, args };
      await command.executeCommand(context);

      expect(mockCompressionService.extractArchive).toHaveBeenCalledWith(
        '/test/archive.zip',
        '/test/new-dir/',
        {
          createDirectory: true
        }
      );
    });
  });
});