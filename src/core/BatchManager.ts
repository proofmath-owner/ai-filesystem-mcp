import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface BatchOperation {
  id: string;
  type: 'rename' | 'move' | 'copy' | 'delete' | 'chmod' | 'transform';
  files: Array<{
    from?: string;
    to?: string;
    pattern?: string;
    replacement?: string;
    permissions?: string;
  }>;
  options?: {
    overwrite?: boolean;
    createDirectories?: boolean;
    dryRun?: boolean;
    parallel?: boolean;
    maxConcurrent?: number;
  };
}

export interface BatchResult {
  success: boolean;
  processed: number;
  failed: number;
  skipped: number;
  results: Array<{
    file: string;
    success: boolean;
    error?: string;
    newPath?: string;
  }>;
  duration: number;
}

export interface TransformFunction {
  (content: string, filePath: string): string | Promise<string>;
}

export class BatchManager {
  private operations = new Map<string, BatchOperation>();
  private results = new Map<string, BatchResult>();

  // 배치 작업 실행
  async executeBatch(operations: BatchOperation[]): Promise<BatchResult> {
    const startTime = Date.now();
    const overallResult: BatchResult = {
      success: true,
      processed: 0,
      failed: 0,
      skipped: 0,
      results: [],
      duration: 0
    };

    for (const operation of operations) {
      const opResult = await this.executeOperation(operation);
      
      overallResult.processed += opResult.processed;
      overallResult.failed += opResult.failed;
      overallResult.skipped += opResult.skipped;
      overallResult.results.push(...opResult.results);
      
      if (!opResult.success) {
        overallResult.success = false;
      }
    }

    overallResult.duration = Date.now() - startTime;
    return overallResult;
  }

  // 개별 작업 실행
  private async executeOperation(operation: BatchOperation): Promise<BatchResult> {
    const result: BatchResult = {
      success: true,
      processed: 0,
      failed: 0,
      skipped: 0,
      results: [],
      duration: 0
    };

    const startTime = Date.now();

    try {
      switch (operation.type) {
        case 'rename':
          await this.executeBatchRename(operation, result);
          break;
        case 'move':
          await this.executeBatchMove(operation, result);
          break;
        case 'copy':
          await this.executeBatchCopy(operation, result);
          break;
        case 'delete':
          await this.executeBatchDelete(operation, result);
          break;
        case 'chmod':
          await this.executeBatchChmod(operation, result);
          break;
        case 'transform':
          await this.executeBatchTransform(operation, result);
          break;
      }
    } catch (error: any) {
      result.success = false;
      result.results.push({
        file: 'batch operation',
        success: false,
        error: error.message
      });
    }

    result.duration = Date.now() - startTime;
    this.results.set(operation.id, result);

    return result;
  }

  // 일괄 이름 변경
  private async executeBatchRename(operation: BatchOperation, result: BatchResult): Promise<void> {
    const tasks = operation.files.map(async (file) => {
      if (!file.from || !file.pattern || !file.replacement) {
        result.skipped++;
        result.results.push({
          file: file.from || 'unknown',
          success: false,
          error: 'Missing required fields'
        });
        return;
      }

      try {
        const dir = path.dirname(file.from);
        const basename = path.basename(file.from);
        const newName = basename.replace(new RegExp(file.pattern), file.replacement);
        const newPath = path.join(dir, newName);

        if (operation.options?.dryRun) {
          result.results.push({
            file: file.from,
            success: true,
            newPath: newPath
          });
          result.processed++;
          return;
        }

        await fs.rename(file.from, newPath);
        result.processed++;
        result.results.push({
          file: file.from,
          success: true,
          newPath: newPath
        });
      } catch (error: any) {
        result.failed++;
        result.results.push({
          file: file.from,
          success: false,
          error: error.message
        });
      }
    });

    if (operation.options?.parallel) {
      await Promise.all(tasks);
    } else {
      for (const task of tasks) {
        await task;
      }
    }
  }

  // 일괄 이동
  private async executeBatchMove(operation: BatchOperation, result: BatchResult): Promise<void> {
    const tasks = operation.files.map(async (file) => {
      if (!file.from || !file.to) {
        result.skipped++;
        return;
      }

      try {
        if (operation.options?.createDirectories) {
          await fs.mkdir(path.dirname(file.to), { recursive: true });
        }

        if (operation.options?.dryRun) {
          result.processed++;
          result.results.push({
            file: file.from,
            success: true,
            newPath: file.to
          });
          return;
        }

        await fs.rename(file.from, file.to);
        result.processed++;
        result.results.push({
          file: file.from,
          success: true,
          newPath: file.to
        });
      } catch (error: any) {
        result.failed++;
        result.results.push({
          file: file.from,
          success: false,
          error: error.message
        });
      }
    });

    await this.executeWithConcurrency(tasks, operation.options?.maxConcurrent || 5);
  }

