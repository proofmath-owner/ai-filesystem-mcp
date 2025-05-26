import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface IntegrationOptions {
  type: 's3' | 'gcs' | 'azure' | 'dropbox' | 'gdrive';
  credentials?: any;
  bucket?: string;
  region?: string;
}

export interface VersionControlSystem {
  type: 'git' | 'svn' | 'mercurial';
  path: string;
}

export interface AutoCommitRule {
  pattern: string; // 파일 패턴
  message: string; // 커밋 메시지 템플릿
  author?: string;
  schedule?: string; // cron 표현식
}

export class IntegrationManager {
  private autoCommitRules: AutoCommitRule[] = [];
  private syncInterval?: NodeJS.Timeout;

  // 클라우드 스토리지 동기화
  async syncWithCloud(
    localPath: string,
    remotePath: string,
    options: IntegrationOptions
  ): Promise<{ uploaded: number; downloaded: number; errors: string[] }> {
    const result = { uploaded: 0, downloaded: 0, errors: [] as string[] };

    switch (options.type) {
      case 's3':
        return this.syncWithS3(localPath, remotePath, options);
      case 'gcs':
        return this.syncWithGCS(localPath, remotePath, options);
      default:
        throw new Error(`Unsupported cloud storage type: ${options.type}`);
    }
  }

  // S3 동기화 (AWS CLI 필요)
  private async syncWithS3(
    localPath: string,
    remotePath: string,
    options: IntegrationOptions
  ): Promise<{ uploaded: number; downloaded: number; errors: string[] }> {
    const result = { uploaded: 0, downloaded: 0, errors: [] as string[] };

    try {
      // 업로드
      const uploadCmd = `aws s3 sync "${localPath}" "s3://${options.bucket}/${remotePath}" --delete`;
      const { stdout: uploadOut } = await execAsync(uploadCmd);
      
      // 파싱해서 업로드된 파일 수 계산
      const uploadMatches = uploadOut.match(/upload:/g);
      result.uploaded = uploadMatches ? uploadMatches.length : 0;

      // 다운로드
      const downloadCmd = `aws s3 sync "s3://${options.bucket}/${remotePath}" "${localPath}"`;
      const { stdout: downloadOut } = await execAsync(downloadCmd);
      
      const downloadMatches = downloadOut.match(/download:/g);
      result.downloaded = downloadMatches ? downloadMatches.length : 0;
    } catch (error: any) {
      result.errors.push(`S3 sync failed: ${error.message}`);
    }

    return result;
  }

  // Google Cloud Storage 동기화
  private async syncWithGCS(
    localPath: string,
    remotePath: string,
    options: IntegrationOptions
  ): Promise<{ uploaded: number; downloaded: number; errors: string[] }> {
    const result = { uploaded: 0, downloaded: 0, errors: [] as string[] };

    try {
      // gsutil 사용
      const uploadCmd = `gsutil -m rsync -r -d "${localPath}" "gs://${options.bucket}/${remotePath}"`;
      await execAsync(uploadCmd);
      
      // 실제 파일 수는 gsutil 출력을 파싱해야 함
      result.uploaded = 1; // 간단히 처리
    } catch (error: any) {
      result.errors.push(`GCS sync failed: ${error.message}`);
    }

    return result;
  }

  // 원격 파일 시스템 마운트
  async mountRemoteFS(
    remotePath: string,
    mountPoint: string,
    type: 'sshfs' | 'nfs' | 'smb'
  ): Promise<void> {
    await fs.mkdir(mountPoint, { recursive: true });

    let command: string;
    switch (type) {
      case 'sshfs':
        command = `sshfs ${remotePath} ${mountPoint}`;
        break;
      case 'nfs':
        command = `mount -t nfs ${remotePath} ${mountPoint}`;
        break;
      case 'smb':
        command = `mount -t smbfs ${remotePath} ${mountPoint}`;
        break;
      default:
        throw new Error(`Unsupported mount type: ${type}`);
    }

    try {
      await execAsync(command);
    } catch (error: any) {
      throw new Error(`Failed to mount remote filesystem: ${error.message}`);
    }
  }

