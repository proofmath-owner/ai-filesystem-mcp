import * as fs from 'fs/promises';
import * as path from 'path';
import { ServiceContainer } from '../../core/ServiceContainer.js';
import { FileService } from '../../core/services/file/FileService.js';
import { DirectoryService } from '../../core/services/directory/DirectoryService.js';

describe('FileSystem Integration Tests', () => {
  const testDir = path.join(process.cwd(), 'test-temp');
  let container: ServiceContainer;
  let fileService: FileService;
  let directoryService: DirectoryService;

  beforeAll(async () => {
    // 테스트 디렉토리 생성
    await fs.mkdir(testDir, { recursive: true });
    
    // 서비스 컨테이너 초기화
    container = new ServiceContainer();
    fileService = container.getService('fileService');
    directoryService = container.getService('directoryService');
  });

  afterAll(async () => {
    // 테스트 디렉토리 정리
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('File and Directory Operations', () => {
    const testFile = path.join(testDir, 'test.txt');
    const testSubDir = path.join(testDir, 'subdir');

    it('should create directory and write file', async () => {
      // 디렉토리 생성
      await directoryService.createDirectory(testSubDir);
      
      // 파일 쓰기
      const content = 'Hello, World!';
      await fileService.writeFile(testFile, content);
      
      // 검증
      const readContent = await fileService.readFile(testFile);
      expect(readContent).toBe(content);
      
      const dirContents = await directoryService.listDirectory(testDir);
      expect(dirContents).toContainEqual(
        expect.objectContaining({ name: 'test.txt', type: 'file' })
      );
      expect(dirContents).toContainEqual(
        expect.objectContaining({ name: 'subdir', type: 'directory' })
      );
    });

    it('should update file content', async () => {
      const updates = [
        { oldText: 'World', newText: 'TypeScript' }
      ];
      
      await fileService.updateFile(testFile, updates);
      
      const updatedContent = await fileService.readFile(testFile);
      expect(updatedContent).toBe('Hello, TypeScript!');
    });

    it('should move file to subdirectory', async () => {
      const newPath = path.join(testSubDir, 'moved.txt');
      
      await fileService.moveFile(testFile, newPath);
      
      // 원래 위치에 파일이 없어야 함
      await expect(fileService.readFile(testFile)).rejects.toThrow();
      
      // 새 위치에서 파일을 읽을 수 있어야 함
      const content = await fileService.readFile(newPath);
      expect(content).toBe('Hello, TypeScript!');
    });

    it('should copy directory recursively', async () => {
      const copyDir = path.join(testDir, 'copy-dir');
      
      await directoryService.copyDirectory(testSubDir, copyDir);
      
      const contents = await directoryService.listDirectory(copyDir);
      expect(contents).toContainEqual(
        expect.objectContaining({ name: 'moved.txt', type: 'file' })
      );
    });

    it('should remove directory recursively', async () => {
      await directoryService.removeDirectory(testSubDir, { recursive: true });
      
      const contents = await directoryService.listDirectory(testDir);
      expect(contents).not.toContainEqual(
        expect.objectContaining({ name: 'subdir' })
      );
    });
  });

  describe('Search Operations', () => {
    beforeAll(async () => {
      // 검색 테스트를 위한 파일들 생성
      await fileService.writeFile(path.join(testDir, 'search1.txt'), 'search content one');
      await fileService.writeFile(path.join(testDir, 'search2.txt'), 'search content two');
      await fileService.writeFile(path.join(testDir, 'other.md'), 'different content');
    });

    it('should search files by pattern', async () => {
      const searchService = container.getService('searchService') as any;
      
      const results = await searchService.searchFiles('*.txt', testDir);
      
      expect(results).toHaveLength(2);
      expect(results).toContainEqual(
        expect.objectContaining({ name: 'search1.txt' })
      );
      expect(results).toContainEqual(
        expect.objectContaining({ name: 'search2.txt' })
      );
    });

    it('should search content in files', async () => {
      const searchService = container.getService('searchService') as any;
      
      const results = await searchService.searchContent('search content', testDir);
      
      expect(results).toHaveLength(2);
      expect(results[0].matches).toBeDefined();
    });
  });

  describe('Git Operations', () => {
    const gitTestDir = path.join(testDir, 'git-test');

    beforeAll(async () => {
      await directoryService.createDirectory(gitTestDir);
      process.chdir(gitTestDir);
    });

    afterAll(async () => {
      process.chdir(testDir);
    });

    it('should initialize git repository', async () => {
      const gitService = container.getService('gitService') as any;
      
      await gitService.init();
      
      const status = await gitService.getStatus();
      expect(status.branch).toBeDefined();
    });

    it('should add and commit files', async () => {
      const gitService = container.getService('gitService') as any;
      
      // 파일 생성
      await fileService.writeFile(path.join(gitTestDir, 'README.md'), '# Test Project');
      
      // Git 작업
      await gitService.add('.');
      await gitService.commit('Initial commit');
      
      const log = await gitService.log(1);
      expect(log).toHaveLength(1);
      expect(log[0].message).toBe('Initial commit');
    });
  });

  describe('Code Analysis', () => {
    const codeFile = path.join(testDir, 'sample.ts');

    beforeAll(async () => {
      const sampleCode = `
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  
  multiply(a: number, b: number): number {
    return a * b;
  }
}
`;
      await fileService.writeFile(codeFile, sampleCode);
    });

    it('should analyze TypeScript code', async () => {
      const codeService = container.getService('codeAnalysisService') as any;
      
      const analysis = await codeService.analyzeCode(codeFile);
      
      expect(analysis.classes).toHaveLength(1);
      expect(analysis.classes[0].name).toBe('Calculator');
      expect(analysis.classes[0].methods).toHaveLength(2);
    });

    it('should suggest refactoring improvements', async () => {
      const codeService = container.getService('codeAnalysisService') as any;
      
      const suggestions = await codeService.suggestRefactoring(codeFile);
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('Security Operations', () => {
    it('should scan for secrets', async () => {
      const securityService = container.getService('securityService') as any;
      
      // 의도적으로 시크릿이 포함된 파일 생성
      const secretFile = path.join(testDir, 'config.js');
      await fileService.writeFile(secretFile, `
const config = {
  apiKey: 'sk-1234567890abcdef',
  password: 'super_secret_password'
};
`);
      
      const results = await securityService.scanSecrets(testDir);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].file).toBe(secretFile);
    });

    it('should perform security audit', async () => {
      const securityService = container.getService('securityService') as any;
      
      const audit = await securityService.performAudit(testDir);
      
      expect(audit).toHaveProperty('filePermissions');
      expect(audit).toHaveProperty('vulnerabilities');
      expect(audit).toHaveProperty('recommendations');
    });
  });
});
