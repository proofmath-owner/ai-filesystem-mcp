import { promises as fs } from 'fs';
import * as path from 'path';

export interface ErrorContext {
  operation: string;
  path?: string;
  error: Error | any;
  timestamp: Date;
}

export interface ErrorSuggestion {
  type: 'alternative' | 'fix' | 'info';
  message: string;
  action?: string;
}

export interface ErrorRecovery {
  canRecover: boolean;
  suggestions: ErrorSuggestion[];
  similarPaths?: string[];
  requiredPermissions?: string[];
}

export class ErrorHandlingManager {
  private errorHistory: ErrorContext[] = [];
  private maxHistorySize = 100;

  // 에러 분석 및 복구 제안
  async analyzeError(context: ErrorContext): Promise<ErrorRecovery> {
    this.addToHistory(context);

    const error = context.error;
    const errorCode = error.code || error.name;
    const errorMessage = error.message || String(error);

    switch (errorCode) {
      case 'ENOENT':
        return this.handleFileNotFound(context);
      case 'EACCES':
      case 'EPERM':
        return this.handlePermissionError(context);
      case 'ENOSPC':
        return this.handleNoSpaceError(context);
      case 'EISDIR':
        return this.handleIsDirectoryError(context);
      case 'ENOTDIR':
        return this.handleNotDirectoryError(context);
      case 'EEXIST':
        return this.handleFileExistsError(context);
      case 'EMFILE':
      case 'ENFILE':
        return this.handleTooManyFilesError(context);
      default:
        return this.handleGenericError(context);
    }
  }

  // 파일을 찾을 수 없음
  private async handleFileNotFound(context: ErrorContext): Promise<ErrorRecovery> {
    const suggestions: ErrorSuggestion[] = [];
    const similarPaths: string[] = [];

    if (context.path) {
      // 유사한 파일 찾기
      const dir = path.dirname(context.path);
      const basename = path.basename(context.path);
      
      try {
        const files = await fs.readdir(dir);
        const similar = this.findSimilarNames(basename, files);
        
        if (similar.length > 0) {
          similarPaths.push(...similar.map(f => path.join(dir, f)));
          suggestions.push({
            type: 'alternative',
            message: `Did you mean one of these files?`,
            action: `Try using: ${similarPaths[0]}`
          });
        }
      } catch {
        // 디렉토리도 없는 경우
        suggestions.push({
          type: 'info',
          message: `The directory '${dir}' does not exist`,
          action: `Create the directory first: mkdir -p "${dir}"`
        });
      }

      // 경로 분석
      if (context.path.includes(' ')) {
        suggestions.push({
          type: 'fix',
          message: 'Path contains spaces',
          action: 'Make sure to properly escape spaces or use quotes'
        });
      }

      if (context.path.startsWith('~')) {
        suggestions.push({
          type: 'fix',
          message: 'Path starts with ~',
          action: `Use absolute path: ${context.path.replace('~', process.env.HOME || '/home/user')}`
        });
      }
    }

    return {
      canRecover: true,
      suggestions,
      similarPaths
    };
  }

  // 권한 오류
  private async handlePermissionError(context: ErrorContext): Promise<ErrorRecovery> {
    const suggestions: ErrorSuggestion[] = [];
    const requiredPermissions: string[] = [];

    if (context.path) {
      try {
        const stats = await fs.stat(context.path);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);
        
        suggestions.push({
          type: 'info',
          message: `Current permissions: ${mode}`,
          action: `To fix: chmod 644 "${context.path}" (for files) or chmod 755 "${context.path}" (for directories)`
        });

        requiredPermissions.push(mode);
      } catch {
        // 파일 자체에 접근 불가
      }

      // 작업별 제안
      if (context.operation === 'write' || context.operation === 'delete') {
        suggestions.push({
          type: 'fix',
          message: 'Write permission required',
          action: `Run with elevated permissions or change file ownership`
        });
      } else if (context.operation === 'read') {
        suggestions.push({
          type: 'fix',
          message: 'Read permission required',
          action: `Grant read permission: chmod +r "${context.path}"`
        });
      }

      // 시스템 파일 경고
      if (this.isSystemPath(context.path)) {
        suggestions.push({
          type: 'info',
          message: '⚠️ This is a system file/directory',
          action: 'Modifying system files can be dangerous. Make sure you know what you\'re doing.'
        });
      }
    }

