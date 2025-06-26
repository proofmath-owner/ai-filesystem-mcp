import { promises as fs } from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface FileOperation {
  id: string;
  type: 'read' | 'write' | 'delete' | 'move' | 'copy' | 'chmod';
  path: string;
  timestamp: Date;
  user?: string;
  success: boolean;
  error?: string;
  metadata?: {
    size?: number;
    permissions?: string;
    duration?: number;
  };
}

export interface PerformanceMetrics {
  operationType: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  count: number;
  totalBytes?: number;
}

export interface SystemStats {
  diskUsage: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  ioStats: {
    readOps: number;
    writeOps: number;
    readBytes: number;
    writeBytes: number;
  };
}

export class MonitoringManager extends EventEmitter {
  private operationLog: FileOperation[] = [];
  private performanceData = new Map<string, number[]>();
  private maxLogSize = 10000;
  private logFile?: string;
  private isMonitoring = false;
  private metricsInterval?: NodeJS.Timeout;

  constructor(options: { logFile?: string; maxLogSize?: number } = {}) {
    super();
    this.logFile = options.logFile;
    this.maxLogSize = options.maxLogSize || 10000;
  }

  // 작업 로깅
  async logOperation(operation: Omit<FileOperation, 'id' | 'timestamp'>): Promise<void> {
    const fullOperation: FileOperation = {
      ...operation,
      id: this.generateId(),
      timestamp: new Date()
    };

    this.operationLog.push(fullOperation);

    // 최대 크기 유지
    if (this.operationLog.length > this.maxLogSize) {
      this.operationLog.shift();
    }

    // 성능 데이터 기록
    if (operation.metadata?.duration !== undefined) {
      const key = `${operation.type}_${operation.success ? 'success' : 'fail'}`;
      if (!this.performanceData.has(key)) {
        this.performanceData.set(key, []);
      }
      this.performanceData.get(key)!.push(operation.metadata.duration);
    }

    // 파일에 로그 저장
    if (this.logFile) {
      await this.appendToLogFile(fullOperation);
    }

    // 이벤트 발생
    this.emit('operation', fullOperation);

    // 오류 발생시 특별 이벤트
    if (!operation.success) {
      this.emit('error', fullOperation);
    }
  }

  // 로그 파일에 추가
  private async appendToLogFile(operation: FileOperation): Promise<void> {
    if (!this.logFile) return;

    const logEntry = JSON.stringify(operation) + '\n';
    try {
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  // 작업 이력 조회
  getOperationHistory(filters?: {
    type?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    path?: string;
  }): FileOperation[] {
    let results = [...this.operationLog];

    if (filters) {
      if (filters.type) {
        results = results.filter(op => op.type === filters.type);
      }
      if (filters.startDate) {
        results = results.filter(op => op.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        results = results.filter(op => op.timestamp <= filters.endDate!);
      }
      if (filters.success !== undefined) {
        results = results.filter(op => op.success === filters.success);
      }
      if (filters.path) {
        results = results.filter(op => op.path.includes(filters.path!));
      }
    }

    return results;
  }

  // 성능 메트릭스 계산
  getPerformanceMetrics(): PerformanceMetrics[] {
    const metrics: PerformanceMetrics[] = [];

    for (const [key, durations] of this.performanceData) {
      if (durations.length === 0) continue;

      const sorted = [...durations].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);

      metrics.push({
        operationType: key,
        averageTime: sum / sorted.length,
        minTime: sorted[0],
        maxTime: sorted[sorted.length - 1],
        count: sorted.length
      });
    }

    return metrics;
  }

  // 시스템 통계 (Unix/Linux용)
  async getSystemStats(): Promise<SystemStats | null> {
    if (process.platform === 'win32') {
      return null; // Windows는 다른 방법 필요
    }

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // 디스크 사용량
      const { stdout: dfOut } = await execAsync('df -B1 /');
      const dfLines = dfOut.split('\n').filter(line => line.trim());
      const dfParts = dfLines[1].split(/\s+/);
      
      const diskUsage = {
        total: parseInt(dfParts[1]),
        used: parseInt(dfParts[2]),
        available: parseInt(dfParts[3]),
        percentage: parseInt(dfParts[4])
      };

      // I/O 통계 (간단한 버전)
      const ioStats = {
        readOps: this.operationLog.filter(op => op.type === 'read').length,
        writeOps: this.operationLog.filter(op => op.type === 'write').length,
        readBytes: this.operationLog
          .filter(op => op.type === 'read' && op.metadata?.size)
          .reduce((sum, op) => sum + (op.metadata?.size || 0), 0),
        writeBytes: this.operationLog
          .filter(op => op.type === 'write' && op.metadata?.size)
          .reduce((sum, op) => sum + (op.metadata?.size || 0), 0)
      };

      return { diskUsage, ioStats };
    } catch (error) {
      return null;
    }
  }

  // 실시간 모니터링 시작
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.metricsInterval = setInterval(async () => {
      const stats = await this.getSystemStats();
      const metrics = this.getPerformanceMetrics();

      this.emit('metrics', {
        timestamp: new Date(),
        system: stats,
        performance: metrics
      });
    }, intervalMs);
  }

