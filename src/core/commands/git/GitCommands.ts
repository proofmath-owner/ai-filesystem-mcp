import { Command, CommandContext, CommandResult } from '../Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GitIntegration, GitBranch, GitLogEntry } from '../../GitIntegration.js';

/**
 * Git Status Command
 * Git 저장소의 상태를 확인합니다.
 */
export class GitStatusCommand extends Command {
  readonly name = 'git_status';
  readonly description = 'Get git repository status';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Repository path (optional, defaults to current directory)' }
    }
  };

  protected validateArgs(args: Record<string, any>): void {
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path } = context.args;
    const git = new GitIntegration(path);
    const status = await git.status();
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(status, null, 2)
      }]
    };
  }
}

/**
 * Git Commit Command
 * 변경사항을 Git에 커밋합니다.
 */
export class GitCommitCommand extends Command {
  readonly name = 'git_commit';
  readonly description = 'Commit changes to git';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      message: { 
        type: 'string', 
        description: 'Commit message' 
      },
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific files to commit (optional)'
      },
      path: { type: 'string', description: 'Repository path (optional, defaults to current directory)' }
    },
    required: ['message']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.message, 'message');
    
    // files가 제공된 경우에만 검증
    if (args.files !== undefined && !Array.isArray(args.files)) {
      throw new Error('files must be an array of strings');
    }
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { message, files, path } = context.args;
    const git = new GitIntegration(path);
    const result = await git.commit(message, files);
    
    return {
      content: [{
        type: 'text',
        text: result.success ? 'Changes committed successfully' : `Commit failed: ${result.error}`
      }]
    };
  }
}

/**
 * Git Init Command
 * Git 저장소를 초기화합니다.
 */
export class GitInitCommand extends Command {
  readonly name = 'git_init';
  readonly description = 'Initialize a new git repository';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Directory path (optional, defaults to current)' },
      bare: { type: 'boolean', description: 'Create a bare repository' }
    }
  };

  protected validateArgs(args: Record<string, any>): void {
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
    if (args.bare !== undefined) {
      this.assertBoolean(args.bare, 'bare');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path, bare = false } = context.args;
    const git = new GitIntegration(path);
    
    await git.init(bare);
    
    return {
      content: [{
        type: 'text',
        text: `Git repository initialized${bare ? ' (bare)' : ''} in ${path || process.cwd()}`
      }]
    };
  }
}

/**
 * Git Add Command
 * 파일을 스테이징합니다.
 */
export class GitAddCommand extends Command {
  readonly name = 'git_add';
  readonly description = 'Stage files for commit';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      files: { 
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } }
        ],
        description: 'File(s) to stage, or "." for all' 
      }
    },
    required: ['files']
  };

  protected validateArgs(args: Record<string, any>): void {
    if (typeof args.files !== 'string' && !Array.isArray(args.files)) {
      throw new Error('files must be a string or array of strings');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { files } = context.args;
    const git = new GitIntegration();
    
    if (files === '.' || files === '*') {
      await git.addAll();
      return {
        content: [{
          type: 'text',
          text: 'All files staged for commit'
        }]
      };
    }
    
    await git.add(files);
    const fileList = Array.isArray(files) ? files : [files];
    
    return {
      content: [{
        type: 'text',
        text: `Staged ${fileList.length} file(s) for commit`
      }]
    };
  }
}

/**
 * Git Push Command
 * 원격 저장소로 푸시합니다.
 */
export class GitPushCommand extends Command {
  readonly name = 'git_push';
  readonly description = 'Push commits to remote repository';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      remote: { type: 'string', default: 'origin', description: 'Remote name' },
      branch: { type: 'string', description: 'Branch name (optional, uses current)' },
      force: { type: 'boolean', default: false, description: 'Force push' },
      path: { type: 'string', description: 'Repository path (optional, defaults to current directory)' }
    }
  };

  protected validateArgs(args: Record<string, any>): void {
    if (args.remote !== undefined) {
      this.assertString(args.remote, 'remote');
    }
    if (args.branch !== undefined) {
      this.assertString(args.branch, 'branch');
    }
    if (args.force !== undefined) {
      this.assertBoolean(args.force, 'force');
    }
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { remote = 'origin', branch, force = false, path } = context.args;
    const git = new GitIntegration(path);
    
    await git.push(remote, branch, force);
    
    return {
      content: [{
        type: 'text',
        text: `Successfully pushed to ${remote}${branch ? `/${branch}` : ''}${force ? ' (forced)' : ''}`
      }]
    };
  }
}

/**
 * Git Pull Command
 * 원격 저장소에서 풀합니다.
 */
export class GitPullCommand extends Command {
  readonly name = 'git_pull';
  readonly description = 'Pull changes from remote repository';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      remote: { type: 'string', default: 'origin', description: 'Remote name' },
      branch: { type: 'string', description: 'Branch name (optional)' },
      path: { type: 'string', description: 'Repository path (optional, defaults to current directory)' }
    }
  };

  protected validateArgs(args: Record<string, any>): void {
    if (args.remote !== undefined) {
      this.assertString(args.remote, 'remote');
    }
    if (args.branch !== undefined) {
      this.assertString(args.branch, 'branch');
    }
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { remote = 'origin', branch, path } = context.args;
    const git = new GitIntegration(path);
    
    await git.pull(remote, branch);
    
    return {
      content: [{
        type: 'text',
        text: `Successfully pulled from ${remote}${branch ? `/${branch}` : ''}`
      }]
    };
  }
}

