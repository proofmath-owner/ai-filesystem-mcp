import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

interface GitStatus {
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
  branch: string;
  ahead: number;
  behind: number;
}

interface GitCommitResult {
  success: boolean;
  commitHash?: string;
  error?: string;
}

export class GitIntegration {
  private workingDir: string;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = path.resolve(workingDir);
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

      return {
        success: true,
        commitHash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
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
  async log(limit: number = 10): Promise<Array<{hash: string, author: string, date: string, message: string}>> {
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

  // 브랜치 생성 및 전환
  async checkout(branch: string, create: boolean = false): Promise<void> {
    try {
      const createFlag = create ? '-b' : '';
      await execAsync(`git checkout ${createFlag} ${branch}`, { cwd: this.workingDir });
    } catch (error) {
      throw new Error(`Git checkout failed: ${error}`);
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

  // Git 저장소인지 확인
  async isGitRepository(): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: this.workingDir });
      return true;
    } catch {
      return false;
    }
  }
}
