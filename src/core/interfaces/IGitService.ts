export interface IGitService {
  init(path?: string, bare?: boolean): Promise<void>;
  status(path?: string): Promise<GitStatus>;
  add(files: string | string[], path?: string): Promise<void>;
  commit(message: string, files?: string[], path?: string): Promise<void>;
  push(options?: { remote?: string; branch?: string; force?: boolean }, path?: string): Promise<void>;
  pull(options?: { remote?: string; branch?: string }, path?: string): Promise<void>;
  branch(action: 'list' | 'create' | 'delete' | 'checkout', name?: string, options?: any): Promise<any>;
  log(limit?: number, path?: string): Promise<GitCommit[]>;
  clone(url: string, destination?: string): Promise<void>;
  createPullRequest(options: any): Promise<string>;
  stash(message?: string, path?: string): Promise<void>;
  stashPop(path?: string): Promise<void>;
  getCurrentBranch(path?: string): Promise<string>;
}

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
