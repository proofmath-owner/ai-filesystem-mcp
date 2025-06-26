import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
}

export interface GitCommit {
  hash: string;
  author: string;
  date: Date;
  message: string;
}

export class GitOperations {
  private async executeGitCommand(command: string, cwd?: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`git ${command}`, { cwd });
      return stdout.trim();
    } catch (error: any) {
      throw new Error(`Git command failed: ${error.message}`);
    }
  }

  async init(directory: string, bare: boolean = false): Promise<void> {
    const command = bare ? 'init --bare' : 'init';
    await this.executeGitCommand(command, directory);
  }

  async clone(url: string, destination?: string): Promise<void> {
    const command = destination ? `clone ${url} ${destination}` : `clone ${url}`;
    await this.executeGitCommand(command);
  }

  async add(files: string | string[], cwd?: string): Promise<void> {
    const fileList = Array.isArray(files) ? files.join(' ') : files;
    await this.executeGitCommand(`add ${fileList}`, cwd);
  }

  async commit(message: string, cwd?: string): Promise<void> {
    // Escape the message for shell
    const escapedMessage = message.replace(/"/g, '\\"');
    await this.executeGitCommand(`commit -m "${escapedMessage}"`, cwd);
  }

  async push(remote: string = 'origin', branch?: string, force: boolean = false, cwd?: string): Promise<void> {
    let command = `push ${remote}`;
    if (branch) command += ` ${branch}`;
    if (force) command += ' --force';
    
    await this.executeGitCommand(command, cwd);
  }

  async pull(remote: string = 'origin', branch?: string, cwd?: string): Promise<void> {
    let command = `pull ${remote}`;
    if (branch) command += ` ${branch}`;
    
    await this.executeGitCommand(command, cwd);
  }

  async getStatus(cwd?: string): Promise<GitStatus> {
    const branchOutput = await this.executeGitCommand('branch --show-current', cwd);
    const statusOutput = await this.executeGitCommand('status --porcelain', cwd);
    
    // Parse ahead/behind
    let ahead = 0, behind = 0;
    try {
      const upstreamOutput = await this.executeGitCommand('rev-list --left-right --count HEAD...@{u}', cwd);
      const [aheadStr, behindStr] = upstreamOutput.split('\t');
      ahead = parseInt(aheadStr) || 0;
      behind = parseInt(behindStr) || 0;
    } catch {
      // No upstream branch
    }

    // Parse status
    const staged: string[] = [];
    const modified: string[] = [];
    const untracked: string[] = [];

    if (statusOutput) {
      const lines = statusOutput.split('\n');
      for (const line of lines) {
        if (line.length < 3) continue;
        
        const status = line.substring(0, 2);
        const file = line.substring(3);
        
        if (status[0] !== ' ' && status[0] !== '?') {
          staged.push(file);
        }
        if (status[1] === 'M') {
          modified.push(file);
        }
        if (status === '??') {
          untracked.push(file);
        }
      }
    }

    return {
      branch: branchOutput,
      ahead,
      behind,
      staged,
      modified,
      untracked
    };
  }

  async log(limit: number = 10, cwd?: string): Promise<GitCommit[]> {
    const format = '%H|%an|%ai|%s';
    const output = await this.executeGitCommand(`log -${limit} --pretty=format:"${format}"`, cwd);
    
    if (!output) return [];
    
    return output.split('\n').map(line => {
      const [hash, author, date, message] = line.split('|');
      return {
        hash,
        author,
        date: new Date(date),
        message
      };
    });
  }

  async getCurrentBranch(cwd?: string): Promise<string> {
    return this.executeGitCommand('branch --show-current', cwd);
  }

  async getBranches(all: boolean = false, cwd?: string): Promise<string[]> {
    const command = all ? 'branch -a' : 'branch';
    const output = await this.executeGitCommand(command, cwd);
    
    return output
      .split('\n')
      .map(line => line.trim().replace(/^\* /, ''))
      .filter(branch => branch.length > 0);
  }

  async createBranch(name: string, cwd?: string): Promise<void> {
    await this.executeGitCommand(`branch ${name}`, cwd);
  }

  async deleteBranch(name: string, force: boolean = false, cwd?: string): Promise<void> {
    const flag = force ? '-D' : '-d';
    await this.executeGitCommand(`branch ${flag} ${name}`, cwd);
  }

  async checkout(branch: string, cwd?: string): Promise<void> {
    await this.executeGitCommand(`checkout ${branch}`, cwd);
  }

  async stash(message?: string, cwd?: string): Promise<void> {
    const command = message ? `stash push -m "${message}"` : 'stash';
    await this.executeGitCommand(command, cwd);
  }

  async stashPop(cwd?: string): Promise<void> {
    await this.executeGitCommand('stash pop', cwd);
  }
}