/**
 * Git Branch Command
 * 브랜치를 관리합니다.
 */
export class GitBranchCommand extends Command {
  readonly name = 'git_branch';
  readonly description = 'Manage git branches';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      action: { 
        type: 'string', 
        enum: ['list', 'create', 'delete', 'checkout'],
        default: 'list',
        description: 'Branch action' 
      },
      name: { type: 'string', description: 'Branch name (for create/delete/checkout)' },
      all: { type: 'boolean', default: false, description: 'Show all branches including remotes' },
      force: { type: 'boolean', default: false, description: 'Force delete' },
      path: { type: 'string', description: 'Repository path (optional, defaults to current directory)' }
    }
  };

  protected validateArgs(args: Record<string, any>): void {
    if (args.action && !['list', 'create', 'delete', 'checkout'].includes(args.action)) {
      throw new Error('action must be one of: list, create, delete, checkout');
    }
    if (args.name !== undefined) {
      this.assertString(args.name, 'name');
    }
    if (args.all !== undefined) {
      this.assertBoolean(args.all, 'all');
    }
    if (args.force !== undefined) {
      this.assertBoolean(args.force, 'force');
    }
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { action = 'list', name, all = false, force = false, path } = context.args;
    const git = new GitIntegration(path);
    
    switch (action) {
      case 'list': {
        const branches = await git.branches(all);
        const branchList = branches.map((b: GitBranch) => 
          `${b.current ? '* ' : '  '}${b.name}${b.remote ? ` (${b.remote})` : ''}`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `Branches:\n${branchList}`
          }]
        };
      }
      
      case 'create': {
        if (!name) throw new Error('Branch name required for create action');
        await git.createBranch(name, true);
        return {
          content: [{
            type: 'text',
            text: `Created and switched to branch '${name}'`
          }]
        };
      }
      
      case 'delete': {
        if (!name) throw new Error('Branch name required for delete action');
        await git.deleteBranch(name, force);
        return {
          content: [{
            type: 'text',
            text: `Deleted branch '${name}'`
          }]
        };
      }
      
      case 'checkout': {
        if (!name) throw new Error('Branch name required for checkout action');
        await git.checkout(name);
        return {
          content: [{
            type: 'text',
            text: `Switched to branch '${name}'`
          }]
        };
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

/**
 * Git Log Command
 * 커밋 히스토리를 보여줍니다.
 */
export class GitLogCommand extends Command {
  readonly name = 'git_log';
  readonly description = 'Show commit history';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      limit: { type: 'number', default: 10, description: 'Number of commits to show' },
      path: { type: 'string', description: 'Repository path (optional, defaults to current directory)' }
    }
  };

  protected validateArgs(args: Record<string, any>): void {
    if (args.limit !== undefined) {
      this.assertNumber(args.limit, 'limit');
    }
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { limit = 10, path } = context.args;
    const git = new GitIntegration(path);
    
    const logs = await git.log(limit);
    const logText = logs.map((log: GitLogEntry) => 
      `${log.hash.substring(0, 7)} - ${log.author} (${log.date}): ${log.message}`
    ).join('\n');
    
    return {
      content: [{
        type: 'text',
        text: logText || 'No commits found'
      }]
    };
  }
}

/**
 * GitHub Create PR Command
 * Pull Request를 생성합니다.
 */
export class GitHubCreatePRCommand extends Command {
  readonly name = 'github_create_pr';
  readonly description = 'Create a pull request';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'PR title' },
      body: { type: 'string', description: 'PR description' },
      base: { type: 'string', description: 'Base branch (optional)' },
      path: { type: 'string', description: 'Repository path (optional, defaults to current directory)' }
    },
    required: ['title']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.title, 'title');
    if (args.body !== undefined) {
      this.assertString(args.body, 'body');
    }
    if (args.base !== undefined) {
      this.assertString(args.base, 'base');
    }
    if (args.path !== undefined) {
      this.assertString(args.path, 'path');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { title, body, base, path } = context.args;
    const git = new GitIntegration(path);
    
    if (!await git.hasGitHubCLI()) {
      throw new Error('GitHub CLI (gh) is not installed. Please install it first: https://cli.github.com');
    }
    
    const prUrl = await git.createPullRequest(title, body, base);
    
    return {
      content: [{
        type: 'text',
        text: `Pull request created: ${prUrl}`
      }]
    };
  }
}

/**
 * Git Clone Command
 * 저장소를 복제합니다.
 */
export class GitCloneCommand extends Command {
  readonly name = 'git_clone';
  readonly description = 'Clone a repository';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Repository URL' },
      destination: { type: 'string', description: 'Destination directory (optional)' }
    },
    required: ['url']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.url, 'url');
    if (args.destination !== undefined) {
      this.assertString(args.destination, 'destination');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { url, destination } = context.args;
    const git = new GitIntegration();
    
    await git.clone(url, destination);
    
    return {
      content: [{
        type: 'text',
        text: `Repository cloned from ${url}${destination ? ` to ${destination}` : ''}`
      }]
    };
  }
}
