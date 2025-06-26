import { FileSystemManager } from '../core/FileSystemManager.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('FileSystemManager', () => {
  let fsManager: FileSystemManager;
  const testDir = path.join(__dirname, 'test-files');
  const testFile = path.join(testDir, 'test.txt');

  beforeAll(async () => {
    fsManager = new FileSystemManager();
    // 테스트 디렉토리 생성
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    // 테스트 디렉토리 정리
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      await fs.writeFile(testFile, 'Hello, World!');
      
      const result = await fsManager.readFile(testFile);
      expect(result.content[0].text).toBe('Hello, World!');
    });

    it('should use cache on second read', async () => {
      await fs.writeFile(testFile, 'Cached content');
      
      // 첫 번째 읽기
      const result1 = await fsManager.readFile(testFile);
      
      // 파일 내용 변경 (캐시 테스트를 위해)
      await fs.writeFile(testFile, 'Changed content');
      
      // 두 번째 읽기 (캐시에서 가져와야 함)
      const result2 = await fsManager.readFile(testFile);
      expect(result2.content[0].text).toBe('Cached content');
    });
  });

  describe('writeFile', () => {
    it('should write content to file', async () => {
      await fsManager.writeFile(testFile, 'New content');
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('New content');
    });

    it('should create backup when overwriting', async () => {
      await fs.writeFile(testFile, 'Original content');
      await fsManager.writeFile(testFile, 'Updated content');
      
      // 백업 파일 확인
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(f => f.startsWith('test.txt.backup.'));
      expect(backupFiles.length).toBeGreaterThan(0);
    });
  });

  describe('searchContent', () => {
    it('should find content in files', async () => {
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'TODO: Fix this bug');
      await fs.writeFile(path.join(testDir, 'file2.txt'), 'Another TODO here');
      
      const result = await fsManager.searchContent('TODO', testDir, '*.txt');
      expect(result.content[0].text).toContain('Found 2 matches');
    });
  });

  describe('updateFile', () => {
    it('should update file content', async () => {
      await fs.writeFile(testFile, 'debug: false');
      
      await fsManager.updateFile(testFile, [
        { oldText: 'debug: false', newText: 'debug: true' }
      ]);
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('debug: true');
    });

    it('should throw error if text not found', async () => {
      await fs.writeFile(testFile, 'some content');
      
      await expect(
        fsManager.updateFile(testFile, [
          { oldText: 'not found', newText: 'replacement' }
        ])
      ).rejects.toThrow('Could not find text to replace');
    });
  });
});
