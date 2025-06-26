import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FileService } from '../../../core/services/file/FileService.js';
import { FileOperations } from '../../../core/services/file/FileOperations.js';
import { FileCache } from '../../../core/services/file/FileCache.js';
import { MonitoringManager } from '../../../core/managers/MonitoringManager.js';

// Mock dependencies
jest.mock('../../../core/services/file/FileOperations.js');
jest.mock('../../../core/services/file/FileCache.js');
jest.mock('../../../core/managers/MonitoringManager.js');

describe('FileService', () => {
  let fileService: FileService;
  let mockFileOps: jest.Mocked<FileOperations>;
  let mockCache: jest.Mocked<FileCache>;
  let mockMonitor: jest.Mocked<MonitoringManager>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockFileOps = new FileOperations() as jest.Mocked<FileOperations>;
    mockCache = new FileCache({} as any) as jest.Mocked<FileCache>;
    mockMonitor = new MonitoringManager() as jest.Mocked<MonitoringManager>;

    // Create service instance
    fileService = new FileService(mockFileOps, mockCache, mockMonitor);
  });

  describe('readFile', () => {
    it('should return cached content if available', async () => {
      // Arrange
      const path = '/test/file.txt';
      const cachedContent = 'cached content';
      mockCache.has.mockReturnValue(true);
      mockCache.get.mockReturnValue(cachedContent);

      // Act
      const result = await fileService.readFile(path);

      // Assert
      expect(result).toBe(cachedContent);
      expect(mockCache.has).toHaveBeenCalledWith(path);
      expect(mockCache.get).toHaveBeenCalledWith(path);
      expect(mockFileOps.readFile).not.toHaveBeenCalled();
      expect(mockMonitor.trackOperation).toHaveBeenCalledWith('file', 'read', expect.any(Number));
    });

    it('should read from disk if not cached', async () => {
      // Arrange
      const path = '/test/file.txt';
      const fileContent = 'file content from disk';
      mockCache.has.mockReturnValue(false);
      mockFileOps.readFile.mockResolvedValue(fileContent);

      // Act
      const result = await fileService.readFile(path);

      // Assert
      expect(result).toBe(fileContent);
      expect(mockCache.has).toHaveBeenCalledWith(path);
      expect(mockFileOps.readFile).toHaveBeenCalledWith(path);
      expect(mockCache.set).toHaveBeenCalledWith(path, fileContent);
      expect(mockMonitor.trackOperation).toHaveBeenCalledWith('file', 'read', expect.any(Number));
    });

    it('should track error on failure', async () => {
      // Arrange
      const path = '/test/file.txt';
      const error = new Error('File not found');
      mockCache.has.mockReturnValue(false);
      mockFileOps.readFile.mockRejectedValue(error);

      // Act & Assert
      await expect(fileService.readFile(path)).rejects.toThrow('File not found');
      expect(mockMonitor.trackError).toHaveBeenCalledWith('file', 'read', error);
    });
  });

  describe('writeFile', () => {
    it('should write file and update cache', async () => {
      // Arrange
      const path = '/test/file.txt';
      const content = 'new content';
      mockFileOps.writeFile.mockResolvedValue();

      // Act
      await fileService.writeFile(path, content);

      // Assert
      expect(mockFileOps.writeFile).toHaveBeenCalledWith(path, content);
      expect(mockCache.set).toHaveBeenCalledWith(path, content);
      expect(mockMonitor.trackOperation).toHaveBeenCalledWith('file', 'write', expect.any(Number));
    });

    it('should track error on failure', async () => {
      // Arrange
      const path = '/test/file.txt';
      const content = 'new content';
      const error = new Error('Permission denied');
      mockFileOps.writeFile.mockRejectedValue(error);

      // Act & Assert
      await expect(fileService.writeFile(path, content)).rejects.toThrow('Permission denied');
      expect(mockMonitor.trackError).toHaveBeenCalledWith('file', 'write', error);
    });
  });

  describe('updateFile', () => {
    it('should update file and clear cache', async () => {
      // Arrange
      const path = '/test/file.txt';
      const updates = [{ oldText: 'old', newText: 'new' }];
      mockFileOps.updateFile.mockResolvedValue();

      // Act
      await fileService.updateFile(path, updates);

      // Assert
      expect(mockFileOps.updateFile).toHaveBeenCalledWith(path, updates);
      expect(mockCache.delete).toHaveBeenCalledWith(path);
      expect(mockMonitor.trackOperation).toHaveBeenCalledWith('file', 'update', expect.any(Number));
    });
  });

  describe('moveFile', () => {
    it('should move file and clear both caches', async () => {
      // Arrange
      const source = '/test/old.txt';
      const destination = '/test/new.txt';
      mockFileOps.moveFile.mockResolvedValue();

      // Act
      await fileService.moveFile(source, destination);

      // Assert
      expect(mockFileOps.moveFile).toHaveBeenCalledWith(source, destination);
      expect(mockCache.delete).toHaveBeenCalledWith(source);
      expect(mockCache.delete).toHaveBeenCalledWith(destination);
      expect(mockMonitor.trackOperation).toHaveBeenCalledWith('file', 'move', expect.any(Number));
    });
  });

  describe('readFiles', () => {
    it('should read multiple files and return results', async () => {
      // Arrange
      const paths = ['/test/file1.txt', '/test/file2.txt'];
      mockCache.has.mockReturnValue(false);
      mockFileOps.readFile
        .mockResolvedValueOnce('content1')
        .mockResolvedValueOnce('content2');

      // Act
      const results = await fileService.readFiles(paths);

      // Assert
      expect(results).toEqual([
        { path: '/test/file1.txt', content: 'content1' },
        { path: '/test/file2.txt', content: 'content2' }
      ]);
    });

    it('should handle errors for individual files', async () => {
      // Arrange
      const paths = ['/test/file1.txt', '/test/file2.txt'];
      mockCache.has.mockReturnValue(false);
      mockFileOps.readFile
        .mockResolvedValueOnce('content1')
        .mockRejectedValueOnce(new Error('File not found'));

      // Act
      const results = await fileService.readFiles(paths);

      // Assert
      expect(results).toEqual([
        { path: '/test/file1.txt', content: 'content1' },
        { path: '/test/file2.txt', error: 'File not found' }
      ]);
    });
  });
});