    return {
      canRecover: false,
      suggestions,
      requiredPermissions
    };
  }

  // 디스크 공간 부족
  private async handleNoSpaceError(context: ErrorContext): Promise<ErrorRecovery> {
    const suggestions: ErrorSuggestion[] = [];

    suggestions.push({
      type: 'info',
      message: 'No space left on device',
      action: 'Check disk usage with: df -h'
    });

    suggestions.push({
      type: 'fix',
      message: 'Free up disk space',
      action: 'Delete unnecessary files or move to another disk'
    });

    // 임시 파일 정리 제안
    suggestions.push({
      type: 'fix',
      message: 'Clean temporary files',
      action: 'Clear temp directory: rm -rf /tmp/* (be careful!)'
    });

    return {
      canRecover: false,
      suggestions
    };
  }

  // 디렉토리인데 파일로 접근
  private async handleIsDirectoryError(context: ErrorContext): Promise<ErrorRecovery> {
    const suggestions: ErrorSuggestion[] = [];

    suggestions.push({
      type: 'info',
      message: 'Target is a directory, not a file',
      action: 'Use directory operations instead'
    });

    if (context.operation === 'read') {
      suggestions.push({
        type: 'fix',
        message: 'To read directory contents',
        action: `Use readdir instead of readFile`
      });
    }

    return {
      canRecover: true,
      suggestions
    };
  }

  // 파일인데 디렉토리로 접근
  private async handleNotDirectoryError(context: ErrorContext): Promise<ErrorRecovery> {
    const suggestions: ErrorSuggestion[] = [];

    suggestions.push({
      type: 'info',
      message: 'Target is a file, not a directory',
      action: 'Use file operations instead'
    });

    return {
      canRecover: true,
      suggestions
    };
  }

  // 파일이 이미 존재
  private async handleFileExistsError(context: ErrorContext): Promise<ErrorRecovery> {
    const suggestions: ErrorSuggestion[] = [];

    suggestions.push({
      type: 'alternative',
      message: 'File already exists',
      action: 'Use a different name or overwrite with appropriate flags'
    });

    if (context.path) {
      const dir = path.dirname(context.path);
      const ext = path.extname(context.path);
      const base = path.basename(context.path, ext);
      
      suggestions.push({
        type: 'alternative',
        message: 'Suggested alternative names:',
        action: `${base}_${Date.now()}${ext} or ${base}_copy${ext}`
      });
    }

    return {
      canRecover: true,
      suggestions
    };
  }

  // 열린 파일이 너무 많음
  private async handleTooManyFilesError(context: ErrorContext): Promise<ErrorRecovery> {
    const suggestions: ErrorSuggestion[] = [];

    suggestions.push({
      type: 'info',
      message: 'Too many open files',
      action: 'Close some files or increase the file descriptor limit'
    });

    suggestions.push({
      type: 'fix',
      message: 'Increase file limit',
      action: 'Run: ulimit -n 4096 (temporary) or edit /etc/security/limits.conf (permanent)'
    });

    return {
      canRecover: false,
      suggestions
    };
  }

  // 일반 오류
  private async handleGenericError(context: ErrorContext): Promise<ErrorRecovery> {
    const suggestions: ErrorSuggestion[] = [];

    suggestions.push({
      type: 'info',
      message: `Error: ${context.error.message || context.error}`,
      action: 'Check the error details and try again'
    });

    // 네트워크 관련 오류
    if (context.error.message && context.error.message.includes('ENETUNREACH')) {
      suggestions.push({
        type: 'fix',
        message: 'Network unreachable',
        action: 'Check your internet connection'
      });
    }

    // 타임아웃 오류
    if (context.error.message && context.error.message.includes('timeout')) {
      suggestions.push({
        type: 'fix',
        message: 'Operation timed out',
        action: 'Try again or increase timeout limit'
      });
    }

    return {
      canRecover: false,
      suggestions
    };
  }

  // 유사한 이름 찾기 (레벤슈타인 거리)
  private findSimilarNames(target: string, candidates: string[]): string[] {
    const threshold = 3; // 최대 편집 거리
    const similar: Array<{ name: string; distance: number }> = [];

    for (const candidate of candidates) {
      const distance = this.levenshteinDistance(target.toLowerCase(), candidate.toLowerCase());
      if (distance <= threshold) {
        similar.push({ name: candidate, distance });
      }
    }

    // 거리순 정렬
    return similar
      .sort((a, b) => a.distance - b.distance)
      .map(s => s.name)
      .slice(0, 5);
  }

  // 레벤슈타인 거리 계산
  private levenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // 삭제
          matrix[i][j - 1] + 1,     // 삽입
          matrix[i - 1][j - 1] + cost // 대체
        );
      }
    }

    return matrix[len1][len2];
  }

  // 시스템 경로 확인
  private isSystemPath(filePath: string): boolean {
    const systemPaths = [
      '/etc', '/sys', '/proc', '/dev', '/boot',
      '/usr/bin', '/usr/sbin', '/bin', '/sbin',
      'C:\\Windows', 'C:\\Program Files',
      '/System', '/Library', '/Applications'
    ];

    const normalizedPath = path.resolve(filePath);
    return systemPaths.some(sp => normalizedPath.startsWith(sp));
  }

  // 에러 히스토리에 추가
  private addToHistory(context: ErrorContext): void {
    this.errorHistory.push(context);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  // 에러 패턴 분석
  getErrorPatterns(): {
    mostCommonErrors: Array<{ type: string; count: number }>;
    errorsByPath: Map<string, number>;
    recentErrors: ErrorContext[];
  } {
    const errorTypes = new Map<string, number>();
    const errorsByPath = new Map<string, number>();

    this.errorHistory.forEach(ctx => {
      const type = ctx.error.code || ctx.error.name || 'unknown';
      errorTypes.set(type, (errorTypes.get(type) || 0) + 1);

      if (ctx.path) {
        errorsByPath.set(ctx.path, (errorsByPath.get(ctx.path) || 0) + 1);
      }
    });

    const mostCommonErrors = Array.from(errorTypes.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      mostCommonErrors,
      errorsByPath,
      recentErrors: this.errorHistory.slice(-10)
    };
  }

  // 에러 복구 시도
  async attemptRecovery(context: ErrorContext, recovery: ErrorRecovery): Promise<boolean> {
    if (!recovery.canRecover) {
      return false;
    }

    // 자동 복구 가능한 경우 처리
    const autoFixSuggestion = recovery.suggestions.find(s => s.type === 'fix' && s.action);
    if (autoFixSuggestion) {
      // 실제 구현에서는 안전한 자동 복구 로직 추가
      console.log(`Suggested fix: ${autoFixSuggestion.action}`);
    }

    return true;
  }
}