import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PullRequest {
  title: string;
  body?: string;
  base?: string;
  head?: string;
}

export class GitHubIntegration {
  private async executeCommand(command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(command);
      return stdout.trim();
    } catch (error: any) {
      throw new Error(`GitHub CLI command failed: ${error.message}`);
    }
  }

  async createPullRequest(options: PullRequest): Promise<string> {
    let command = `gh pr create --title "${options.title}"`;
    
    if (options.body) {
      command += ` --body "${options.body}"`;
    }
    
    if (options.base) {
      command += ` --base ${options.base}`;
    }
    
    if (options.head) {
      command += ` --head ${options.head}`;
    }
    
    return this.executeCommand(command);
  }

  async listPullRequests(state: 'open' | 'closed' | 'all' = 'open'): Promise<any[]> {
    const output = await this.executeCommand(`gh pr list --state ${state} --json number,title,author,state`);
    return JSON.parse(output);
  }

  async getPullRequest(number: number): Promise<any> {
    const output = await this.executeCommand(`gh pr view ${number} --json number,title,body,author,state,mergeable`);
    return JSON.parse(output);
  }

  async mergePullRequest(number: number, method: 'merge' | 'squash' | 'rebase' = 'merge'): Promise<void> {
    await this.executeCommand(`gh pr merge ${number} --${method}`);
  }

  async createIssue(title: string, body?: string): Promise<string> {
    let command = `gh issue create --title "${title}"`;
    
    if (body) {
      command += ` --body "${body}"`;
    }
    
    return this.executeCommand(command);
  }

  async listIssues(state: 'open' | 'closed' | 'all' = 'open'): Promise<any[]> {
    const output = await this.executeCommand(`gh issue list --state ${state} --json number,title,author,state`);
    return JSON.parse(output);
  }

  async createRepository(name: string, options?: {
    description?: string;
    public?: boolean;
    clone?: boolean;
  }): Promise<string> {
    let command = `gh repo create ${name}`;
    
    if (options?.description) {
      command += ` --description "${options.description}"`;
    }
    
    if (options?.public !== undefined) {
      command += options.public ? ' --public' : ' --private';
    }
    
    if (options?.clone) {
      command += ' --clone';
    }
    
    return this.executeCommand(command);
  }
}
