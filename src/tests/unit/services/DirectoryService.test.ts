import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DirectoryService } from '../../../core/services/directory/DirectoryService.js';
import { DirectoryOperations } from '../../../core/services/directory/DirectoryOperations.js';
import { MonitoringManager } from '../../../core/managers/MonitoringManager.js';

// Mock dependencies
jest.mock('../../../core/services/directory/DirectoryOperations.js');
jest.mock('../../../core/managers/MonitoringManager.js');

describe('DirectoryService', () => {
  let directoryService: DirectoryService;
  let mockDirOps: jest.Mocked<DirectoryOperations>;
  let mockMonitor: jest.Mocked<MonitoringManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDirOps = new DirectoryOperations() as jest.Mocked<DirectoryOperations>;
    mockMonitor = new MonitoringManager() as jest.Mocked<MonitoringManager>;

    directoryService = new DirectoryService(mockDirOps, mockMonitor);
  });

  describe('createDirectory', () => {
    it('should create directory with default recursive option', async () => {
      // Arrange
      const path = '/test/new-dir';
      mockDirOps.createDirectory.mockResolvedValue();

      // Act
      await directoryService.createDirectory(path);

      // Assert
      expect(mockDirOps.createDirectory).toHaveBeenCalledWith(path, undefined);
      expect(mockMonitor.trackOperation).toHaveBeenCalledWith('directory', 'create', expect.any(Number));
    });

    it('should create directory with recursive option', async () => {
      // Arrange
      const path = '/test/nested/new-dir';
      mockDirOps.createDirectory.mockResolvedValue();

      // Act
      await directoryService.createDirectory(path, { recursive: true });

      // Assert
      expect(mockDirOps.createDirectory).toHaveBeenCalledWith(path, { recursive: true });
    });

    it('should track error on failure', async () => {
      // Arrange
      const path = '/test/new-dir';
      const error = new Error('Permission denied');
      mockDirOps.createDirectory.mockRejectedValue(error);

      // Act & Assert
      await expect(directoryService.createDirectory(path)).rejects.toThrow('Permission denied');
      expect(mockMonitor.trackError).toHaveBeenCalledWith('directory', 'create', error);
    });
  });

  describe('listDirectory', () => {
    it('should list directory contents', async () => {
      // Arrange
      const path = '/test';
      const files = [
        { name: 'file1.txt', type: 'file' },
        { name: 'dir1', type: 'directory' }
      ];
      mockDirOps.listDirectory.mockResolvedValue(files);

      // Act
      const result = await directoryService.listDirectory(path);

      // Assert
      expect(result).toEqual(files);
      expect(mockDirOps.listDirectory).toHaveBeenCalledWith(path, undefined);
      expect(mockMonitor.trackOperation).toHaveBeenCalledWith('directory', 'list', expect.any(Number));
    });

    it('should list directory with detailed info', async () => {
      // Arrange
      const path = '/test';
      const detailedFiles = [
        { 
          name: 'file1.txt', 
          type: 'file',
          size: 1024,
          modified: new Date('2025-01-01'),
          created: new Date('2025-01-01')
        }
      ];
      mockDirOps.listDirectory.mockResolvedValue(detailedFiles);

      // Act
      const result = await directoryService.listDirectory(path, { detailed: true });

      // Assert
      expect(result).toEqual(detailedFiles);
      expect(mockDirOps.listDirectory).toHaveBeenCalledWith(path, { detailed: true });
    });

    it('should list directory with pattern filter', async () => {
      // Arrange
      const path = '/test';
      const files = [{ name: 'test.txt', type: 'file' }];
      mockDirOps.listDirectory.mockResolvedValue(files);

      // Act
      const result = await directoryService.listDirectory(path, { pattern: '*.txt' });

      // Assert
      expect(result).toEqual(files);
      expect(mockDirOps.listDirectory).toHaveBeenCalledWith(path, { pattern: '*.txt' });
    });
  });

  describe('removeDirectory', () => {
    it('should remove directory', async () => {
      // Arrange
      const path = '/test/old-dir';
      mockDirOps.removeDirectory.mockResolvedValue();

      // Act
      await directoryService.removeDirectory(path);

      // Assert
      expect(mockDirOps.removeDirectory).toHaveBeenCalledWith(path, undefined);
      expect(mockMonitor.trackOperation).toHaveBeenCalledWith('directory', 'remove', expect.any(Number));
    });

    it('should remove directory recursively', async () => {
      // Arrange
      const path = '/test/old-dir';
      mockDirOps.removeDirectory.mockResolvedValue();

      // Act
      await directoryService.removeDirectory(path, { recursive: true });

      // Assert
      expect(mockDirOps.removeDirectory).toHaveBeenCalledWith(path, { recursive: true });
    });
  });

  describe('copyDirectory', () => {
    it('should copy directory', async () => {
      // Arrange
      const source = '/test/source';
      const destination = '/test/destination';
      mockDirOps.copyDirectory.mockResolvedValue();

      // Act
      await directoryService.copyDirectory(source, destination);

      // Assert
      expect(mockDirOps.copyDirectory).toHaveBeenCalledWith(source, destination);
      expect(mockMonitor.trackOperation).toHaveBeenCalledWith('directory', 'copy', expect.any(Number));
    });
  });

  describe('moveDirectory', () => {
    it('should move directory', async () => {
      // Arrange
      const source = '/test/old-location';
      const destination = '/test/new-location';
      mockDirOps.moveDirectory.mockResolvedValue();

      // Act
      await directoryService.moveDirectory(source, destination);

      // Assert
      expect(mockDirOps.moveDirectory).toHaveBeenCalledWith(source, destination);
      expect(mockMonitor.trackOperation).toHaveBeenCalledWith('directory', 'move', expect.any(Number));
    });
  });

  describe('exists', () => {
    it('should return true if directory exists', async () => {
      // Arrange
      const path = '/test/existing';
      mockDirOps.exists.mockResolvedValue(true);

      // Act
      const result = await directoryService.exists(path);

      // Assert
      expect(result).toBe(true);
      expect(mockDirOps.exists).toHaveBeenCalledWith(path);
    });

    it('should return false if directory does not exist', async () => {
      // Arrange
      const path = '/test/non-existing';
      mockDirOps.exists.mockResolvedValue(false);

      // Act
      const result = await directoryService.exists(path);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return directory stats', async () => {
      // Arrange
      const path = '/test/dir';
      const stats = {
        size: 4096,
        isDirectory: () => true,
        mtime: new Date()
      };
      mockDirOps.getStats.mockResolvedValue(stats);

      // Act
      const result = await directoryService.getStats(path);

      // Assert
      expect(result).toEqual(stats);
      expect(mockDirOps.getStats).toHaveBeenCalledWith(path);
    });
  });
});
