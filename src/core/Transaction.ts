import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

interface FileOperation {
  type: 'write' | 'update' | 'remove';
  path: string;
  content?: string;
  updates?: Array<{ oldText: string; newText: string }>;
}

interface TransactionResult {
  success: boolean;
  operations: number;
  rollbackPath?: string;
  error?: string;
}

export class Transaction {
  private operations: FileOperation[] = [];
  private backups: Map<string, string> = new Map();
  private tempDir: string;
  private committed = false;

  constructor() {
    // 시스템 임시 디렉토리 사용 (권한 문제 방지)
    this.tempDir = path.join(os.tmpdir(), '.ai-fs-transactions', Date.now().toString());
  }

  // 파일 쓰기 작업 추가
  write(filePath: string, content: string): Transaction {
    this.operations.push({
      type: 'write',
      path: filePath,
      content
    });
    return this;
  }

  // 파일 업데이트 작업 추가
  update(filePath: string, updates: Array<{ oldText: string; newText: string }>): Transaction {
    this.operations.push({
      type: 'update',
      path: filePath,
      updates
    });
    return this;
  }

  // 파일 삭제 작업 추가
  remove(filePath: string): Transaction {
    this.operations.push({
      type: 'remove',
      path: filePath
    });
    return this;
  }

  // 트랜잭션 커밋
  async commit(): Promise<TransactionResult> {
    if (this.committed) {
      throw new Error('Transaction already committed');
    }

    try {
      // 백업 디렉토리 생성
      await fs.mkdir(this.tempDir, { recursive: true });

      // 모든 파일 백업
      await this.createBackups();

      // 모든 작업 실행
      for (const operation of this.operations) {
        await this.executeOperation(operation);
      }

      this.committed = true;

      // 백업 정리 (성공 시)
      await this.cleanupBackups();

      return {
        success: true,
        operations: this.operations.length
      };
    } catch (error) {
      // 롤백
      await this.rollback();
      
      return {
        success: false,
        operations: this.operations.length,
        rollbackPath: this.tempDir,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // 백업 생성
  private async createBackups(): Promise<void> {
    const filesToBackup = new Set<string>();

    // 영향받는 모든 파일 수집
    for (const op of this.operations) {
      const absolutePath = path.resolve(op.path);
      filesToBackup.add(absolutePath);
    }

    // 각 파일 백업
    for (const filePath of filesToBackup) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const backupPath = path.join(this.tempDir, path.basename(filePath) + '.backup');
        await fs.writeFile(backupPath, content);
        this.backups.set(filePath, backupPath);
      } catch (error) {
        // 파일이 없으면 백업할 필요 없음
        if ((error as any).code !== 'ENOENT') {
          throw error;
        }
      }
    }
  }

  // 작업 실행
  private async executeOperation(operation: FileOperation): Promise<void> {
    const absolutePath = path.resolve(operation.path);

    switch (operation.type) {
      case 'write':
        if (!operation.content) throw new Error('Content required for write operation');
        
        // 디렉토리 생성
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, operation.content, 'utf-8');
        break;

      case 'update':
        if (!operation.updates) throw new Error('Updates required for update operation');
        
        let content = await fs.readFile(absolutePath, 'utf-8');
        for (const update of operation.updates) {
          const newContent = content.replace(update.oldText, update.newText);
          if (newContent === content) {
            throw new Error(`Could not find text to replace: "${update.oldText}" in ${operation.path}`);
          }
          content = newContent;
        }
        await fs.writeFile(absolutePath, content, 'utf-8');
        break;

      case 'remove':
        await fs.unlink(absolutePath);
        break;
    }
  }

  // 롤백
  private async rollback(): Promise<void> {
    for (const [originalPath, backupPath] of this.backups) {
      try {
        const backupContent = await fs.readFile(backupPath, 'utf-8');
        await fs.writeFile(originalPath, backupContent, 'utf-8');
      } catch (error) {
        console.error(`Failed to rollback ${originalPath}:`, error);
      }
    }
  }

  // 백업 정리
  private async cleanupBackups(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup backups:', error);
    }
  }
}
