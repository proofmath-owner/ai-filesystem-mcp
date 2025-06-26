import { createCommandRegistry } from '../../../src/core/commands/index.js';
import { FileSystemManager } from '../../../src/core/FileSystemManager.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Phase 1 Integration Tests', () => {
  let registry: ReturnType<typeof createCommandRegistry>;
  let fsManager: FileSystemManager;
  let testDir: string;

  beforeAll(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), 'ai-fs-test-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    registry = createCommandRegistry();
    fsManager = new FileSystemManager();
  });

  describe('File Operations', () => {
    const testFile = path.join(testDir, 'test.txt');
    const testContent = 'Hello, Phase 1!';

    it('should write and read a file', async () => {
      // Write file
      const writeResult = await registry.execute('write_file', {
        args: { path: testFile, content: testContent },
        fsManager
      });
      
      expect(writeResult.content[0].text).toContain('Successfully wrote');
      
      // Read file
      const readResult = await registry.execute('read_file', {
        args: { path: testFile },
        fsManager
      });
      
      expect(readResult.content[0].text).toBe(testContent);
    });

    it('should update file content', async () => {
      // First write
      await registry.execute('write_file', {
        args: { path: testFile, content: 'Original content' },
        fsManager
      });
      
      // Update
      const updateResult = await registry.execute('update_file', {
        args: { 
          path: testFile, 
          updates: [{ oldText: 'Original', newText: 'Updated' }] 
        },
        fsManager
      });
      
      expect(updateResult.content[0].text).toContain('Successfully updated');
      
      // Verify update
      const readResult = await registry.execute('read_file', {
        args: { path: testFile },
        fsManager
      });
      
      expect(readResult.content[0].text).toBe('Updated content');
    });

    it('should move a file', async () => {
      const sourcePath = path.join(testDir, 'source.txt');
      const destPath = path.join(testDir, 'dest.txt');
      
      // Create source file
      await registry.execute('write_file', {
        args: { path: sourcePath, content: 'Move me!' },
        fsManager
      });
      
      // Move file
      const moveResult = await registry.execute('move_file', {
        args: { source: sourcePath, destination: destPath },
        fsManager
      });
      
      expect(moveResult.content[0].text).toContain('Successfully moved');
      
      // Verify source doesn't exist
      await expect(fs.access(sourcePath)).rejects.toThrow();
      
      // Verify destination exists
      const content = await fs.readFile(destPath, 'utf-8');
      expect(content).toBe('Move me!');
    });
  });

  describe('Search Operations', () => {
    beforeEach(async () => {
      // Create test files
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'Search test content');
      await fs.writeFile(path.join(testDir, 'file2.json'), '{"name": "test"}');
      await fs.writeFile(path.join(testDir, 'file3.js'), 'function search() {}');
    });

    it('should search files by pattern', async () => {
      const result = await registry.execute('search_files', {
        args: { pattern: '*.txt', directory: testDir },
        fsManager
      });
      
      expect(result.content[0].text).toContain('Found');
      expect(result.content[0].text).toContain('file1.txt');
    });

    it('should search content in files', async () => {
      const result = await registry.execute('search_content', {
        args: { 
          pattern: 'search', 
          directory: testDir,
          filePattern: '**/*'
        },
        fsManager
      });
      
      expect(result.content[0].text).toContain('Found');
      expect(result.content[0].text).toContain('matches');
    });
  });

  describe('Metadata Operations', () => {
    it('should get file metadata', async () => {
      const testFile = path.join(testDir, 'metadata-test.txt');
      await fs.writeFile(testFile, 'Test content for metadata');
      
      const result = await registry.execute('get_file_metadata', {
        args: { path: testFile },
        fsManager
      });
      
      expect(result.content[0].text).toContain('Size:');
      expect(result.content[0].text).toContain('Created:');
      expect(result.content[0].text).toContain('Modified:');
      expect(result.content[0].text).toContain('Type: File');
    });

    it('should get directory tree', async () => {
      // Create nested structure
      await fs.mkdir(path.join(testDir, 'tree-test/sub1'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'tree-test/sub2'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'tree-test/file1.txt'), 'content');
      await fs.writeFile(path.join(testDir, 'tree-test/sub1/file2.txt'), 'content');
      
      const result = await registry.execute('get_directory_tree', {
        args: { path: path.join(testDir, 'tree-test'), maxDepth: 2 },
        fsManager
      });
      
      expect(result.content[0].text).toContain('tree-test/');
      expect(result.content[0].text).toContain('sub1/');
      expect(result.content[0].text).toContain('sub2/');
      expect(result.content[0].text).toContain('file1.txt');
    });
  });

  describe('Transaction Operations', () => {
    it('should execute multiple operations atomically', async () => {
      const file1 = path.join(testDir, 'trans1.txt');
      const file2 = path.join(testDir, 'trans2.txt');
      
      const result = await registry.execute('create_transaction', {
        args: {
          operations: [
            { type: 'write', path: file1, content: 'Transaction 1' },
            { type: 'write', path: file2, content: 'Transaction 2' }
          ]
        },
        fsManager
      });
      
      expect(result.content[0].text).toContain('Transaction completed successfully');
      
      // Verify both files exist
      const content1 = await fs.readFile(file1, 'utf-8');
      const content2 = await fs.readFile(file2, 'utf-8');
      expect(content1).toBe('Transaction 1');
      expect(content2).toBe('Transaction 2');
    });

    it('should rollback on failure', async () => {
      const existingFile = path.join(testDir, 'existing.txt');
      await fs.writeFile(existingFile, 'Original content');
      
      const result = await registry.execute('create_transaction', {
        args: {
          operations: [
            // This should succeed
            { type: 'update', path: existingFile, updates: [{oldText: 'Original', newText: 'Modified'}] },
            // This should fail (file doesn't exist)
            { type: 'update', path: path.join(testDir, 'nonexistent.txt'), updates: [{oldText: 'foo', newText: 'bar'}] }
          ]
        },
        fsManager
      });
      
      expect(result.content[0].text).toContain('Transaction failed');
      
      // Verify rollback - file should still have original content
      const content = await fs.readFile(existingFile, 'utf-8');
      expect(content).toBe('Original content');
    });
  });

  describe('Archive Operations', () => {
    it('should compress and extract files', async () => {
      // Create files to compress
      const file1 = path.join(testDir, 'compress1.txt');
      const file2 = path.join(testDir, 'compress2.txt');
      await fs.writeFile(file1, 'Compress me 1');
      await fs.writeFile(file2, 'Compress me 2');
      
      // Compress
      const archivePath = path.join(testDir, 'archive.zip');
      const compressResult = await registry.execute('compress_files', {
        args: { files: [file1, file2], outputPath: archivePath },
        fsManager
      });
      
      expect(compressResult.content[0].text).toContain('Compression complete');
      
      // Extract
      const extractDir = path.join(testDir, 'extracted');
      const extractResult = await registry.execute('extract_archive', {
        args: { archivePath, destination: extractDir },
        fsManager
      });
      
      expect(extractResult.content[0].text).toContain('Extraction complete');
      
      // Verify extracted files
      const extractedFiles = await fs.readdir(extractDir);
      expect(extractedFiles).toContain('compress1.txt');
      expect(extractedFiles).toContain('compress2.txt');
    });
  });

  describe('Security Operations', () => {
    it('should change file permissions', async () => {
      const file = path.join(testDir, 'perms.txt');
      await fs.writeFile(file, 'Permission test');
      
      const result = await registry.execute('change_permissions', {
        args: { path: file, permissions: '644' },
        fsManager
      });
      
      expect(result.content[0].text).toContain('Successfully changed permissions');
    });

    it('should encrypt and decrypt files', async () => {
      const file = path.join(testDir, 'secret.txt');
      const secretContent = 'This is a secret!';
      await fs.writeFile(file, secretContent);
      
      // Encrypt
      const encryptResult = await registry.execute('encrypt_file', {
        args: { path: file, password: 'test123' },
        fsManager
      });
      
      expect(encryptResult.content[0].text).toContain('File encrypted successfully');
      
      // Decrypt
      const decryptResult = await registry.execute('decrypt_file', {
        args: { encryptedPath: file + '.enc', password: 'test123' },
        fsManager
      });
      
      expect(decryptResult.content[0].text).toContain('File decrypted successfully');
      
      // Verify decrypted content
      const decryptedPath = file.replace('.txt', '.decrypted.txt');
      const decryptedContent = await fs.readFile(decryptedPath, 'utf-8');
      expect(decryptedContent).toBe(secretContent);
    });
  });

  describe('System Operations', () => {
    it('should get filesystem stats', async () => {
      const result = await registry.execute('get_filesystem_stats', {
        args: {},
        fsManager
      });
      
      expect(result.content[0].text).toContain('File System Statistics');
      expect(result.content[0].text).toContain('Cache Performance');
      expect(result.content[0].text).toContain('Operation Summary');
    });
  });
});