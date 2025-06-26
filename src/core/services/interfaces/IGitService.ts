import { CommandResult } from '../../commands/Command.js';

export interface GitCommitOptions {
  message: string;
  files?: string[];
  author?: string;
  email?: string;
}

export interface IGitService {
  gitStatus(repoPath?: string): Promise<CommandResult>;
  gitCommit(options: GitCommitOptions, repoPath?: string): Promise<CommandResult>;
}