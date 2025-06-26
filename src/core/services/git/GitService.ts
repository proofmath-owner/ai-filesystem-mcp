import { IGitService } from '../../interfaces/IGitService.js';
import { GitOperations, GitStatus, GitCommit } from './GitOperations.js';
import { GitHubIntegration, PullRequest } from './GitHubIntegration.js';

export class GitService implements IGitService {
  constructor(
    private gitOps: GitOperations,
    private github?: GitHubIntegration
  ) {}

  async init(path?: string, bare?: boolean): Promise<void> {
    await this.gitOps.init(path || process.cwd(), bare);
  }

  async status(path?: string): Promise<GitStatus> {
    return this.gitOps.getStatus(path);
  }

  async add(files: string | string[], path?: string): Promise<void> {
    await this.gitOps.add(files, path);
  }

  async commit(message: string, files?: string[], path?: string): Promise<void> {
    if (files) {
      await this.gitOps.add(files, path);
    }
    await this.gitOps.commit(message, path);
  }

  async push(options?: { remote?: string; branch?: string; force?: boolean }, path?: string): Promise<void> {
    await this.gitOps.push(
      options?.remote || 'origin',
      options?.branch,
      options?.force || false,
      path
    );
  }

  async pull(options?: { remote?: string; branch?: string }, path?: string): Promise<void> {
    await this.gitOps.pull(
      options?.remote || 'origin',
      options?.branch,
      path
    );
  }

  async branch(action: 'list' | 'create' | 'delete' | 'checkout', name?: string, options?: any): Promise<any> {
    const cwd = options?.path;
    
    switch (action) {
      case 'list':
        return this.gitOps.getBranches(options?.all || false, cwd);
      
      case 'create':
        if (!name) throw new Error('Branch name required for create action');
        await this.gitOps.createBranch(name, cwd);
        break;
      
      case 'delete':
        if (!name) throw new Error('Branch name required for delete action');
        await this.gitOps.deleteBranch(name, options?.force || false, cwd);
        break;
      
      case 'checkout':
        if (!name) throw new Error('Branch name required for checkout action');
        await this.gitOps.checkout(name, cwd);
        break;
    }
  }

  async log(limit?: number, path?: string): Promise<GitCommit[]> {
    return this.gitOps.log(limit || 10, path);
  }

  async clone(url: string, destination?: string): Promise<void> {
    await this.gitOps.clone(url, destination);
  }

  async createPullRequest(options: PullRequest): Promise<string> {
    if (!this.github) {
      throw new Error('GitHub integration not available');
    }
    return this.github.createPullRequest(options);
  }

  async stash(message?: string, path?: string): Promise<void> {
    await this.gitOps.stash(message, path);
  }

  async stashPop(path?: string): Promise<void> {
    await this.gitOps.stashPop(path);
  }

  async getCurrentBranch(path?: string): Promise<string> {
    return this.gitOps.getCurrentBranch(path);
  }

  // Additional methods for commands
  async gitInit(path: string, bare: boolean): Promise<{ message: string }> {
    await this.init(path, bare);
    return { message: `Initialized ${bare ? 'bare ' : ''}Git repository in ${path}` };
  }

  async gitAdd(files: string | string[], path?: string): Promise<{ message: string }> {
    await this.add(files, path);
    const fileCount = Array.isArray(files) ? files.length : 1;
    return { message: `Added ${fileCount} file(s) to staging area` };
  }

  async gitAddAll(path?: string): Promise<{ message: string }> {
    await this.add('.', path);
    return { message: 'Added all changes to staging area' };
  }

  async gitCommit(message: string, files?: string[], path?: string): Promise<{ message: string }> {
    await this.commit(message, files, path);
    return { message: 'Changes committed successfully' };
  }

  async gitPush(remote: string, branch?: string, force?: boolean, setUpstream?: boolean, path?: string): Promise<{ message: string }> {
    await this.push({ remote, branch, force }, path);
    return { message: `Pushed to ${remote}${branch ? '/' + branch : ''}` };
  }

  async gitPull(remote: string, branch?: string, rebase?: boolean, path?: string): Promise<{ message: string }> {
    await this.pull({ remote, branch }, path);
    return { message: `Pulled from ${remote}${branch ? '/' + branch : ''}` };
  }

  async gitBranchList(all: boolean, remote: boolean, path?: string): Promise<string[]> {
    return this.gitOps.getBranches(all, path);
  }

  async gitBranchCreate(name: string, path?: string): Promise<{ message: string }> {
    await this.branch('create', name, { path });
    return { message: `Created branch '${name}'` };
  }

  async gitBranchDelete(name: string, force: boolean, path?: string): Promise<{ message: string }> {
    await this.branch('delete', name, { force, path });
    return { message: `Deleted branch '${name}'` };
  }

  async gitBranchRename(oldName: string, newName: string, path?: string): Promise<{ message: string }> {
    // This would need implementation in GitOperations
    throw new Error('Branch rename not yet implemented');
  }

  async gitCheckout(branch: string, create: boolean, force: boolean, path?: string): Promise<{ message: string }> {
    if (create) {
      await this.branch('create', branch, { path });
    }
    await this.branch('checkout', branch, { path });
    return { message: `Switched to branch '${branch}'` };
  }

  async gitLog(options: any): Promise<GitCommit[]> {
    return this.log(options.limit, options.path);
  }

  async gitClone(url: string, directory?: string, branch?: string, depth?: number, bare?: boolean): Promise<{ message: string }> {
    await this.clone(url, directory);
    return { message: `Cloned repository to ${directory || url.split('/').pop()?.replace('.git', '')}` };
  }

  async gitStatus(): Promise<{ message: string }> {
    const status = await this.status();
    return { message: JSON.stringify(status, null, 2) };
  }
}
