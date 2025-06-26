import { CommandRegistry } from './CommandRegistry.js';
import { BaseCommand } from '../base/BaseCommand.js';

export class CommandLoader {
  private registry: CommandRegistry;
  private enableDebugLogs: boolean;

  constructor(registry: CommandRegistry) {
    this.registry = registry;
    // Only enable debug logs in development or when explicitly requested
    this.enableDebugLogs = process.env.NODE_ENV === 'development' || process.env.MCP_DEBUG_COMMANDS === 'true';
  }

  /**
   * 지정된 디렉토리에서 모든 명령어를 자동으로 로드합니다.
   */
  async loadCommands(): Promise<void> {
    if (this.enableDebugLogs) {
      console.log('Loading commands...');
    }
    
    try {
      // File commands
      const fileModule = await import('../implementations/file/index.js');
      if (this.enableDebugLogs) {
        console.log('File commands available:', Object.keys(fileModule));
      }
      const { ReadFileCommand, WriteFileCommand, UpdateFileCommand, MoveFileCommand, ReadFilesCommand } = fileModule;
      
      // Directory commands
      const dirModule = await import('../implementations/directory/index.js');
      if (this.enableDebugLogs) {
        console.log('Directory commands available:', Object.keys(dirModule));
      }
      const { CreateDirectoryCommand, ListDirectoryCommand } = dirModule;
      
      // Security commands
      const secModule = await import('../implementations/security/index.js');
      if (this.enableDebugLogs) {
        console.log('Security commands available:', Object.keys(secModule));
      }
      const { ScanSecretsCommand, EncryptFileCommand, DecryptFileCommand, SecurityAuditCommand } = secModule;
      
      // Shell commands
      const shellModule = await import('../implementations/shell/index.js');
      if (this.enableDebugLogs) {
        console.log('Shell commands available:', Object.keys(shellModule));
      }
      const { ExecuteShellCommand, QuickShellCommand } = shellModule;
      
      // Register file commands
      this.registry.register(new ReadFileCommand());
      this.registry.register(new WriteFileCommand());
      this.registry.register(new UpdateFileCommand());
      this.registry.register(new MoveFileCommand());
      this.registry.register(new ReadFilesCommand());
      
      // Register directory commands
      this.registry.register(new CreateDirectoryCommand());
      this.registry.register(new ListDirectoryCommand());
      
      // Register security commands
      this.registry.register(new ScanSecretsCommand());
      this.registry.register(new EncryptFileCommand());
      this.registry.register(new DecryptFileCommand());
      this.registry.register(new SecurityAuditCommand());
      if (this.enableDebugLogs) {
        console.log('Registered security commands');
      }
      
      // Register shell commands
      this.registry.register(new ExecuteShellCommand());
      this.registry.register(new QuickShellCommand());
      if (this.enableDebugLogs) {
        console.log('Registered shell commands');
      }
      
      // Utils commands
      const utilsModule = await import('../implementations/utils/index.js');
      if (this.enableDebugLogs) {
        console.log('Utils commands available:', Object.keys(utilsModule));
      }
      const { DiffFilesCommand, CompressFilesCommand, ExtractArchiveCommand, GetFileMetadataCommand, ChangePermissionsCommand } = utilsModule;
      
      // Batch commands
      const batchModule = await import('../implementations/batch/index.js');
      if (this.enableDebugLogs) {
        console.log('Batch commands available:', Object.keys(batchModule));
      }
      const { BatchOperationsCommand, TransactionCommand } = batchModule;
      
      // Monitoring commands
      const monitoringModule = await import('../implementations/monitoring/index.js');
      if (this.enableDebugLogs) {
        console.log('Monitoring commands available:', Object.keys(monitoringModule));
      }
      const { FileWatcherCommand } = monitoringModule;
      // Git commands
      const gitModule = await import('../implementations/git/index.js');
      if (this.enableDebugLogs) {
        console.log('Git commands available:', Object.keys(gitModule));
      }
      const { 
        GitInitCommand, GitAddCommand, GitCommitCommand, GitPushCommand,
        GitPullCommand, GitBranchCommand, GitCheckoutCommand, GitLogCommand,
        GitCloneCommand, GitHubCreatePRCommand, GitStatusCommand
      } = gitModule;
      
      // Search commands
      const searchModule = await import('../implementations/search/index.js');
      if (this.enableDebugLogs) {
        console.log('Search commands available:', Object.keys(searchModule));
      }
      const { SearchFilesCommand, SearchContentCommand, FuzzySearchCommand, SemanticSearchCommand } = searchModule;
      
      // Code commands
      const codeModule = await import('../implementations/code/index.js');
      if (this.enableDebugLogs) {
        console.log('Code commands available:', Object.keys(codeModule));
      }
      const { AnalyzeCodeCommand, ModifyCodeCommand, SuggestRefactoringCommand, FormatCodeCommand } = codeModule;
      
      // Register git commands
      this.registry.register(new GitInitCommand());
      this.registry.register(new GitAddCommand());
      this.registry.register(new GitCommitCommand());
      this.registry.register(new GitPushCommand());
      this.registry.register(new GitPullCommand());
      this.registry.register(new GitBranchCommand());
      this.registry.register(new GitCheckoutCommand());
      this.registry.register(new GitLogCommand());
      this.registry.register(new GitCloneCommand());
      this.registry.register(new GitHubCreatePRCommand());
      this.registry.register(new GitStatusCommand());
      
      // Register search commands
      this.registry.register(new SearchFilesCommand());
      this.registry.register(new SearchContentCommand());
      this.registry.register(new FuzzySearchCommand());
      this.registry.register(new SemanticSearchCommand());
      
      // Register code commands
      this.registry.register(new AnalyzeCodeCommand());
      this.registry.register(new ModifyCodeCommand());
      this.registry.register(new SuggestRefactoringCommand());
      this.registry.register(new FormatCodeCommand());
      
      // Register utils commands
      this.registry.register(new DiffFilesCommand());
      this.registry.register(new CompressFilesCommand());
      this.registry.register(new ExtractArchiveCommand());
      this.registry.register(new GetFileMetadataCommand());
      this.registry.register(new ChangePermissionsCommand());
      
      // Register batch commands
      this.registry.register(new BatchOperationsCommand());
      this.registry.register(new TransactionCommand());
      
      // Register monitoring commands
      this.registry.register(new FileWatcherCommand());
      
      if (this.enableDebugLogs) {
        console.log(`Loaded ${this.registry.getAllCommands().length} commands`);
        
        // List all loaded commands for debugging
        this.registry.getAllCommands().forEach(cmd => {
          console.log(`  - ${cmd.name}: ${cmd.description}`);
        });
      }
    } catch (error) {
      console.error('Error loading commands:', error);
      throw error;
    }
  }

