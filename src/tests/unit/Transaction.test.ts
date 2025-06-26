import { Transaction } from '../../core/Transaction.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    rm: jest.fn(),
  }
}));

describe('Transaction', () => {
  let transaction: Transaction;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    transaction = new Transaction();
  });

  describe('constructor', () => {
    it('should initialize with temp directory in system temp', () => {
      // Transaction uses os.tmpdir() now
      expect(transaction['tempDir']).toContain(os.tmpdir());
      expect(transaction['tempDir']).toContain('.ai-fs-transactions');
    });
  });

  describe('write operation', () => {
    it('should add write operation to queue', () => {
      const result = transaction.write('test.txt', 'content');
      
      expect(result).toBe(transaction); // Should return this for chaining
      expect(transaction['operations']).toHaveLength(1);
      expect(transaction['operations'][0]).toEqual({
        type: 'write',
        path: 'test.txt',
        content: 'content'
      });
    });
  });

  describe('update operation', () => {
    it('should add update operation to queue', () => {
      const updates = [{ oldText: 'foo', newText: 'bar' }];
      const result = transaction.update('test.txt', updates);
      
      expect(result).toBe(transaction);
      expect(transaction['operations']).toHaveLength(1);
      expect(transaction['operations'][0]).toEqual({
        type: 'update',
        path: 'test.txt',
        updates
      });
    });
  });

  describe('remove operation', () => {
    it('should add remove operation to queue', () => {
      const result = transaction.remove('test.txt');
      
      expect(result).toBe(transaction);
      expect(transaction['operations']).toHaveLength(1);
      expect(transaction['operations'][0]).toEqual({
        type: 'remove',
        path: 'test.txt'
      });
    });
  });

  describe('commit', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.rm.mockResolvedValue(undefined);
    });

    it('should execute write operation successfully', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' }); // File doesn't exist yet
      
      transaction.write('test.txt', 'content');
      const result = await transaction.commit();
      
      expect(result.success).toBe(true);
      expect(result.operations).toBe(1);
      expect(mockFs.mkdir).toHaveBeenCalled(); // For backup dir
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.resolve('test.txt'),
        'content',
        'utf-8'
      );
    });

    it('should create parent directories for write operations', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      
      transaction.write('deep/nested/file.txt', 'content');
      await transaction.commit();
      
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.dirname(path.resolve('deep/nested/file.txt')),
        { recursive: true }
      );
    });

    it('should rollback on failure', async () => {
      // First operation succeeds
      mockFs.writeFile.mockResolvedValueOnce(undefined);
      // Second operation fails
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      transaction
        .write('file1.txt', 'content1')
        .update('nonexistent.txt', [{ oldText: 'foo', newText: 'bar' }]);
      
      const result = await transaction.commit();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
      expect(result.rollbackPath).toBeDefined();
    });

    it('should prevent double commit', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);
      
      transaction.write('test.txt', 'content');
      await transaction.commit();
      
      await expect(transaction.commit()).rejects.toThrow('Transaction already committed');
    });

    it('should backup existing files before modification', async () => {
      mockFs.readFile.mockResolvedValueOnce('original content');
      mockFs.writeFile.mockResolvedValue(undefined);
      
      transaction.update('existing.txt', [{ oldText: 'original', newText: 'modified' }]);
      await transaction.commit();
      
      // Should backup the original file
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.backup'),
        'original content'
      );
    });

    it('should handle remove operations', async () => {
      mockFs.unlink.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('file content');
      mockFs.writeFile.mockResolvedValue(undefined);
      
      transaction.remove('test.txt');
      const result = await transaction.commit();
      
      expect(result.success).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalledWith(path.resolve('test.txt'));
    });

    it('should validate write operation has content', async () => {
      transaction['operations'] = [{
        type: 'write',
        path: 'test.txt'
        // content is missing
      }];
      
      const result = await transaction.commit();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Content required for write operation');
    });

    it('should validate update operation has updates', async () => {
      transaction['operations'] = [{
        type: 'update',
        path: 'test.txt'
        // updates is missing
      }];
      
      const result = await transaction.commit();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Updates required for update operation');
    });
  });
});