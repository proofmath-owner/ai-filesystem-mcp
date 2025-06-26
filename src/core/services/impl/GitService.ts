import { IGitService, GitCommitOptions } from '../interfaces/IGitService.js';
import { CommandResult } from '../../commands/Command.js';
import { GitIntegration } from '../../GitIntegration.js';
import { MonitoringManager } from '../../MonitoringManager.js';
import { ErrorHandlingManager } from '../../ErrorHandlingManager.js';

export class GitService implements IGitService {
  constructor(
    private monitoringManager: MonitoringManager,
    private errorManager: ErrorHandlingManager
  ) {}

  private async handleError(error: unknown, operation: string, path?: string): Promise<CommandResult> {
    const errorContext = {
      operation,
      path,
      error,
      timestamp: new Date()
    };
    const recovery = await this.errorManager.analyzeError(errorContext);
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n${recovery.suggestions.map(s => s.message).join('\n')}`
      }]
    };
  }

  async gitStatus(repoPath: string = '.'): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const gitIntegration = new GitIntegration(repoPath);
      const status = await gitIntegration.status();
      
      await this.monitoringManager.logOperation({
        type: 'read',
        path: repoPath,
        success: true,
        metadata: { duration: Date.now() - startTime }
      });
      
      return {
        content: [{ type: 'text', text: JSON.stringify(status, null, 2) }]
      };
    } catch (error) {
      return this.handleError(error, 'git_status', repoPath);
    }
  }

  async gitCommit(options: GitCommitOptions, repoPath: string = '.'): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const gitIntegration = new GitIntegration(repoPath);
      
      // Commit with message and optional files
      const result = await gitIntegration.commit(options.message, options.files);
      
      await this.monitoringManager.logOperation({
        type: 'write',
        path: repoPath,
        success: true,
        metadata: { duration: Date.now() - startTime }
      });
      
      return {
        content: [{ 
          type: 'text', 
          text: `Commit successful: ${result.commitHash || 'no hash'}\nMessage: ${options.message}`
        }]
      };
    } catch (error) {
      return this.handleError(error, 'git_commit', repoPath);
    }
  }
}