  /**
   * 단일 명령어 파일을 로드합니다.
   */
  private async loadCommand(filePath: string): Promise<void> {
    try {
      const module = await import(filePath);
      
      // 모듈에서 BaseCommand를 상속한 클래스 찾기
      for (const exportName of Object.keys(module)) {
        const CommandClass = module[exportName];
        
        if (this.isCommandClass(CommandClass)) {
          const command = new CommandClass();
          this.registry.register(command);
          if (this.enableDebugLogs) {
            console.log(`Loaded command: ${command.name}`);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to load command from ${filePath}:`, error);
    }
  }

  /**
   * 주어진 클래스가 BaseCommand를 상속하는지 확인합니다.
   */
  private isCommandClass(CommandClass: any): boolean {
    return (
      typeof CommandClass === 'function' &&
      CommandClass.prototype instanceof BaseCommand
    );
  }

  /**
   * 모든 로드된 명령어의 요약을 반환합니다.
   */
  getSummary(): { total: number; byCategory: Record<string, number> } {
    const commands = this.registry.getAllCommands();
    const byCategory: Record<string, number> = {};
    
    for (const command of commands) {
      const category = this.getCategoryFromCommand(command);
      byCategory[category] = (byCategory[category] || 0) + 1;
    }
    
    return {
      total: commands.length,
      byCategory
    };
  }

  private getCategoryFromCommand(command: BaseCommand): string {
    // 명령어 이름에서 카테고리 추출 (예: read_file -> file)
    const parts = command.name.split('_');
    
    if (parts.includes('file') || ['read', 'write', 'update', 'move'].includes(parts[0])) {
      return 'file';
    } else if (parts.includes('directory') || ['create', 'remove', 'list'].includes(parts[0])) {
      return 'directory';
    } else if (parts.includes('git') || parts[0] === 'git') {
      return 'git';
    } else if (parts.includes('search') || ['search', 'fuzzy', 'semantic'].includes(parts[0])) {
      return 'search';
    } else if (parts.includes('code') || ['analyze', 'modify', 'refactor'].includes(parts[0])) {
      return 'code';
    } else if (parts.includes('security') || ['scan', 'encrypt', 'decrypt'].includes(parts[0])) {
      return 'security';
    }
    
    return 'other';
  }
}
