// Base classes
export { Command } from './Command.js';
export { CommandRegistry } from './CommandRegistry.js';

// Import for internal use
import { CommandRegistry } from './CommandRegistry.js';

// File commands
import {
  ReadFileCommand,
  ReadFilesCommand,
  WriteFileCommand,
  UpdateFileCommand,
  MoveFileCommand
} from './file/FileCommands.js';

// Directory commands - 기존 파일이 없다면 생성해야 함
// import {
//   CreateDirectoryCommand,
//   RemoveDirectoryCommand,
//   ListDirectoryCommand,
//   CopyDirectoryCommand,
//   MoveDirectoryCommand
// } from './directory/DirectoryCommands.js';

// Search commands
import {
  SearchFilesCommand,
  SearchContentCommand,
  SearchByDateCommand,
  SearchBySizeCommand,
  FuzzySearchCommand,
  SemanticSearchCommand
} from './search/SearchCommands.js';

// Git commands
import {
  GitStatusCommand,
  GitCommitCommand,
  GitInitCommand,
  GitAddCommand,
  GitPushCommand,
  GitPullCommand,
  GitBranchCommand,
  GitLogCommand,
  GitHubCreatePRCommand,
  GitCloneCommand
} from './git/GitCommands.js';

// Code Analysis commands
import {
  AnalyzeCodeCommand,
  ModifyCodeCommand
} from './code/CodeAnalysisCommands.js';

// Transaction commands
import {
  CreateTransactionCommand
} from './transaction/TransactionCommands.js';

// File Watcher commands
import {
  StartWatchingCommand,
  StopWatchingCommand,
  GetWatcherStatsCommand
} from './watcher/FileWatcherCommands.js';

// Archive commands
import {
  CompressFilesCommand,
  ExtractArchiveCommand
} from './archive/ArchiveCommands.js';

// System commands
import {
  GetFileSystemStatsCommand
} from './system/SystemCommands.js';

// Batch commands
import {
  BatchOperationsCommand
} from './batch/BatchCommands.js';

// Refactoring commands
import {
  SuggestRefactoringCommand,
  AutoFormatProjectCommand,
  AnalyzeCodeQualityCommand
} from './refactoring/RefactoringCommands.js';

// Cloud commands
import {
  SyncWithCloudCommand
} from './cloud/CloudCommands.js';

// Security commands
import {
  ChangePermissionsCommand,
  EncryptFileCommand,
  DecryptFileCommand,
  ScanSecretsCommand,
  SecurityAuditCommand
} from './security/SecurityCommands.js';

// Metadata commands
import {
  AnalyzeProjectCommand,
  GetFileMetadataCommand,
  GetDirectoryTreeCommand,
  CompareFilesCommand,
  FindDuplicateFilesCommand,
  CreateSymlinkCommand,
  DiffFilesCommand
} from './metadata/MetadataCommands.js';

/**
 * 모든 명령어를 등록한 CommandRegistry를 생성합니다.
 */
export function createCommandRegistry(): CommandRegistry {
  const registry = new CommandRegistry();

  // File commands
  registry.registerMany([
    new ReadFileCommand(),
    new ReadFilesCommand(),
    new WriteFileCommand(),
    new UpdateFileCommand(),
    new MoveFileCommand()
  ]);

  // Directory commands - 임시로 주석 처리 (파일이 없음)
  // registry.registerMany([
  //   new CreateDirectoryCommand(),
  //   new RemoveDirectoryCommand(),
  //   new ListDirectoryCommand(),
  //   new CopyDirectoryCommand(),
  //   new MoveDirectoryCommand()
  // ]);

  // Search commands
  registry.registerMany([
    new SearchFilesCommand(),
    new SearchContentCommand(),
    new SearchByDateCommand(),
    new SearchBySizeCommand(),
    new FuzzySearchCommand(),
    new SemanticSearchCommand()
  ]);

  // Git commands
  registry.registerMany([
    new GitStatusCommand(),
    new GitCommitCommand(),
    new GitInitCommand(),
    new GitAddCommand(),
    new GitPushCommand(),
    new GitPullCommand(),
    new GitBranchCommand(),
    new GitLogCommand(),
    new GitHubCreatePRCommand(),
    new GitCloneCommand()
  ]);

  // Code Analysis commands
  registry.registerMany([
    new AnalyzeCodeCommand(),
    new ModifyCodeCommand()
  ]);

  // Transaction commands
  registry.register(new CreateTransactionCommand());

  // File Watcher commands
  registry.registerMany([
    new StartWatchingCommand(),
    new StopWatchingCommand(),
    new GetWatcherStatsCommand()
  ]);

  // Archive commands
  registry.registerMany([
    new CompressFilesCommand(),
    new ExtractArchiveCommand()
  ]);

  // System commands
  registry.register(new GetFileSystemStatsCommand());

  // Batch commands
  registry.register(new BatchOperationsCommand());

  // Refactoring commands
  registry.registerMany([
    new SuggestRefactoringCommand(),
    new AutoFormatProjectCommand(),
    new AnalyzeCodeQualityCommand()
  ]);

  // Cloud commands
  registry.register(new SyncWithCloudCommand());

  // Security commands
  registry.registerMany([
    new ChangePermissionsCommand(),
    new EncryptFileCommand(),
    new DecryptFileCommand(),
    new ScanSecretsCommand(),
    new SecurityAuditCommand()
  ]);

  // Metadata commands
  registry.registerMany([
    new AnalyzeProjectCommand(),
    new GetFileMetadataCommand(),
    new GetDirectoryTreeCommand(),
    new CompareFilesCommand(),
    new FindDuplicateFilesCommand(),
    new CreateSymlinkCommand(),
    new DiffFilesCommand()
  ]);

  return registry;
}
