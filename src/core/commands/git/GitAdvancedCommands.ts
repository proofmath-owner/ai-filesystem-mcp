import { Command, CommandContext, CommandResult } from '../Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Git Remote Command
 * 원격 저장소를 관리합니다.
 */
export class GitRemoteCommand extends Command {
  readonly name = 'git_remote';
  readonly description = 'Manage git remotes';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'add', 'remove', 'rename', 'set-url'],
        description: 'Remote action',
        default: 'list'
      },
      name: {
        type: 'string',
        description: 'Remote name'
      },
      url: {
        type: 'string',
        description: 'Remote URL (for add/set-url)'
      },
      newName: {
        type: 'string',
        description: 'New name (for rename)'
      },
      verbose: {
        type: 'boolean',
        description: 'Show verbose output',
        default: false
      }
    }
  };

  protected validateArgs(args: Record<string, any>): void {
    const validActions = ['list', 'add', 'remove', 'rename', 'set-url'];
    if (args.action && !validActions.includes(args.action)) {
      throw new Error(`Invalid action. Must be one of: ${validActions.join(', ')}`);
    }
    
    if (args.action === 'add' || args.action === 'set-url') {
      this.assertString(args.name, 'name');
      this.assertString(args.url, 'url');
    } else if (args.action === 'remove') {
      this.assertString(args.name, 'name');
    } else if (args.action === 'rename') {
      this.assertString(args.name, 'name');
      this.assertString(args.newName, 'newName');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { action = 'list', name, url, newName, verbose = false } = context.args;
    
    const result = await context.fsManager.git.remote({
      action,
      name,
      url,
      newName,
      verbose
    });
    
    return {
      content: [{
        type: 'text',
        text: result.output || 'Remote operation completed successfully'
      }]
    };
  }
}

/**
 * Git Stash Command
 * 변경사항을 임시 저장합니다.
 */
export class GitStashCommand extends Command {
  readonly name = 'git_stash';
  readonly description = 'Stash changes';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['push', 'pop', 'list', 'show', 'drop', 'clear'],
        description: 'Stash action',
        default: 'push'
      },
      message: {
        type: 'string',
        description: 'Stash message (for push)'
      },
      index: {
        type: 'number',
        description: 'Stash index (for pop/show/drop)'
      },
      includeUntracked: {
        type: 'boolean',
        description: 'Include untracked files',
        default: false
      }
    }
  };

  protected validateArgs(args: Record<string, any>): void {
    const validActions = ['push', 'pop', 'list', 'show', 'drop', 'clear'];
    if (args.action && !validActions.includes(args.action)) {
      throw new Error(`Invalid action. Must be one of: ${validActions.join(', ')}`);
    }
    
    if (args.action === 'push' && args.message) {
      this.assertString(args.message, 'message');
    }
    
    if (['pop', 'show', 'drop'].includes(args.action) && args.index !== undefined) {
      this.assertNumber(args.index, 'index');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { action = 'push', message, index, includeUntracked = false } = context.args;
    
    const result = await context.fsManager.git.stashAdvanced({
      action,
      message,
      index,
      includeUntracked
    });
    
    return {
      content: [{
        type: 'text',
        text: result.output || 'Stash operation completed'
      }]
    };
  }
}

/**
 * Git Tag Command
 * Git 태그를 관리합니다.
 */
export class GitTagCommand extends Command {
  readonly name = 'git_tag';
  readonly description = 'Manage git tags';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'create', 'delete', 'push'],
        description: 'Tag action',
        default: 'list'
      },
      name: {
        type: 'string',
        description: 'Tag name'
      },
      message: {
        type: 'string',
        description: 'Tag message (for annotated tags)'
      },
      commit: {
        type: 'string',
        description: 'Commit to tag (default: HEAD)'
      },
      force: {
        type: 'boolean',
        description: 'Force tag creation/deletion',
        default: false
      }
    }
  };

  protected validateArgs(args: Record<string, any>): void {
    const validActions = ['list', 'create', 'delete', 'push'];
    if (args.action && !validActions.includes(args.action)) {
      throw new Error(`Invalid action. Must be one of: ${validActions.join(', ')}`);
    }
    
    if (['create', 'delete', 'push'].includes(args.action)) {
      this.assertString(args.name, 'name');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { action = 'list', name, message, commit, force = false } = context.args;
    
    const result = await context.fsManager.git.tagAdvanced({
      action,
      name,
      message,
      commit,
      force
    });
    
    return {
      content: [{
        type: 'text',
        text: result.output || 'Tag operation completed'
      }]
    };
  }
}

/**
 * Git Merge Command
 * 브랜치를 병합합니다.
 */