  // 언마운트
  async unmountRemoteFS(mountPoint: string): Promise<void> {
    try {
      await execAsync(`umount ${mountPoint}`);
    } catch (error: any) {
      throw new Error(`Failed to unmount: ${error.message}`);
    }
  }

  // 다양한 VCS 지원
  async detectVCS(directory: string): Promise<VersionControlSystem | null> {
    const checks = [
      { type: 'git' as const, marker: '.git' },
      { type: 'svn' as const, marker: '.svn' },
      { type: 'mercurial' as const, marker: '.hg' }
    ];

    for (const check of checks) {
      const vcsPath = path.join(directory, check.marker);
      try {
        await fs.access(vcsPath);
        return { type: check.type, path: directory };
      } catch {
        // 계속 검색
      }
    }

    return null;
  }

  // VCS 상태 확인
  async getVCSStatus(vcs: VersionControlSystem): Promise<{
    branch: string;
    modified: string[];
    added: string[];
    deleted: string[];
  }> {
    const result = {
      branch: '',
      modified: [] as string[],
      added: [] as string[],
      deleted: [] as string[]
    };

    switch (vcs.type) {
      case 'git':
        return this.getGitStatus(vcs.path);
      case 'svn':
        return this.getSVNStatus(vcs.path);
      case 'mercurial':
        return this.getMercurialStatus(vcs.path);
      default:
        throw new Error(`Unsupported VCS: ${vcs.type}`);
    }
  }

  // Git 상태
  private async getGitStatus(repoPath: string): Promise<{
    branch: string;
    modified: string[];
    added: string[];
    deleted: string[];
  }> {
    const result = {
      branch: '',
      modified: [] as string[],
      added: [] as string[],
      deleted: [] as string[]
    };

    try {
      // 현재 브랜치
      const { stdout: branchOut } = await execAsync('git branch --show-current', { cwd: repoPath });
      result.branch = branchOut.trim();

      // 상태
      const { stdout: statusOut } = await execAsync('git status --porcelain', { cwd: repoPath });
      const lines = statusOut.split('\n').filter(line => line.trim());

      lines.forEach(line => {
        const [status, file] = line.trim().split(/\s+/, 2);
        
        if (status === 'M' || status === 'MM') result.modified.push(file);
        else if (status === 'A' || status === 'AM') result.added.push(file);
        else if (status === 'D') result.deleted.push(file);
      });
    } catch (error: any) {
      throw new Error(`Git status failed: ${error.message}`);
    }

    return result;
  }

  // SVN 상태
  private async getSVNStatus(repoPath: string): Promise<{
    branch: string;
    modified: string[];
    added: string[];
    deleted: string[];
  }> {
    const result = {
      branch: 'trunk', // SVN은 브랜치 개념이 다름
      modified: [] as string[],
      added: [] as string[],
      deleted: [] as string[]
    };

    try {
      const { stdout } = await execAsync('svn status', { cwd: repoPath });
      const lines = stdout.split('\n').filter(line => line.trim());

      lines.forEach(line => {
        const [status, ...fileParts] = line.trim().split(/\s+/);
        const file = fileParts.join(' ');
        
        if (status === 'M') result.modified.push(file);
        else if (status === 'A') result.added.push(file);
        else if (status === 'D') result.deleted.push(file);
      });
    } catch (error: any) {
      throw new Error(`SVN status failed: ${error.message}`);
    }

    return result;
  }

