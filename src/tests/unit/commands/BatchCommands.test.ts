import { BatchOperationsCommand } from '../../../commands/implementations/batch/BatchCommands';
import { ServiceContainer } from '../../../core/ServiceContainer';
import { BatchService } from '../../../core/services/batch/BatchService';

describe('Batch Commands', () => {
  let container: ServiceContainer;
  let mockBatchService: jest.Mocked<BatchService>;

  beforeEach(async () => {
    container = new ServiceContainer();
    
    // Create mock batch service
    mockBatchService = {
      executeBatch: jest.fn(),
      createBatch: jest.fn(),
      validateBatch: jest.fn(),
      getBatchStatus: jest.fn(),
      cancelBatch: jest.fn(),
      initialize: jest.fn(),
      dispose: jest.fn(),
    } as any;

    container.register('batchService', mockBatchService);
  });

  afterEach(async () => {
    await container.dispose();
    jest.clearAllMocks();
  });

  describe('BatchOperationsCommand', () => {
    let command: BatchOperationsCommand;

    beforeEach(() => {
      command = new BatchOperationsCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('batch_operations');
      expect(schema.description).toContain('Execute batch operations');
      expect(schema.inputSchema.properties).toHaveProperty('operations');
    });

    it('should validate required arguments', () => {
      const result = command.validateArgs({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Operations are required');
    });

    it('should validate operations is array', () => {
      const result = command.validateArgs({
        operations: 'not-an-array'
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Operations must be an array');
    });

    it('should validate non-empty operations array', () => {
      const result = command.validateArgs({
        operations: []
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one operation is required');
    });

    it('should execute file operations batch successfully', async () => {
      const args = {
        operations: [
          {
            type: 'copy',
            source: '/test/file1.txt',
            destination: '/backup/file1.txt'
          },
          {
            type: 'move',
            source: '/test/file2.txt',
            destination: '/archive/file2.txt'
          },
          {
            type: 'delete',
            target: '/test/temp.log'
          }
        ],
        parallel: true,
        stopOnError: false
      };

      const mockResult = {
        batchId: 'batch-123',
        totalOperations: 3,
        successful: 3,
        failed: 0,
        results: [
          {
            operation: 'copy',
            source: '/test/file1.txt',
            destination: '/backup/file1.txt',
            success: true,
            duration: 150
          },
          {
            operation: 'move',
            source: '/test/file2.txt',
            destination: '/archive/file2.txt',
            success: true,
            duration: 200
          },
          {
            operation: 'delete',
            target: '/test/temp.log',
            success: true,
            duration: 50
          }
        ],
        totalDuration: 400,
        errors: []
      };

      mockBatchService.executeBatch.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockBatchService.executeBatch).toHaveBeenCalledWith(
        args.operations,
        {
          parallel: true,
          stopOnError: false
        }
      );
      expect(result.content[0].text).toContain('Batch operations completed');
      expect(result.content[0].text).toContain('3/3 operations successful');
      expect(result.content[0].text).toContain('Total duration: 400ms');
      expect(result.content[0].text).toContain('copy: /test/file1.txt → /backup/file1.txt');
      expect(result.content[0].text).toContain('move: /test/file2.txt → /archive/file2.txt');
      expect(result.content[0].text).toContain('delete: /test/temp.log');
    });

    it('should handle batch with partial failures', async () => {
      const args = {
        operations: [
          {
            type: 'copy',
            source: '/test/file1.txt',
            destination: '/backup/file1.txt'
          },
          {
            type: 'copy',
            source: '/test/nonexistent.txt',
            destination: '/backup/nonexistent.txt'
          },
          {
            type: 'delete',
            target: '/test/temp.log'
          }
        ],
        parallel: false,
        stopOnError: false
      };

      const mockResult = {
        batchId: 'batch-456',
        totalOperations: 3,
        successful: 2,
        failed: 1,
        results: [
          {
            operation: 'copy',
            source: '/test/file1.txt',
            destination: '/backup/file1.txt',
            success: true,
            duration: 150
          },
          {
            operation: 'copy',
            source: '/test/nonexistent.txt',
            destination: '/backup/nonexistent.txt',
            success: false,
            error: 'File not found',
            duration: 10
          },
          {
            operation: 'delete',
            target: '/test/temp.log',
            success: true,
            duration: 50
          }
        ],
        totalDuration: 210,
        errors: [
          {
            operation: 'copy',
            source: '/test/nonexistent.txt',
            error: 'File not found'
          }
        ]
      };

      mockBatchService.executeBatch.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('2/3 operations successful');
      expect(result.content[0].text).toContain('1 operation failed');
      expect(result.content[0].text).toContain('Failed Operations:');
      expect(result.content[0].text).toContain('copy: /test/nonexistent.txt - File not found');
    });

    it('should handle directory operations batch', async () => {
      const args = {
        operations: [
          {
            type: 'create_directory',
            path: '/test/new-dir'
          },
          {
            type: 'copy_directory',
            source: '/test/source-dir',
            destination: '/test/backup-dir'
          },
          {
            type: 'remove_directory',
            path: '/test/old-dir'
          }
        ]
      };

      const mockResult = {
        batchId: 'batch-789',
        totalOperations: 3,
        successful: 3,
        failed: 0,
        results: [
          {
            operation: 'create_directory',
            path: '/test/new-dir',
            success: true,
            duration: 20
          },
          {
            operation: 'copy_directory',
            source: '/test/source-dir',
            destination: '/test/backup-dir',
            success: true,
            duration: 500,
            filesProcessed: 15
          },
          {
            operation: 'remove_directory',
            path: '/test/old-dir',
            success: true,
            duration: 100
          }
        ],
        totalDuration: 620,
        errors: []
      };

      mockBatchService.executeBatch.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('create_directory: /test/new-dir');
      expect(result.content[0].text).toContain('copy_directory: /test/source-dir → /test/backup-dir');
      expect(result.content[0].text).toContain('(15 files)');
      expect(result.content[0].text).toContain('remove_directory: /test/old-dir');
    });

    it('should handle batch with stop on error', async () => {
      const args = {
        operations: [
          {
            type: 'copy',
            source: '/test/file1.txt',
            destination: '/backup/file1.txt'
          },
          {
            type: 'copy',
            source: '/test/nonexistent.txt',
            destination: '/backup/nonexistent.txt'
          },
          {
            type: 'delete',
            target: '/test/temp.log'
          }
        ],
        stopOnError: true
      };

      const mockResult = {
        batchId: 'batch-error',
        totalOperations: 3,
        successful: 1,
        failed: 1,
        results: [
          {
            operation: 'copy',
            source: '/test/file1.txt',
            destination: '/backup/file1.txt',
            success: true,
            duration: 150
          },
          {
            operation: 'copy',
            source: '/test/nonexistent.txt',
            destination: '/backup/nonexistent.txt',
            success: false,
            error: 'File not found',
            duration: 10
          }
        ],
        totalDuration: 160,
        errors: [
          {
            operation: 'copy',
            source: '/test/nonexistent.txt',
            error: 'File not found'
          }
        ],
        stopped: true,
        stoppedAt: 2
      };

      mockBatchService.executeBatch.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('Batch stopped on error');
      expect(result.content[0].text).toContain('Completed 1/3 operations');
      expect(result.content[0].text).toContain('Stopped at operation 2');
    });

    it('should handle batch execution errors', async () => {
      const args = {
        operations: [
          {
            type: 'copy',
            source: '/test/file.txt',
            destination: '/backup/file.txt'
          }
        ]
      };

      mockBatchService.executeBatch.mockRejectedValue(new Error('Batch service unavailable'));

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Batch service unavailable');
    });

    it('should validate operation types', () => {
      const invalidArgs = {
        operations: [
          {
            type: 'invalid_operation',
            source: '/test/file.txt'
          }
        ]
      };

      const result = command.validateArgs(invalidArgs);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid operation type: invalid_operation');
    });

    it('should validate operation parameters', () => {
      const invalidArgs = {
        operations: [
          {
            type: 'copy'
            // missing source and destination
          }
        ]
      };

      const result = command.validateArgs(invalidArgs);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Copy operation requires source and destination');
    });

    it('should handle complex batch with mixed operations', async () => {
      const args = {
        operations: [
          {
            type: 'create_directory',
            path: '/test/backup'
          },
          {
            type: 'copy',
            source: '/test/important.txt',
            destination: '/test/backup/important.txt'
          },
          {
            type: 'compress',
            files: ['/test/backup/'],
            output: '/test/backup.zip'
          },
          {
            type: 'encrypt',
            source: '/test/backup.zip',
            password: 'secure123'
          }
        ],
        description: 'Backup and secure important files'
      };

      const mockResult = {
        batchId: 'complex-batch',
        totalOperations: 4,
        successful: 4,
        failed: 0,
        results: [
          {
            operation: 'create_directory',
            path: '/test/backup',
            success: true,
            duration: 20
          },
          {
            operation: 'copy',
            source: '/test/important.txt',
            destination: '/test/backup/important.txt',
            success: true,
            duration: 100
          },
          {
            operation: 'compress',
            files: ['/test/backup/'],
            output: '/test/backup.zip',
            success: true,
            duration: 300,
            compressionRatio: 0.7
          },
          {
            operation: 'encrypt',
            source: '/test/backup.zip',
            success: true,
            duration: 150
          }
        ],
        totalDuration: 570,
        errors: []
      };

      mockBatchService.executeBatch.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('Backup and secure important files');
      expect(result.content[0].text).toContain('compress: 1 files → /test/backup.zip');
      expect(result.content[0].text).toContain('encrypt: /test/backup.zip');
    });
  });
});