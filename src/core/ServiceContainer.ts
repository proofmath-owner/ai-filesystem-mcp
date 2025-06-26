import { CommandRegistry } from '../commands/registry/CommandRegistry.js';
import { CommandLoader } from '../commands/registry/CommandLoader.js';

// Services
import { FileService } from './services/file/FileService.js';
import { DirectoryService } from './services/directory/DirectoryService.js';
import { SearchService } from './services/search/SearchService.js';
import { GitService } from './services/git/GitService.js';
import { CodeAnalysisService } from './services/code/CodeAnalysisService.js';
import { SecurityService } from './services/security/SecurityService.js';

// Utils Services
import { DiffService } from './services/utils/DiffService.js';
import { CompressionService } from './services/utils/CompressionService.js';

// Batch Services
import { BatchService } from './services/batch/BatchService.js';
import { TransactionService } from './services/batch/TransactionService.js';

// Monitoring Services
import { FileWatcherService } from './services/monitoring/FileWatcherService.js';

// Managers
import { CacheManager } from './managers/CacheManager.js';
import { MonitoringManager } from './managers/MonitoringManager.js';
import { TransactionManager } from './managers/TransactionManager.js';
import { BatchManager } from './managers/BatchManager.js';

// Utilities
import { FileOperations } from './services/file/FileOperations.js';
import { FileCache } from './services/file/FileCache.js';
import { DirectoryOperations } from './services/directory/DirectoryOperations.js';
import { ContentSearcher } from './services/search/ContentSearcher.js';
import { FuzzySearcher } from './services/search/FuzzySearcher.js';
import { SemanticSearcher } from './services/search/SemanticSearcher.js';
import { GitOperations } from './services/git/GitOperations.js';
import { GitHubIntegration } from './services/git/GitHubIntegration.js';
import { ASTProcessor } from './services/code/ASTProcessor.js';
import { RefactoringEngine } from './services/code/RefactoringEngine.js';
import { EncryptionService } from './services/security/EncryptionService.js';
import { SecretScanner } from './services/security/SecretScanner.js';
import { ShellExecutionService } from './services/security/ShellExecutionService.js';
import { EnhancedShellExecutionService, SecurityLevel } from './services/security/EnhancedShellExecutionService.js';

export class ServiceContainer {
  private services: Map<string, any> = new Map();
  private commandRegistry!: CommandRegistry;

  constructor() {
    this.initializeServices();
    // Commands will be initialized asynchronously
  }
  
  async initialize(): Promise<void> {
    await this.initializeCommands();
  }

  private initializeServices(): void {
    // Initialize managers
    const cacheManager = new CacheManager();
    const monitoringManager = new MonitoringManager();
    const transactionManager = new TransactionManager();
    const batchManager = new BatchManager();

    // Initialize file service dependencies
    const fileOperations = new FileOperations();
    const fileCache = new FileCache(cacheManager);
    const fileService = new FileService();

    // Initialize directory service
    const directoryOperations = new DirectoryOperations();
    const directoryService = new DirectoryService(directoryOperations, monitoringManager);

    // Initialize search service
    const contentSearcher = new ContentSearcher();
    const fuzzySearcher = new FuzzySearcher();
    const semanticSearcher = new SemanticSearcher();
    const searchService = new SearchService(contentSearcher, fuzzySearcher, semanticSearcher);

    // Initialize git service
    const gitOperations = new GitOperations();
    const gitHubIntegration = new GitHubIntegration();
    const gitService = new GitService(gitOperations, gitHubIntegration);

    // Initialize code analysis service
    const astProcessor = new ASTProcessor();
    const refactoringEngine = new RefactoringEngine();
    const codeAnalysisService = new CodeAnalysisService(astProcessor, refactoringEngine);

    // Initialize security service
    const encryptionService = new EncryptionService();
    const secretScanner = new SecretScanner();
    const securityService = new SecurityService(encryptionService, secretScanner);
    
    // Initialize shell execution service with MODERATE security level for development
    const shellService = new EnhancedShellExecutionService(SecurityLevel.MODERATE);

    // Register services
    this.services.set('fileService', fileService);
    this.services.set('directoryService', directoryService);
    this.services.set('searchService', searchService);
    this.services.set('gitService', gitService);
    this.services.set('codeAnalysisService', codeAnalysisService);
    this.services.set('securityService', securityService);
    this.services.set('shellService', shellService);
    this.services.set('cacheManager', cacheManager);
    this.services.set('monitoringManager', monitoringManager);
    this.services.set('transactionManager', transactionManager);
    this.services.set('batchManager', batchManager);
    
    // Initialize utils services
    const diffService = new DiffService();
    const compressionService = new CompressionService();
    
    // Initialize batch services
    const batchService = new BatchService();
    const transactionService = new TransactionService();
    
    // Initialize monitoring services
    const fileWatcherService = new FileWatcherService();
    
    // Register utils services
    this.services.set('diffService', diffService);
    this.services.set('compressionService', compressionService);
    
    // Register batch services
    this.services.set('batchService', batchService);
    this.services.set('transactionService', transactionService);
    
    // Register monitoring services
    this.services.set('fileWatcherService', fileWatcherService);
  }

  private async initializeCommands(): Promise<void> {
    this.commandRegistry = new CommandRegistry();
    const loader = new CommandLoader(this.commandRegistry);
    
    // Load commands
    await loader.loadCommands();
  }



  getService<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service as T;
  }

  getCommandRegistry(): CommandRegistry {
    return this.commandRegistry;
  }

  async cleanup(): Promise<void> {
    // Cleanup all services
    const cacheManager = this.getService<CacheManager>('cacheManager');
    const monitoringManager = this.getService<MonitoringManager>('monitoringManager');
    
    cacheManager.destroy();
    monitoringManager.destroy();
  }
}