  // Mercurial 상태
  private async getMercurialStatus(repoPath: string): Promise<{
    branch: string;
    modified: string[];
    added: string[];
    deleted: string[];
  }> {
    const result = {
      branch: '',
      modified: [] as string[],
      added: [] as string[],
      deleted: [] as string[]
    };

    try {
      // 현재 브랜치
      const { stdout: branchOut } = await execAsync('hg branch', { cwd: repoPath });
      result.branch = branchOut.trim();

      // 상태
      const { stdout: statusOut } = await execAsync('hg status', { cwd: repoPath });
      const lines = statusOut.split('\n').filter(line => line.trim());

      lines.forEach(line => {
        const [status, file] = line.split(/\s+/, 2);
        
        if (status === 'M') result.modified.push(file);
        else if (status === 'A') result.added.push(file);
        else if (status === 'R') result.deleted.push(file);
      });
    } catch (error: any) {
      throw new Error(`Mercurial status failed: ${error.message}`);
    }

    return result;
  }

  // 자동 커밋 규칙 추가
  addAutoCommitRule(rule: AutoCommitRule): void {
    this.autoCommitRules.push(rule);
  }

  // 자동 커밋 시작
  async startAutoCommit(vcs: VersionControlSystem, intervalMs: number = 300000): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        await this.processAutoCommit(vcs);
      } catch (error) {
        console.error('Auto commit failed:', error);
      }
    }, intervalMs);
  }

  // 자동 커밋 중지
  stopAutoCommit(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  // 자동 커밋 처리
  private async processAutoCommit(vcs: VersionControlSystem): Promise<void> {
    const status = await this.getVCSStatus(vcs);
    const allFiles = [...status.modified, ...status.added, ...status.deleted];

    for (const rule of this.autoCommitRules) {
      const matchingFiles = allFiles.filter(file => {
        const pattern = new RegExp(rule.pattern);
        return pattern.test(file);
      });

      if (matchingFiles.length > 0) {
        const message = rule.message
          .replace('{files}', matchingFiles.join(', '))
          .replace('{count}', matchingFiles.length.toString())
          .replace('{date}', new Date().toISOString());

        await this.commit(vcs, message, matchingFiles, rule.author);
      }
    }
  }

  // VCS 커밋
  async commit(
    vcs: VersionControlSystem,
    message: string,
    files: string[],
    author?: string
  ): Promise<void> {
    switch (vcs.type) {
      case 'git':
        const authorFlag = author ? `--author="${author}"` : '';
        await execAsync(`git add ${files.join(' ')}`, { cwd: vcs.path });
        await execAsync(`git commit ${authorFlag} -m "${message}"`, { cwd: vcs.path });
        break;
      case 'svn':
        await execAsync(`svn commit -m "${message}" ${files.join(' ')}`, { cwd: vcs.path });
        break;
      case 'mercurial':
        const userFlag = author ? `--user "${author}"` : '';
        await execAsync(`hg commit ${userFlag} -m "${message}" ${files.join(' ')}`, { cwd: vcs.path });
        break;
    }
  }

  // 브랜치 관리
  async createBranch(vcs: VersionControlSystem, branchName: string): Promise<void> {
    switch (vcs.type) {
      case 'git':
        await execAsync(`git checkout -b ${branchName}`, { cwd: vcs.path });
        break;
      case 'svn':
        // SVN은 브랜치가 디렉토리 복사
        throw new Error('SVN branching not implemented');
      case 'mercurial':
        await execAsync(`hg branch ${branchName}`, { cwd: vcs.path });
        break;
    }
  }

  async switchBranch(vcs: VersionControlSystem, branchName: string): Promise<void> {
    switch (vcs.type) {
      case 'git':
        await execAsync(`git checkout ${branchName}`, { cwd: vcs.path });
        break;
      case 'mercurial':
        await execAsync(`hg update ${branchName}`, { cwd: vcs.path });
        break;
      default:
        throw new Error(`Branch switching not supported for ${vcs.type}`);
    }
  }

  async mergeBranch(vcs: VersionControlSystem, sourceBranch: string): Promise<void> {
    switch (vcs.type) {
      case 'git':
        await execAsync(`git merge ${sourceBranch}`, { cwd: vcs.path });
        break;
      case 'mercurial':
        await execAsync(`hg merge ${sourceBranch}`, { cwd: vcs.path });
        break;
      default:
        throw new Error(`Branch merging not supported for ${vcs.type}`);
    }
  }
}