import { promises as fs, Stats } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface FileMetadata {
  path: string;
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  isDirectory: boolean;
  isFile: boolean;
  isSymbolicLink: boolean;
  permissions: string;
  owner?: number;
  group?: number;
  hash?: string;
  mimeType?: string;
}

export interface DirectoryTree {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  children?: DirectoryTree[];
  target?: string; // for symlinks
}

export class FileUtils {
  // 파일 메타데이터 가져오기
  async getMetadata(filePath: string, includeHash: boolean = false): Promise<FileMetadata> {
    const absolutePath = path.resolve(filePath);
    const stats = await fs.lstat(absolutePath); // lstat으로 심볼릭 링크도 감지
    
    const metadata: FileMetadata = {
      path: absolutePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      isSymbolicLink: stats.isSymbolicLink(),
      permissions: this.getPermissionString(stats),
      owner: stats.uid,
      group: stats.gid
    };

    // 해시 계산 (파일인 경우만)
    if (includeHash && metadata.isFile) {
      metadata.hash = await this.calculateFileHash(absolutePath);
    }

    // MIME 타입 추정
    if (metadata.isFile) {
      metadata.mimeType = this.getMimeType(absolutePath);
    }

    return metadata;
  }

  // 권한 문자열 생성
  private getPermissionString(stats: Stats): string {
    const modes = [
      stats.isDirectory() ? 'd' : stats.isSymbolicLink() ? 'l' : '-',
      stats.mode & 0o400 ? 'r' : '-',
      stats.mode & 0o200 ? 'w' : '-',
      stats.mode & 0o100 ? 'x' : '-',
      stats.mode & 0o040 ? 'r' : '-',
      stats.mode & 0o020 ? 'w' : '-',
      stats.mode & 0o010 ? 'x' : '-',
      stats.mode & 0o004 ? 'r' : '-',
      stats.mode & 0o002 ? 'w' : '-',
      stats.mode & 0o001 ? 'x' : '-'
    ];
    return modes.join('');
  }

  // 파일 해시 계산
  private async calculateFileHash(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const stream = await fs.readFile(filePath);
    hash.update(stream);
    return hash.digest('hex');
  }

  // MIME 타입 추정
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.json': 'application/json',
      '.css': 'text/css',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // 디렉토리 트리 생성
  async createDirectoryTree(
    dirPath: string, 
    maxDepth: number = 5, 
    currentDepth: number = 0,
    followSymlinks: boolean = false
  ): Promise<DirectoryTree> {
    const absolutePath = path.resolve(dirPath);
    const stats = await fs.lstat(absolutePath);
    const name = path.basename(absolutePath);

    const tree: DirectoryTree = {
      name,
      path: absolutePath,
      type: stats.isDirectory() ? 'directory' : stats.isSymbolicLink() ? 'symlink' : 'file',
      size: stats.size
    };

    // 심볼릭 링크 처리
    if (stats.isSymbolicLink()) {
      try {
        tree.target = await fs.readlink(absolutePath);
        if (followSymlinks && currentDepth < maxDepth) {
          const targetPath = path.resolve(path.dirname(absolutePath), tree.target);
          const targetTree = await this.createDirectoryTree(targetPath, maxDepth, currentDepth + 1, followSymlinks);
          tree.children = [targetTree];
        }
      } catch (e) {
        tree.target = 'broken link';
      }
    }

    // 디렉토리 처리
    if (stats.isDirectory() && currentDepth < maxDepth) {
      const items = await fs.readdir(absolutePath);
      tree.children = [];

      for (const item of items) {
        // 숨김 파일 및 특정 디렉토리 제외
        if (item.startsWith('.') || ['node_modules', 'dist', 'build'].includes(item)) {
          continue;
        }

        const itemPath = path.join(absolutePath, item);
        try {
          const childTree = await this.createDirectoryTree(itemPath, maxDepth, currentDepth + 1, followSymlinks);
          tree.children.push(childTree);
        } catch (e) {
          // 권한 문제 등으로 읽을 수 없는 항목 스킵
          console.error(`Skipping ${itemPath}: ${e}`);
        }
      }

      // 크기 계산 (하위 항목들의 크기 합)
      tree.size = tree.children.reduce((sum, child) => sum + child.size, 0);
    }

    return tree;
  }