  // 모니터링 중지
  stopMonitoring(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
    this.isMonitoring = false;
  }

  // 오류 분석
  getErrorAnalysis(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    commonErrors: Array<{ error: string; count: number }>;
    errorRate: number;
  } {
    const errors = this.operationLog.filter(op => !op.success);
    const errorsByType: Record<string, number> = {};
    const errorMessages: Record<string, number> = {};

    errors.forEach(error => {
      // 타입별 집계
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;

      // 에러 메시지별 집계
      if (error.error) {
        errorMessages[error.error] = (errorMessages[error.error] || 0) + 1;
      }
    });

    // 일반적인 에러 정렬
    const commonErrors = Object.entries(errorMessages)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const errorRate = this.operationLog.length > 0
      ? errors.length / this.operationLog.length
      : 0;

    return {
      totalErrors: errors.length,
      errorsByType,
      commonErrors,
      errorRate
    };
  }

  // 실행 시간 분석
  getExecutionTimeAnalysis(): {
    slowestOperations: Array<FileOperation & { duration: number }>;
    averageByType: Record<string, number>;
  } {
    const operationsWithDuration = this.operationLog
      .filter(op => op.metadata?.duration !== undefined)
      .map(op => ({ ...op, duration: op.metadata!.duration! }));

    // 가장 느린 작업들
    const slowestOperations = [...operationsWithDuration]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // 타입별 평균
    const averageByType: Record<string, number> = {};
    const typeGroups: Record<string, number[]> = {};

    operationsWithDuration.forEach(op => {
      if (!typeGroups[op.type]) {
        typeGroups[op.type] = [];
      }
      typeGroups[op.type].push(op.duration);
    });

    for (const [type, durations] of Object.entries(typeGroups)) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      averageByType[type] = Math.round(avg * 100) / 100;
    }

    return { slowestOperations, averageByType };
  }

  // 대시보드용 요약 정보
  getDashboardSummary(): {
    totalOperations: number;
    successRate: number;
    recentOperations: FileOperation[];
    performance: PerformanceMetrics[];
    errors: any;
    systemStats: Promise<SystemStats | null>;
  } {
    const recentOps = this.operationLog.slice(-20).reverse();
    const successCount = this.operationLog.filter(op => op.success).length;

    return {
      totalOperations: this.operationLog.length,
      successRate: this.operationLog.length > 0
        ? successCount / this.operationLog.length
        : 1,
      recentOperations: recentOps,
      performance: this.getPerformanceMetrics(),
      errors: this.getErrorAnalysis(),
      systemStats: this.getSystemStats()
    };
  }

  // 로그 내보내기
  async exportLogs(outputPath: string, format: 'json' | 'csv' = 'json'): Promise<void> {
    if (format === 'json') {
      await fs.writeFile(
        outputPath,
        JSON.stringify(this.operationLog, null, 2)
      );
    } else {
      // CSV 형식
      const headers = ['id', 'type', 'path', 'timestamp', 'success', 'error', 'duration'];
      const rows = [headers.join(',')];

      this.operationLog.forEach(op => {
        const row = [
          op.id,
          op.type,
          `"${op.path}"`,
          op.timestamp.toISOString(),
          op.success,
          op.error ? `"${op.error}"` : '',
          op.metadata?.duration || ''
        ];
        rows.push(row.join(','));
      });

      await fs.writeFile(outputPath, rows.join('\n'));
    }
  }

  // ID 생성
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 클린업
  destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
    this.operationLog = [];
    this.performanceData.clear();
  }
}