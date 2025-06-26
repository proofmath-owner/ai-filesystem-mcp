import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

export interface GitStatus {
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
  branch: string;
  ahead: number;
  behind: number;
}

export interface GitCommitResult {
  success: boolean;
  commitHash?: string;
  error?: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
}

export interface GitRemote {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface PullRequest {
  number: number;
  title: string;
  state: string;
  author: string;
  branch: string;
  url: string;
}

export interface GitLogEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export class GitIntegration {
  private workingDir: string;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = path.resolve(workingDir);
  }

  // Git 저장소 초기화
  async init(bare: boolean = false): Promise<void> {
    try {
      const bareFlag = bare ? '--bare' : '';
      await execAsync(`git init ${bareFlag}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Git init failed: ${error}`);
    }
  }

  // Git 상태 확인
  async status(): Promise<GitStatus> {
    try {
      // 현재 브랜치 확인
      const { stdout: branch } = await execAsync('git branch --show-current', { cwd: this.workingDir });
      
      // 상태 확인
      const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: this.workingDir });
      
      // 원격과의 차이 확인
      let ahead = 0, behind = 0;
      try {
        const { stdout: revList } = await execAsync('git rev-list --left-right --count HEAD...@{u}', { cwd: this.workingDir });
        const [a, b] = revList.trim().split('\t').map(Number);
        ahead = a || 0;
        behind = b || 0;
      } catch {
        // 원격 브랜치가 없을 수 있음
      }

      const status: GitStatus = {
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
        branch: branch.trim(),
        ahead,
        behind
      };

      // 상태 파싱
      const lines = statusOutput.trim().split('\n').filter(line => line);
      for (const line of lines) {
        const statusCode = line.substring(0, 2);
        const filePath = line.substring(3);

        if (statusCode === ' M' || statusCode === 'MM') {
          status.modified.push(filePath);
        } else if (statusCode === 'A ' || statusCode === 'AM') {
          status.added.push(filePath);
        } else if (statusCode === ' D' || statusCode === 'D ') {
          status.deleted.push(filePath);
        } else if (statusCode === '??') {
          status.untracked.push(filePath);
        }
      }