export class GitMergeCommand extends Command {
  readonly name = 'git_merge';
  readonly description = 'Merge branches';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      branch: {
        type: 'string',
        description: 'Branch to merge'
      },
      strategy: {
        type: 'string',
        enum: ['recursive', 'ours', 'theirs', 'octopus'],
        description: 'Merge strategy',
        default: 'recursive'
      },
      noFastForward: {
        type: 'boolean',
        description: 'Create merge commit even if fast-forward is possible',
        default: false
      },
      message: {
        type: 'string',
        description: 'Merge commit message'
      }
    },
    required: ['branch']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.branch, 'branch');
    
    if (args.strategy) {
      const validStrategies = ['recursive', 'ours', 'theirs', 'octopus'];
      if (!validStrategies.includes(args.strategy)) {
        throw new Error(`Invalid strategy. Must be one of: ${validStrategies.join(', ')}`);
      }
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { branch, strategy = 'recursive', noFastForward = false, message } = context.args;
    
    const result = await context.fsManager.git.mergeAdvanced({
      branch,
      strategy,
      noFastForward,
      message
    });
    
    return {
      content: [{
        type: 'text',
        text: result.success 
          ? `Successfully merged ${branch}` 
          : `Merge failed: ${result.error}`
      }]
    };
  }
}

/**
 * Git Rebase Command
 * 브랜치를 리베이스합니다.
 */
export class GitRebaseCommand extends Command {
  readonly name = 'git_rebase';
  readonly description = 'Rebase branches';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      branch: {
        type: 'string',
        description: 'Branch to rebase onto'
      },
      interactive: {
        type: 'boolean',
        description: 'Interactive rebase',
        default: false
      },
      continue: {
        type: 'boolean',
        description: 'Continue after resolving conflicts',
        default: false
      },
      abort: {
        type: 'boolean',
        description: 'Abort rebase',
        default: false
      }
    }
  };

  protected validateArgs(args: Record<string, any>): void {
    if (!args.continue && !args.abort) {
      this.assertString(args.branch, 'branch');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { branch, interactive = false, continue: cont = false, abort = false } = context.args;
    
    let result;
    if (abort) {
      result = await context.fsManager.git.rebaseAbort();
    } else if (cont) {
      result = await context.fsManager.git.rebaseContinue();
    } else {
      result = await context.fsManager.git.rebaseAdvanced({
        branch,
        interactive
      });
    }
    
    return {
      content: [{
        type: 'text',
        text: result.output || 'Rebase operation completed'
      }]
    };
  }
}

/**
 * Git Diff Command
 * 변경사항을 비교합니다.
 */
export class GitDiffCommand extends Command {
  readonly name = 'git_diff';
  readonly description = 'Show changes between commits, branches, etc.';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        description: 'Target to compare (branch, commit, file)'
      },
      cached: {
        type: 'boolean',
        description: 'Show staged changes',
        default: false
      },
      nameOnly: {
        type: 'boolean',
        description: 'Show only file names',
        default: false
      },
      stat: {
        type: 'boolean',
        description: 'Show diffstat',
        default: false
      }
    }
  };

  protected validateArgs(args: Record<string, any>): void {
    if (args.target !== undefined) {
      this.assertString(args.target, 'target');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { target, cached = false, nameOnly = false, stat = false } = context.args;
    
    const result = await context.fsManager.git.diffAdvanced({
      target,
      cached,
      nameOnly,
      stat
    });
    
    return {
      content: [{
        type: 'text',
        text: result.output || 'No changes detected'
      }]
    };
  }
}

/**
 * Git Reset Command
 * 변경사항을 리셋합니다.
 */
export class GitResetCommand extends Command {
  readonly name = 'git_reset';
  readonly description = 'Reset current HEAD to specified state';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        description: 'Commit or branch to reset to',
        default: 'HEAD'
      },
      mode: {
        type: 'string',
        enum: ['soft', 'mixed', 'hard'],
        description: 'Reset mode',
        default: 'mixed'
      },
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific files to reset'
      }
    }
  };

  protected validateArgs(args: Record<string, any>): void {
    if (args.target !== undefined) {
      this.assertString(args.target, 'target');
    }
    
    if (args.mode) {
      const validModes = ['soft', 'mixed', 'hard'];
      if (!validModes.includes(args.mode)) {
        throw new Error(`Invalid mode. Must be one of: ${validModes.join(', ')}`);
      }
    }
    
    if (args.files !== undefined) {
      this.assertArray(args.files, 'files');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { target = 'HEAD', mode = 'mixed', files } = context.args;
    
    const result = await context.fsManager.git.reset({
      target,
      mode,
      files
    });
    
    return {
      content: [{
        type: 'text',
        text: result.success 
          ? `Reset successful` 
          : `Reset failed: ${result.error}`
      }]
    };
  }
}

/**
 * Git Cherry-pick Command
 * 특정 커밋을 선택해서 적용합니다.
 */
export class GitCherryPickCommand extends Command {
  readonly name = 'git_cherry_pick';
  readonly description = 'Apply changes from specific commits';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      commits: {
        type: 'array',
        items: { type: 'string' },
        description: 'Commit hashes to cherry-pick'
      },
      noCommit: {
        type: 'boolean',
        description: 'Apply changes without committing',
        default: false
      }
    },
    required: ['commits']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertArray(args.commits, 'commits');
    if (args.commits.length === 0) {
      throw new Error('At least one commit is required');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { commits, noCommit = false } = context.args;
    
    const result = await context.fsManager.git.cherryPick({
      commits,
      noCommit
    });
    
    return {
      content: [{
        type: 'text',
        text: result.success 
          ? `Successfully cherry-picked ${commits.length} commit(s)` 
          : `Cherry-pick failed: ${result.error}`
      }]
    };
  }
}