  // 일괄 복사
  private async executeBatchCopy(operation: BatchOperation, result: BatchResult): Promise<void> {
    const tasks = operation.files.map(async (file) => {
      if (!file.from || !file.to) {
        result.skipped++;
        return;
      }

      try {
        if (operation.options?.createDirectories) {
          await fs.mkdir(path.dirname(file.to), { recursive: true });
        }

        // 파일 존재 확인
        if (!operation.options?.overwrite) {
          try {
            await fs.access(file.to);
            result.skipped++;
            result.results.push({
              file: file.from,
              success: false,
              error: 'File already exists'
            });
            return;
          } catch {
            // 파일이 없으면 계속 진행
          }
        }

        if (operation.options?.dryRun) {
          result.processed++;
          result.results.push({
            file: file.from,
            success: true,
            newPath: file.to
          });
          return;
        }

        await fs.copyFile(file.from, file.to);
        result.processed++;
        result.results.push({
          file: file.from,
          success: true,
          newPath: file.to
        });
      } catch (error: any) {
        result.failed++;
        result.results.push({
          file: file.from,
          success: false,
          error: error.message
        });
      }
    });

    await this.executeWithConcurrency(tasks, operation.options?.maxConcurrent || 5);
  }

  // 일괄 삭제
  private async executeBatchDelete(operation: BatchOperation, result: BatchResult): Promise<void> {
    const tasks = operation.files.map(async (file) => {
      if (!file.from && !file.pattern) {
        result.skipped++;
        return;
      }

      try {
        const filesToDelete: string[] = [];

        if (file.pattern) {
          // 패턴 매칭
          const { glob } = await import('glob');
          const matches = await glob(file.pattern, {
            absolute: true
          });
          filesToDelete.push(...matches);
        } else if (file.from) {
          filesToDelete.push(file.from);
        }

        for (const fileToDelete of filesToDelete) {
          if (operation.options?.dryRun) {
            result.processed++;
            result.results.push({
              file: fileToDelete,
              success: true
            });
            continue;
          }

          try {
            const stats = await fs.stat(fileToDelete);
            if (stats.isDirectory()) {
              await fs.rmdir(fileToDelete, { recursive: true });
            } else {
              await fs.unlink(fileToDelete);
            }
            result.processed++;
            result.results.push({
              file: fileToDelete,
              success: true
            });
          } catch (error: any) {
            result.failed++;
            result.results.push({
              file: fileToDelete,
              success: false,
              error: error.message
            });
          }
        }
      } catch (error: any) {
        result.failed++;
        result.results.push({
          file: file.from || file.pattern || 'unknown',
          success: false,
          error: error.message
        });
      }
    });

    await this.executeWithConcurrency(tasks, operation.options?.maxConcurrent || 3);
  }

  // 일괄 권한 변경
  private async executeBatchChmod(operation: BatchOperation, result: BatchResult): Promise<void> {
    const tasks = operation.files.map(async (file) => {
      if (!file.from || !file.permissions) {
        result.skipped++;
        return;
      }

      try {
        if (operation.options?.dryRun) {
          result.processed++;
          result.results.push({
            file: file.from,
            success: true
          });
          return;
        }

        const mode = parseInt(file.permissions, 8);
        await fs.chmod(file.from, mode);
        result.processed++;
        result.results.push({
          file: file.from,
          success: true
        });
      } catch (error: any) {
        result.failed++;
        result.results.push({
          file: file.from,
          success: false,
          error: error.message
        });
      }
    });

    await this.executeWithConcurrency(tasks, operation.options?.maxConcurrent || 10);
  }

  // 일괄 변환
  private async executeBatchTransform(operation: BatchOperation, result: BatchResult): Promise<void> {
    // transform은 별도의 함수를 전달받아야 하므로 여기서는 기본 구현만
    result.results.push({
      file: 'transform',
      success: false,
      error: 'Transform function not provided'
    });
  }