      return status;
    } catch (error) {
      throw new Error(`Git status failed: ${error}`);
    }
  }

  // 파일 추가
  async add(files: string | string[]): Promise<void> {
    const fileList = Array.isArray(files) ? files : [files];
    const filePaths = fileList.map(f => path.relative(this.workingDir, path.resolve(f))).join(' ');
    
    try {
      await execAsync(`git add ${filePaths}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Git add failed: ${error}`);
    }
  }

  // 모든 파일 추가
  async addAll(): Promise<void> {
    try {
      await execAsync('git add .', { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Git add all failed: ${error}`);
    }
  }

  // 커밋
  async commit(message: string, files?: string[]): Promise<GitCommitResult> {
    try {
      // 특정 파일만 스테이징
      if (files && files.length > 0) {
        await this.add(files);
      }

      // 커밋
      const { stdout } = await execAsync(`git commit -m "${message}"`, { cwd: this.workingDir });
      
      // 커밋 해시 추출
      const hashMatch = stdout.match(/\[[\w\s]+\s+([\w]+)\]/);
      const commitHash = hashMatch ? hashMatch[1] : undefined;

      return { success: true, commitHash };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Push
  async push(remote: string = 'origin', branch?: string, force: boolean = false): Promise<void> {
    try {
      const currentBranch = branch || (await this.getCurrentBranch());
      const forceFlag = force ? '--force' : '';
      await execAsync(`git push ${forceFlag} ${remote} ${currentBranch}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Git push failed: ${error}`);
    }
  }

  // Pull
  async pull(remote: string = 'origin', branch?: string): Promise<void> {
    try {
      const branchArg = branch || '';
      await execAsync(`git pull ${remote} ${branchArg}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Git pull failed: ${error}`);
    }
  }

  // Fetch
  async fetch(remote: string = 'origin', all: boolean = false): Promise<void> {
    try {
      const allFlag = all ? '--all' : '';
      await execAsync(`git fetch ${allFlag} ${remote}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Git fetch failed: ${error}`);
    }
  }

  // 브랜치 목록
  async branches(all: boolean = false): Promise<GitBranch[]> {
    try {
      const allFlag = all ? '-a' : '';
      const { stdout } = await execAsync(`git branch ${allFlag}`, { cwd: this.workingDir });
      
      return stdout.trim().split('\n').map(line => {
        const current = line.startsWith('*');
        const name = line.replace(/^\*?\s+/, '').trim();
        const isRemote = name.startsWith('remotes/');
        
        return {
          name: isRemote ? name.replace('remotes/', '') : name,
          current,
          remote: isRemote ? name.split('/')[1] : undefined
        };
      });
    } catch (error) {
      throw new Error(`Git branches failed: ${error}`);
    }
  }

  // 현재 브랜치
  async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: this.workingDir });
      return stdout.trim();
    } catch (error) {
      throw new Error(`Get current branch failed: ${error}`);
    }
  }

  // 브랜치 생성
  async createBranch(name: string, checkout: boolean = false): Promise<void> {
    try {
      if (checkout) {
        await execAsync(`git checkout -b ${name}`, { cwd: this.workingDir });
      } else {
        await execAsync(`git branch ${name}`, { cwd: this.workingDir });
      }
    } catch (error) {
      throw new Error(`Create branch failed: ${error}`);
    }
  }

  // 브랜치 삭제
  async deleteBranch(name: string, force: boolean = false): Promise<void> {
    try {
      const deleteFlag = force ? '-D' : '-d';
      await execAsync(`git branch ${deleteFlag} ${name}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Delete branch failed: ${error}`);
    }
  }

  // 브랜치 전환
  async checkout(branch: string, create: boolean = false): Promise<void> {
    try {
      const createFlag = create ? '-b' : '';
      await execAsync(`git checkout ${createFlag} ${branch}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Git checkout failed: ${error}`);
    }
  }

  // Merge
  async merge(branch: string, noFastForward: boolean = false): Promise<void> {
    try {
      const ffFlag = noFastForward ? '--no-ff' : '';
      await execAsync(`git merge ${ffFlag} ${branch}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Git merge failed: ${error}`);
    }
  }

  // Rebase
  async rebase(branch: string, interactive: boolean = false): Promise<void> {
    try {
      const interactiveFlag = interactive ? '-i' : '';
      await execAsync(`git rebase ${interactiveFlag} ${branch}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Git rebase failed: ${error}`);
    }
  }

  // Remote 목록
  async remotes(): Promise<GitRemote[]> {
    try {
      const { stdout } = await execAsync('git remote -v', { cwd: this.workingDir });
      const remotes = new Map<string, GitRemote>();
      
      stdout.trim().split('\n').forEach(line => {
        const [name, url, type] = line.split(/\s+/);
        if (!remotes.has(name)) {
          remotes.set(name, { name, fetchUrl: '', pushUrl: '' });
        }
        const remote = remotes.get(name)!;
        if (type === '(fetch)') {
          remote.fetchUrl = url;
        } else if (type === '(push)') {
          remote.pushUrl = url;
        }
      });
      
      return Array.from(remotes.values());
    } catch (error) {
      throw new Error(`Git remotes failed: ${error}`);
    }
  }

  // Remote 추가
  async addRemote(name: string, url: string): Promise<void> {
    try {
      await execAsync(`git remote add ${name} ${url}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Add remote failed: ${error}`);
    }
  }

  // Remote 제거
  async removeRemote(name: string): Promise<void> {
    try {
      await execAsync(`git remote remove ${name}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Remove remote failed: ${error}`);
    }
  }

  // 변경사항 보기
  async diff(file?: string, staged: boolean = false): Promise<string> {
    try {
      const stagedFlag = staged ? '--staged' : '';
      const fileArg = file ? path.relative(this.workingDir, path.resolve(file)) : '';
      
      const { stdout } = await execAsync(`git diff ${stagedFlag} ${fileArg}`, { cwd: this.workingDir });
      return stdout;
    } catch (error) {
      throw new Error(`Git diff failed: ${error}`);
    }
  }

  // 로그 보기
  async log(limit: number = 10): Promise<GitLogEntry[]> {
    try {
      const { stdout } = await execAsync(
        `git log --pretty=format:'%H|%an|%ad|%s' --date=short -n ${limit}`,
        { cwd: this.workingDir }
      );

      return stdout.trim().split('\n').map(line => {
        const [hash, author, date, message] = line.split('|');
        return { hash, author, date, message };
      });
    } catch (error) {
      throw new Error(`Git log failed: ${error}`);
    }
  }

  // 스태시
  async stash(message?: string): Promise<void> {
    try {
      const messageArg = message ? `push -m "${message}"` : '';
      await execAsync(`git stash ${messageArg}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Git stash failed: ${error}`);
    }
  }

  // 스태시 팝
  async stashPop(): Promise<void> {
    try {
      await execAsync('git stash pop', { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Git stash pop failed: ${error}`);
    }
  }

  // 스태시 목록
  async stashList(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git stash list', { cwd: this.workingDir });
      return stdout.trim().split('\n').filter(line => line);
    } catch (error) {
      throw new Error(`Git stash list failed: ${error}`);
    }
  }

  // Tag 생성
  async createTag(name: string, message?: string): Promise<void> {
    try {
      const messageArg = message ? `-m "${message}"` : '';
      await execAsync(`git tag ${messageArg} ${name}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Create tag failed: ${error}`);
    }
  }

  // Tag 목록
  async tags(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git tag', { cwd: this.workingDir });
      return stdout.trim().split('\n').filter(line => line);
    } catch (error) {
      throw new Error(`List tags failed: ${error}`);
    }
  }

  // GitHub CLI 명령어들
  async hasGitHubCLI(): Promise<boolean> {
    try {
      await execAsync('gh --version');
      return true;
    } catch {
      return false;
    }
  }

  // GitHub 레포지토리 생성
  async createGitHubRepo(name: string, description?: string, isPrivate: boolean = false): Promise<string> {
    try {
      const privacyFlag = isPrivate ? '--private' : '--public';
      const descFlag = description ? `--description "${description}"` : '';
      
      const { stdout } = await execAsync(
        `gh repo create ${name} ${privacyFlag} ${descFlag} --source=. --remote=origin`,
        { cwd: this.workingDir }
      );
      
      return stdout.trim();
    } catch (error) {
      throw new Error(`Create GitHub repo failed: ${error}`);
    }
  }

  // Pull Request 생성
  async createPullRequest(title: string, body?: string, base?: string): Promise<string> {
    try {
      const bodyArg = body ? `--body "${body}"` : '';
      const baseArg = base ? `--base ${base}` : '';
      
      const { stdout } = await execAsync(
        `gh pr create --title "${title}" ${bodyArg} ${baseArg}`,
        { cwd: this.workingDir }
      );
      
      // URL 추출
      const urlMatch = stdout.match(/https:\/\/github\.com\/[\w-]+\/[\w-]+\/pull\/\d+/);
      return urlMatch ? urlMatch[0] : stdout.trim();
    } catch (error) {
      throw new Error(`Create PR failed: ${error}`);
    }
  }

  // Pull Request 목록
  async listPullRequests(state: 'open' | 'closed' | 'all' = 'open'): Promise<PullRequest[]> {
    try {
      const { stdout } = await execAsync(
        `gh pr list --state ${state} --json number,title,state,author,headRefName,url`,
        { cwd: this.workingDir }
      );
      
      const prs = JSON.parse(stdout);
      return prs.map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.author.login,
        branch: pr.headRefName,
        url: pr.url
      }));
    } catch (error) {
      throw new Error(`List PRs failed: ${error}`);
    }
  }

  // Pull Request 머지
  async mergePullRequest(prNumber: number, method: 'merge' | 'squash' | 'rebase' = 'merge'): Promise<void> {
    try {
      await execAsync(
        `gh pr merge ${prNumber} --${method}`,
        { cwd: this.workingDir }
      );
    } catch (error) {
      throw new Error(`Merge PR failed: ${error}`);
    }
  }

  // Issue 생성
  async createIssue(title: string, body?: string, labels?: string[]): Promise<string> {
    try {
      const bodyArg = body ? `--body "${body}"` : '';
      const labelsArg = labels && labels.length > 0 ? `--label ${labels.join(',')}` : '';
      
      const { stdout } = await execAsync(
        `gh issue create --title "${title}" ${bodyArg} ${labelsArg}`,
        { cwd: this.workingDir }
      );
      
      return stdout.trim();
    } catch (error) {
      throw new Error(`Create issue failed: ${error}`);
    }
  }

  // Clone
  async clone(url: string, destination?: string): Promise<void> {
    try {
      const destArg = destination || '';
      await execAsync(`git clone ${url} ${destArg}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Git clone failed: ${error}`);
    }
  }

  // Git 저장소인지 확인
  async isGitRepository(): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: this.workingDir });
      return true;
    } catch {
      return false;
    }
  }

  // .gitignore 생성/업데이트
  async updateGitignore(patterns: string[]): Promise<void> {
    try {
      const gitignorePath = path.join(this.workingDir, '.gitignore');
      let content = '';
      
      try {
        content = await fs.readFile(gitignorePath, 'utf-8');
      } catch {
        // 파일이 없으면 새로 생성
      }
      
      const existingPatterns = new Set(content.split('\n').filter(line => line.trim() && !line.startsWith('#')));
      patterns.forEach(pattern => existingPatterns.add(pattern));
      
      const newContent = Array.from(existingPatterns).join('\n') + '\n';
      await fs.writeFile(gitignorePath, newContent);
    } catch (error) {
      throw new Error(`Update .gitignore failed: ${error}`);
    }
  }

  // ===== 추가 메서드들 =====
  
  // Remote 관리 (오버로드된 버전)
  async remote(options: {
    action: 'list' | 'add' | 'remove' | 'rename' | 'set-url';
    name?: string;
    url?: string;
    newName?: string;
    verbose?: boolean;
  }): Promise<{ output: string }> {
    try {
      let command = 'git remote';
      
      switch (options.action) {
        case 'list':
          command += options.verbose ? ' -v' : '';
          break;
        case 'add':
          command += ` add ${options.name} ${options.url}`;
          break;
        case 'remove':
          command += ` remove ${options.name}`;
          break;
        case 'rename':
          command += ` rename ${options.name} ${options.newName}`;
          break;
        case 'set-url':
          command += ` set-url ${options.name} ${options.url}`;
          break;
      }
      
      const { stdout } = await execAsync(command, { cwd: this.workingDir });
      return { output: stdout };
    } catch (error) {
      throw new Error(`Git remote ${options.action} failed: ${error}`);
    }
  }

  // Stash 고급 관리 (오버로드된 버전)
  async stashAdvanced(options: {
    action: 'push' | 'pop' | 'list' | 'show' | 'drop' | 'clear';
    message?: string;
    index?: number;
    includeUntracked?: boolean;
  }): Promise<{ output: string }> {
    try {
      let command = 'git stash';
      
      switch (options.action) {
        case 'push':
          command += ' push';
          if (options.includeUntracked) command += ' -u';
          if (options.message) command += ` -m "${options.message}"`;
          break;
        case 'pop':
          command += ' pop';
          if (options.index !== undefined) command += ` stash@{${options.index}}`;
          break;
        case 'list':
          command += ' list';
          break;
        case 'show':
          command += ' show';
          if (options.index !== undefined) command += ` stash@{${options.index}}`;
          break;
        case 'drop':
          command += ' drop';
          if (options.index !== undefined) command += ` stash@{${options.index}}`;
          break;
        case 'clear':
          command += ' clear';
          break;
      }
      
      const { stdout } = await execAsync(command, { cwd: this.workingDir });
      return { output: stdout };
    } catch (error) {
      throw new Error(`Git stash ${options.action} failed: ${error}`);
    }
  }

  // Tag 고급 관리
  async tagAdvanced(options: {
    action: 'list' | 'create' | 'delete' | 'push';
    name?: string;
    message?: string;
    commit?: string;
    force?: boolean;
  }): Promise<{ output: string }> {
    try {
      let command = 'git tag';
      
      switch (options.action) {
        case 'list':
          // Default behavior
          break;
        case 'create':
          if (options.message) {
            command += ` -a ${options.name} -m "${options.message}"`;
          } else {
            command += ` ${options.name}`;
          }
          if (options.commit) command += ` ${options.commit}`;
          if (options.force) command = command.replace('git tag', 'git tag -f');
          break;
        case 'delete':
          command += ` -d ${options.name}`;
          break;
        case 'push':
          command = `git push origin ${options.name}`;
          if (options.force) command += ' --force';
          break;
      }
      
      const { stdout } = await execAsync(command, { cwd: this.workingDir });
      return { output: stdout };
    } catch (error) {
      throw new Error(`Git tag ${options.action} failed: ${error}`);
    }
  }

  // Merge 고급 기능 (오버로드된 버전)
  async mergeAdvanced(options: {
    branch: string;
    strategy?: 'recursive' | 'ours' | 'theirs' | 'octopus';
    noFastForward?: boolean;
    message?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      let command = 'git merge';
      
      if (options.strategy) {
        command += ` -s ${options.strategy}`;
      }
      if (options.noFastForward) {
        command += ' --no-ff';
      }
      if (options.message) {
        command += ` -m "${options.message}"`;
      }
      command += ` ${options.branch}`;
      
      await execAsync(command, { cwd: this.workingDir });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  // Rebase 고급 기능 (오버로드된 버전)
  async rebaseAdvanced(options: {
    branch: string;
    interactive?: boolean;
  }): Promise<{ output: string }> {
    try {
      let command = 'git rebase';
      if (options.interactive) command += ' -i';
      command += ` ${options.branch}`;
      
      const { stdout } = await execAsync(command, { cwd: this.workingDir });
      return { output: stdout };
    } catch (error) {
      throw new Error(`Git rebase failed: ${error}`);
    }
  }

  async rebaseAbort(): Promise<{ output: string }> {
    try {
      const { stdout } = await execAsync('git rebase --abort', { cwd: this.workingDir });
      return { output: stdout };
    } catch (error) {
      throw new Error(`Git rebase abort failed: ${error}`);
    }
  }

  async rebaseContinue(): Promise<{ output: string }> {
    try {
      const { stdout } = await execAsync('git rebase --continue', { cwd: this.workingDir });
      return { output: stdout };
    } catch (error) {
      throw new Error(`Git rebase continue failed: ${error}`);
    }
  }

  // Diff 고급 기능 (오버로드된 버전)
  async diffAdvanced(options: {
    target?: string;
    cached?: boolean;
    nameOnly?: boolean;
    stat?: boolean;
  }): Promise<{ output: string }> {
    try {
      let command = 'git diff';
      
      if (options.cached) command += ' --cached';
      if (options.nameOnly) command += ' --name-only';
      if (options.stat) command += ' --stat';
      if (options.target) command += ` ${options.target}`;
      
      const { stdout } = await execAsync(command, { cwd: this.workingDir });
      return { output: stdout };
    } catch (error) {
      throw new Error(`Git diff failed: ${error}`);
    }
  }

  // Reset 기능
  async reset(options: {
    target?: string;
    mode?: 'soft' | 'mixed' | 'hard';
    files?: string[];
  }): Promise<{ success: boolean; error?: string }> {
    try {
      let command = 'git reset';
      
      if (options.mode) {
        command += ` --${options.mode}`;
      }
      if (options.target) {
        command += ` ${options.target}`;
      }
      if (options.files && options.files.length > 0) {
        command += ` -- ${options.files.join(' ')}`;
      }
      
      await execAsync(command, { cwd: this.workingDir });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  // Cherry-pick 기능
  async cherryPick(options: {
    commits: string[];
    noCommit?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      let command = 'git cherry-pick';
      
      if (options.noCommit) {
        command += ' -n';
      }
      command += ` ${options.commits.join(' ')}`;
      
      await execAsync(command, { cwd: this.workingDir });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }
}