  // 두 파일 비교
  async compareFiles(file1: string, file2: string): Promise<{
    identical: boolean;
    size1: number;
    size2: number;
    hash1?: string;
    hash2?: string;
    diff?: string;
  }> {
    const [meta1, meta2] = await Promise.all([
      this.getMetadata(file1, true),
      this.getMetadata(file2, true)
    ]);

    const result = {
      identical: false,
      size1: meta1.size,
      size2: meta2.size,
      hash1: meta1.hash,
      hash2: meta2.hash
    };

    if (meta1.hash === meta2.hash) {
      result.identical = true;
    }

    return result;
  }

  // 심볼릭 링크 생성
  async createSymlink(target: string, linkPath: string): Promise<void> {
    const absoluteTarget = path.resolve(target);
    const absoluteLinkPath = path.resolve(linkPath);
    
    // 링크 디렉토리 생성
    await fs.mkdir(path.dirname(absoluteLinkPath), { recursive: true });
    
    // 상대 경로 계산
    const relativePath = path.relative(path.dirname(absoluteLinkPath), absoluteTarget);
    
    // 심볼릭 링크 생성
    await fs.symlink(relativePath, absoluteLinkPath);
  }

  // 파일 권한 변경
  async changePermissions(filePath: string, mode: string | number): Promise<void> {
    const absolutePath = path.resolve(filePath);
    const numericMode = typeof mode === 'string' ? parseInt(mode, 8) : mode;
    await fs.chmod(absolutePath, numericMode);
  }

  // 안전한 파일 이동 (원자적 연산)
  async moveFile(source: string, destination: string): Promise<void> {
    const absoluteSource = path.resolve(source);
    const absoluteDestination = path.resolve(destination);
    
    // 대상 디렉토리 생성
    await fs.mkdir(path.dirname(absoluteDestination), { recursive: true });
    
    try {
      // 먼저 rename 시도 (같은 파일시스템이면 원자적)
      await fs.rename(absoluteSource, absoluteDestination);
    } catch (error) {
      // 다른 파일시스템이면 복사 후 삭제
      await fs.copyFile(absoluteSource, absoluteDestination);
      await fs.unlink(absoluteSource);
    }
  }

  // 디렉토리 크기 계산
  async getDirectorySize(dirPath: string): Promise<number> {
    const tree = await this.createDirectoryTree(dirPath);
    return tree.size;
  }

  // 중복 파일 찾기
  async findDuplicates(directory: string): Promise<Map<string, string[]>> {
    const fileHashes = new Map<string, string[]>();
    
    const processFile = async (filePath: string) => {
      try {
        const stats = await fs.lstat(filePath);
        if (stats.isFile()) {
          const hash = await this.calculateFileHash(filePath);
          if (!fileHashes.has(hash)) {
            fileHashes.set(hash, []);
          }
          fileHashes.get(hash)!.push(filePath);
        }
      } catch (e) {
        // 스킵
      }
    };

    const walk = async (dir: string) => {
      const items = await fs.readdir(dir);
      for (const item of items) {
        if (item.startsWith('.') || ['node_modules', 'dist', 'build'].includes(item)) {
          continue;
        }
        
        const itemPath = path.join(dir, item);
        const stats = await fs.lstat(itemPath);
        
        if (stats.isDirectory()) {
          await walk(itemPath);
        } else if (stats.isFile()) {
          await processFile(itemPath);
        }
      }
    };

    await walk(directory);

    // 중복만 반환
    const duplicates = new Map<string, string[]>();
    for (const [hash, files] of fileHashes) {
      if (files.length > 1) {
        duplicates.set(hash, files);
      }
    }

    return duplicates;
  }
}
