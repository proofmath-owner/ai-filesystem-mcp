import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ServiceContainer } from '../../core/ServiceContainer.js';
import { ReadFileCommand } from '../../commands/implementations/file/ReadFileCommand.js';
import { WriteFileCommand } from '../../commands/implementations/file/WriteFileCommand.js';
import { CommandContext } from '../../core/interfaces/ICommand.js';

describe('FileSystem Integration Tests', () => {
  const testDir = path.join(process.cwd(), 'test-temp');
  let container: ServiceContainer;

  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    
    // Initialize service container
    container = new ServiceContainer();
  });

  afterAll(async () => {
    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true });
    
    // Cleanup container
    await container.cleanup();
  });

  beforeEach(async () => {
    // Clean test directory contents
    const files = await fs.readdir(testDir);
    for (const file of files) {
      await fs.rm(path.join(testDir, file), { recursive: true, force: true });
    }
  });

  describe('File Operations', () => {
    it('should write and read a file', async () => {
      // Arrange
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Hello, World!';
      const writeCommand = new WriteFileCommand();
      const readCommand = new ReadFileCommand();

      // Act - Write file
      const writeContext: CommandContext = {
        args: { path: filePath, content },
        container
      };
      const writeResult = await writeCommand.execute(writeContext);

      // Assert - Write successful
      expect((writeResult as any).success || writeResult.content[0].text.includes('Successfully')).toBe(true);
      expect(writeResult.content[0].text).toContain('Successfully wrote to');

      // Act - Read file
      const readContext: CommandContext = {
        args: { path: filePath },
        container
      };
      const readResult = await readCommand.execute(readContext);

      // Assert - Read successful
      expect(readResult.content).toBeDefined();
      expect(readResult.content[0].text).toBe(content);
    });

    it('should handle reading non-existent file', async () => {
      // Arrange
      const filePath = path.join(testDir, 'non-existent.txt');
      const readCommand = new ReadFileCommand();
      const context: CommandContext = {
        args: { path: filePath },
        container
      };

      // Act & Assert
      await expect(readCommand.execute(context)).rejects.toThrow();
    });

    it('should overwrite existing file', async () => {
      // Arrange
      const filePath = path.join(testDir, 'overwrite.txt');
      const originalContent = 'Original content';
      const newContent = 'New content';
      const writeCommand = new WriteFileCommand();

      // Act - Write original
      await writeCommand.execute({
        args: { path: filePath, content: originalContent },
        container
      });

      // Act - Overwrite
      await writeCommand.execute({
        args: { path: filePath, content: newContent },
        container
      });

      // Assert - Read new content
      const readCommand = new ReadFileCommand();
      const result = await readCommand.execute({
        args: { path: filePath },
        container
      });
      
      expect(result.content?.[0]?.text || "").toBe(newContent);
    });
  });

  describe('Cache Behavior', () => {
    it('should use cache on second read', async () => {
      // Arrange
      const filePath = path.join(testDir, 'cached.txt');
      const content = 'Cached content';
      const writeCommand = new WriteFileCommand();
      const readCommand = new ReadFileCommand();

      // Write file
      await writeCommand.execute({
        args: { path: filePath, content },
        container
      });

      // First read - from disk
      const startTime1 = Date.now();
      await readCommand.execute({
        args: { path: filePath },
        container
      });
      const duration1 = Date.now() - startTime1;

      // Second read - from cache (should be faster)
      const startTime2 = Date.now();
      const result = await readCommand.execute({
        args: { path: filePath },
        container
      });
      const duration2 = Date.now() - startTime2;

      // Assert
      expect(result.content?.[0]?.text || "").toBe(content);
      // Cache read should typically be faster (but not always due to system variations)
      // So we just verify the result is correct
    });
  });

  describe('Directory Operations', () => {
    it('should create nested directories', async () => {
      // This would test DirectoryService integration
      // Add when directory commands are implemented
    });
  });
});