  // 동시 실행 제어
  private async executeWithConcurrency(tasks: Promise<void>[], maxConcurrent: number): Promise<void> {
    const executing: Promise<void>[] = [];
    
    for (const task of tasks) {
      const promise = task.then(() => {
        executing.splice(executing.indexOf(promise), 1);
      });
      executing.push(promise);

      if (executing.length >= maxConcurrent) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
  }

  // 배치 작업 생성 헬퍼
  createBatchOperation(
    type: BatchOperation['type'],
    files: BatchOperation['files'],
    options?: BatchOperation['options']
  ): BatchOperation {
    return {
      id: this.generateId(),
      type,
      files,
      options
    };
  }

  // 파일 패턴 기반 배치 작업 생성
  async createPatternBatch(
    pattern: string,
    operation: 'delete' | 'move' | 'copy',
    options?: {
      destination?: string;
      transform?: (filename: string) => string;
    }
  ): Promise<BatchOperation> {
    const { glob } = await import('glob');
    const matches = await glob(pattern, { absolute: true });
    
    const files: BatchOperation['files'] = matches.map(file => {
      switch (operation) {
        case 'delete':
          return { from: file };
        case 'move':
        case 'copy':
          if (!options?.destination) {
            throw new Error('Destination required for move/copy operations');
          }
          const basename = path.basename(file);
          const newName = options.transform ? options.transform(basename) : basename;
          return {
            from: file,
            to: path.join(options.destination, newName)
          };
      }
    });

    return this.createBatchOperation(operation, files);
  }

  // 배치 작업 검증
  async validateBatch(operation: BatchOperation): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 파일 존재 확인
    for (const file of operation.files) {
      if (file.from) {
        try {
          await fs.access(file.from);
        } catch {
          errors.push(`File not found: ${file.from}`);
        }
      }

      // 대상 파일 중복 확인
      if (file.to && (operation.type === 'move' || operation.type === 'copy')) {
        try {
          await fs.access(file.to);
          if (!operation.options?.overwrite) {
            warnings.push(`Target exists: ${file.to}`);
          }
        } catch {
          // 파일이 없으면 OK
        }
      }
    }

    // 권한 확인
    if (operation.type === 'chmod') {
      for (const file of operation.files) {
        if (file.permissions && !/^[0-7]{3,4}$/.test(file.permissions)) {
          errors.push(`Invalid permission format: ${file.permissions}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // 배치 작업 진행 상황 스트림
  async *executeBatchWithProgress(operation: BatchOperation): AsyncGenerator<{
    current: number;
    total: number;
    currentFile: string;
    status: 'processing' | 'success' | 'failed' | 'skipped';
  }> {
    const total = operation.files.length;
    let current = 0;

    for (const file of operation.files) {
      current++;
      const currentFile = file.from || file.pattern || 'unknown';
      
      yield {
        current,
        total,
        currentFile,
        status: 'processing'
      };

      try {
        // 실제 작업 수행 (간단한 예시)
        await this.executeSingleOperation(operation.type, file, operation.options);
        
        yield {
          current,
          total,
          currentFile,
          status: 'success'
        };
      } catch (error) {
        yield {
          current,
          total,
          currentFile,
          status: 'failed'
        };
      }
    }
  }

  // 단일 작업 실행
  private async executeSingleOperation(
    type: BatchOperation['type'],
    file: BatchOperation['files'][0],
    options?: BatchOperation['options']
  ): Promise<void> {
    switch (type) {
      case 'delete':
        if (file.from) {
          await fs.unlink(file.from);
        }
        break;
      case 'move':
        if (file.from && file.to) {
          await fs.rename(file.from, file.to);
        }
        break;
      case 'copy':
        if (file.from && file.to) {
          await fs.copyFile(file.from, file.to);
        }
        break;
      case 'chmod':
        if (file.from && file.permissions) {
          await fs.chmod(file.from, parseInt(file.permissions, 8));
        }
        break;
    }
  }

  // ID 생성
  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // 결과 조회
  getResult(operationId: string): BatchResult | undefined {
    return this.results.get(operationId);
  }

  // 전체 결과 요약
  getSummary(): {
    totalOperations: number;
    totalProcessed: number;
    totalFailed: number;
    averageDuration: number;
  } {
    let totalProcessed = 0;
    let totalFailed = 0;
    let totalDuration = 0;

    for (const result of this.results.values()) {
      totalProcessed += result.processed;
      totalFailed += result.failed;
      totalDuration += result.duration;
    }

    return {
      totalOperations: this.results.size,
      totalProcessed,
      totalFailed,
      averageDuration: this.results.size > 0 ? totalDuration / this.results.size : 0
    };
  }
}