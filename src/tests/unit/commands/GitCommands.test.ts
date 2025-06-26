import { GitStatusCommand } from '../../../commands/implementations/git/GitStatusCommand';
import { GitAddCommand } from '../../../commands/implementations/git/GitAddCommand';
import { GitCommitCommand } from '../../../commands/implementations/git/GitCommitCommand';
import { GitPushCommand } from '../../../commands/implementations/git/GitPushCommand';
import { GitBranchCommand } from '../../../commands/implementations/git/GitBranchCommand';
import { ServiceContainer } from '../../../core/ServiceContainer';
import { GitService } from '../../../core/services/git/GitService';

describe('Git Commands', () => {
  let container: ServiceContainer;
  let mockGitService: jest.Mocked<GitService>;

  beforeEach(async () => {
    container = new ServiceContainer();
    
    // Create mock git service
    mockGitService = {
      getStatus: jest.fn(),
      addFiles: jest.fn(),
      commit: jest.fn(),
      push: jest.fn(),
      pull: jest.fn(),
      createBranch: jest.fn(),
      switchBranch: jest.fn(),
      mergeBranch: jest.fn(),
      getBranches: jest.fn(),
      getLog: jest.fn(),
      getDiff: jest.fn(),
      initialize: jest.fn(),
      dispose: jest.fn(),
    } as any;

    container.register('gitService', mockGitService);
  });

  afterEach(async () => {
    await container.dispose();
    jest.clearAllMocks();
  });

  describe('GitStatusCommand', () => {
    let command: GitStatusCommand;

    beforeEach(() => {
      command = new GitStatusCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('git_status');
      expect(schema.description).toContain('Get Git repository status');
      expect(schema.inputSchema.properties).toHaveProperty('directory');
    });

    it('should execute git status successfully', async () => {
      const args = {
        directory: '/test/repo'
      };

      const mockStatus = {
        branch: 'main',
        ahead: 2,
        behind: 0,
        staged: [
          { path: 'src/file1.ts', status: 'A' },
          { path: 'src/file2.ts', status: 'M' }
        ],
        unstaged: [
          { path: 'src/file3.ts', status: 'M' },
          { path: 'src/file4.ts', status: 'D' }
        ],
        untracked: [
          'new-file.ts',
          'temp.log'
        ],
        conflicted: [],
        clean: false
      };

      mockGitService.getStatus.mockResolvedValue(mockStatus);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockGitService.getStatus).toHaveBeenCalledWith('/test/repo');
      expect(result.content[0].text).toContain('Branch: main');
      expect(result.content[0].text).toContain('Ahead: 2');
      expect(result.content[0].text).toContain('Staged files (2)');
      expect(result.content[0].text).toContain('src/file1.ts (Added)');
      expect(result.content[0].text).toContain('Unstaged files (2)');
      expect(result.content[0].text).toContain('Untracked files (2)');
    });

    it('should handle clean repository', async () => {
      const args = {
        directory: '/test/clean-repo'
      };

      const mockStatus = {
        branch: 'main',
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
        untracked: [],
        conflicted: [],
        clean: true
      };

      mockGitService.getStatus.mockResolvedValue(mockStatus);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('Working tree clean');
      expect(result.content[0].text).toContain('Nothing to commit');
    });

    it('should handle repository with conflicts', async () => {
      const args = {
        directory: '/test/conflict-repo'
      };

      const mockStatus = {
        branch: 'feature',
        ahead: 1,
        behind: 1,
        staged: [],
        unstaged: [],
        untracked: [],
        conflicted: [
          { path: 'src/conflicts.ts', status: 'UU' }
        ],
        clean: false
      };

      mockGitService.getStatus.mockResolvedValue(mockStatus);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('Conflicted files (1)');
      expect(result.content[0].text).toContain('src/conflicts.ts');
    });
  });

  describe('GitAddCommand', () => {
    let command: GitAddCommand;

    beforeEach(() => {
      command = new GitAddCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('git_add');
      expect(schema.description).toContain('Add files to Git staging');
      expect(schema.inputSchema.properties).toHaveProperty('files');
    });

    it('should validate required arguments', () => {
      const result = command.validateArgs({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Files are required');
    });

    it('should execute git add successfully', async () => {
      const args = {
        files: ['src/file1.ts', 'src/file2.ts'],
        directory: '/test/repo'
      };

      const mockResult = {
        added: ['src/file1.ts', 'src/file2.ts'],
        failed: []
      };

      mockGitService.addFiles.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockGitService.addFiles).toHaveBeenCalledWith(['src/file1.ts', 'src/file2.ts'], '/test/repo');
      expect(result.content[0].text).toContain('Added 2 files to staging');
      expect(result.content[0].text).toContain('src/file1.ts');
      expect(result.content[0].text).toContain('src/file2.ts');
    });

    it('should handle git add all files', async () => {
      const args = {
        files: ['.'],
        directory: '/test/repo'
      };

      const mockResult = {
        added: ['src/file1.ts', 'src/file2.ts', 'README.md'],
        failed: []
      };

      mockGitService.addFiles.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('Added 3 files to staging');
    });

    it('should handle partial failures', async () => {
      const args = {
        files: ['src/file1.ts', 'nonexistent.ts'],
        directory: '/test/repo'
      };

      const mockResult = {
        added: ['src/file1.ts'],
        failed: [
          { file: 'nonexistent.ts', error: 'File not found' }
        ]
      };

      mockGitService.addFiles.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('Added 1 files to staging');
      expect(result.content[0].text).toContain('Failed to add 1 files');
      expect(result.content[0].text).toContain('nonexistent.ts: File not found');
    });
  });

  describe('GitCommitCommand', () => {
    let command: GitCommitCommand;

    beforeEach(() => {
      command = new GitCommitCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('git_commit');
      expect(schema.description).toContain('Create a Git commit');
      expect(schema.inputSchema.properties).toHaveProperty('message');
    });

    it('should validate required arguments', () => {
      const result = command.validateArgs({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Commit message is required');
    });

    it('should validate commit message length', () => {
      const shortMessage = command.validateArgs({
        message: 'fix'
      });
      expect(shortMessage.isValid).toBe(false);
      expect(shortMessage.errors).toContain('Commit message must be at least 10 characters');

      const validMessage = command.validateArgs({
        message: 'feat: add new feature for user authentication'
      });
      expect(validMessage.isValid).toBe(true);
    });

    it('should execute git commit successfully', async () => {
      const args = {
        message: 'feat: add user authentication system',
        directory: '/test/repo'
      };

      const mockResult = {
        hash: 'abc123def456',
        shortHash: 'abc123d',
        message: 'feat: add user authentication system',
        author: 'John Doe <john@example.com>',
        date: new Date().toISOString(),
        filesChanged: 5,
        insertions: 150,
        deletions: 20
      };

      mockGitService.commit.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockGitService.commit).toHaveBeenCalledWith('feat: add user authentication system', '/test/repo', undefined);
      expect(result.content[0].text).toContain('Commit created successfully');
      expect(result.content[0].text).toContain('Hash: abc123d');
      expect(result.content[0].text).toContain('Files changed: 5');
      expect(result.content[0].text).toContain('+150 -20');
    });

    it('should handle commit with author override', async () => {
      const args = {
        message: 'fix: resolve critical security issue',
        directory: '/test/repo',
        author: 'Security Team <security@company.com>'
      };

      const mockResult = {
        hash: 'def456abc789',
        shortHash: 'def456a',
        message: 'fix: resolve critical security issue',
        author: 'Security Team <security@company.com>',
        date: new Date().toISOString(),
        filesChanged: 2,
        insertions: 10,
        deletions: 5
      };

      mockGitService.commit.mockResolvedValue(mockResult);

      const context = { container, args };
      await command.executeCommand(context);

      expect(mockGitService.commit).toHaveBeenCalledWith(
        'fix: resolve critical security issue',
        '/test/repo',
        'Security Team <security@company.com>'
      );
    });

    it('should handle empty commit', async () => {
      const args = {
        message: 'docs: update README',
        directory: '/test/repo'
      };

      mockGitService.commit.mockRejectedValue(new Error('nothing to commit, working tree clean'));

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('nothing to commit');
    });
  });

  describe('GitBranchCommand', () => {
    let command: GitBranchCommand;

    beforeEach(() => {
      command = new GitBranchCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('git_branch');
      expect(schema.description).toContain('Git branch operations');
      expect(schema.inputSchema.properties).toHaveProperty('action');
    });

    it('should validate required arguments', () => {
      const result = command.validateArgs({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action is required');
    });

    it('should list branches', async () => {
      const args = {
        action: 'list',
        directory: '/test/repo'
      };

      const mockBranches = {
        current: 'main',
        local: ['main', 'feature/auth', 'bugfix/login'],
        remote: ['origin/main', 'origin/develop', 'origin/feature/auth']
      };

      mockGitService.getBranches.mockResolvedValue(mockBranches);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockGitService.getBranches).toHaveBeenCalledWith('/test/repo');
      expect(result.content[0].text).toContain('Current branch: main');
      expect(result.content[0].text).toContain('Local branches (3)');
      expect(result.content[0].text).toContain('feature/auth');
      expect(result.content[0].text).toContain('Remote branches (3)');
    });

    it('should create new branch', async () => {
      const args = {
        action: 'create',
        branchName: 'feature/new-feature',
        directory: '/test/repo'
      };

      const mockResult = {
        created: true,
        branch: 'feature/new-feature',
        from: 'main'
      };

      mockGitService.createBranch.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockGitService.createBranch).toHaveBeenCalledWith('feature/new-feature', '/test/repo', undefined);
      expect(result.content[0].text).toContain('Branch created successfully');
      expect(result.content[0].text).toContain('feature/new-feature');
    });

    it('should switch to existing branch', async () => {
      const args = {
        action: 'switch',
        branchName: 'develop',
        directory: '/test/repo'
      };

      const mockResult = {
        switched: true,
        from: 'main',
        to: 'develop'
      };

      mockGitService.switchBranch.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockGitService.switchBranch).toHaveBeenCalledWith('develop', '/test/repo');
      expect(result.content[0].text).toContain('Switched to branch develop');
      expect(result.content[0].text).toContain('Previous branch: main');
    });
  });
});