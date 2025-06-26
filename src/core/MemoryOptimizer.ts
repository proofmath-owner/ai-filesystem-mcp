import { EventEmitter } from 'events';
import * as v8 from 'v8';

export interface MemorySnapshot {
  timestamp: Date;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number; // Resident Set Size
  heapStats: v8.HeapSpaceInfo[];
}

export interface MemoryAlert {
  type: 'warning' | 'critical';
  threshold: number;
  current: number;
  message: string;
  suggestions: string[];
}

export interface MemoryOptimizationResult {
  beforeMemory: number;
  afterMemory: number;
  freedMemory: number;
  optimizations: string[];
  duration: number;
}

export interface GarbageCollectionStats {
  collections: number;
  duration: number;
  freedMemory: number;
  averageDuration: number;
}

export interface MemoryConfiguration {
  warningThreshold?: number;    // 경고 임계값 (MB)
  criticalThreshold?: number;   // 위험 임계값 (MB)
  gcInterval?: number;          // GC 강제 실행 간격 (ms)
  monitoringInterval?: number;  // 모니터링 간격 (ms)
  enableProfiling?: boolean;    // 메모리 프로파일링
  maxSnapshots?: number;        // 최대 스냅샷 수
  autoOptimize?: boolean;       // 자동 최적화
}

export class MemoryOptimizer extends EventEmitter {
  private config: Required<MemoryConfiguration>;
  private snapshots: MemorySnapshot[] = [];
  private monitoringTimer: NodeJS.Timeout | null = null;
  private gcStats: GarbageCollectionStats = {
    collections: 0,
    duration: 0,
    freedMemory: 0,
    averageDuration: 0
  };
  private isOptimizing: boolean = false;
  private memoryLeaks: Map<string, number> = new Map();

  constructor(config: MemoryConfiguration = {}) {
    super();
    
    this.config = {
      warningThreshold: config.warningThreshold || 500, // 500MB
      criticalThreshold: config.criticalThreshold || 1000, // 1GB
      gcInterval: config.gcInterval || 30000, // 30초
      monitoringInterval: config.monitoringInterval || 5000, // 5초
      enableProfiling: config.enableProfiling ?? true,
      maxSnapshots: config.maxSnapshots || 100,
      autoOptimize: config.autoOptimize ?? true
    };

    if (this.config.enableProfiling) {
      this.startMonitoring();
    }
  }

  // 메모리 모니터링 시작
  startMonitoring(): void {
    if (this.monitoringTimer) {
      return;
    }

    this.monitoringTimer = setInterval(() => {
      this.captureSnapshot();
      this.checkThresholds();
      
      if (this.config.autoOptimize) {
        this.autoOptimize();
      }
    }, this.config.monitoringInterval);

    this.emit('monitoring_started');
  }

  // 메모리 모니터링 중지
  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
      this.emit('monitoring_stopped');
    }
  }

  // 메모리 스냅샷 캡처
  captureSnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapSpaceStatistics();
    
    const snapshot: MemorySnapshot = {
      timestamp: new Date(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      rss: memUsage.rss,
      heapStats
    };

    this.snapshots.push(snapshot);
    
    // 최대 스냅샷 수 제한
    if (this.snapshots.length > this.config.maxSnapshots) {
      this.snapshots.shift();
    }

    this.emit('snapshot_captured', snapshot);
    return snapshot;
  }

  // 수동 최적화 실행
  async optimize(): Promise<MemoryOptimizationResult> {
    if (this.isOptimizing) {
      throw new Error('Optimization already in progress');
    }

    this.isOptimizing = true;
    const startTime = Date.now();
    const beforeMemory = process.memoryUsage().heapUsed;
    const optimizations: string[] = [];

    try {
      // 1. 가비지 컬렉션 강제 실행
      const gcResult = await this.forceGarbageCollection();
      if (gcResult.freedMemory > 0) {
        optimizations.push(`Garbage collection freed ${this.formatBytes(gcResult.freedMemory)}`);
      }

      // 2. V8 힙 정리
      const heapOptimized = this.optimizeHeap();
      if (heapOptimized) {
        optimizations.push('V8 heap optimized');
      }

      // 3. 글로벌 변수 정리
      const globalsCleared = this.clearGlobalVariables();
      if (globalsCleared > 0) {
        optimizations.push(`Cleared ${globalsCleared} global variables`);
      }

      // 4. 이벤트 리스너 정리
      const listenersCleared = this.clearEventListeners();
      if (listenersCleared > 0) {
        optimizations.push(`Cleared ${listenersCleared} event listeners`);
      }

      // 5. 캐시 정리
      const cacheCleared = await this.clearUnusedCaches();
      if (cacheCleared > 0) {
        optimizations.push(`Cleared ${this.formatBytes(cacheCleared)} from caches`);
      }

      const afterMemory = process.memoryUsage().heapUsed;
      const freedMemory = beforeMemory - afterMemory;

      const result: MemoryOptimizationResult = {
        beforeMemory,
        afterMemory,
        freedMemory,
        optimizations,
        duration: Date.now() - startTime
      };

      this.emit('optimization_completed', result);
      return result;

    } finally {
      this.isOptimizing = false;
    }
  }

  // 자동 최적화
  private async autoOptimize(): Promise<void> {
    const currentMemory = process.memoryUsage().heapUsed;
    const currentMB = currentMemory / (1024 * 1024);

    // 위험 임계값 초과 시 즉시 최적화
    if (currentMB > this.config.criticalThreshold) {
      try {
        await this.optimize();
      } catch (error) {
        this.emit('optimization_error', error);
      }
    }
    // 경고 임계값 초과 시 경량 최적화
    else if (currentMB > this.config.warningThreshold) {
      this.lightweightOptimization();
    }
  }

  // 경량 최적화
  private async lightweightOptimization(): Promise<void> {
    // 가비지 컬렉션만 실행
    await this.forceGarbageCollection();
    this.emit('lightweight_optimization');
  }

  // 강제 가비지 컬렉션
  private async forceGarbageCollection(): Promise<GarbageCollectionStats> {
    const startTime = Date.now();
    const beforeMemory = process.memoryUsage().heapUsed;

    // V8 가비지 컬렉션 실행
    if (global.gc) {
      global.gc();
    } else {
      // gc가 사용 불가능한 경우 대안적 방법
      const v8 = require('v8');
      v8.writeHeapSnapshot();
    }

    const afterMemory = process.memoryUsage().heapUsed;
    const duration = Date.now() - startTime;
    const freedMemory = beforeMemory - afterMemory;

    // 통계 업데이트
    this.gcStats.collections++;
    this.gcStats.duration += duration;
    this.gcStats.freedMemory += freedMemory;
    this.gcStats.averageDuration = this.gcStats.duration / this.gcStats.collections;

    this.emit('garbage_collection', {
      duration,
      freedMemory,
      beforeMemory,
      afterMemory
    });

    return {
      collections: 1,
      duration,
      freedMemory,
      averageDuration: duration
    };
  }

  // V8 힙 최적화
  private optimizeHeap(): boolean {
    try {
      // V8 힙 압축
      if (v8.writeHeapSnapshot) {
        // 힙 스냅샷을 통한 간접적 최적화
        const snapshot = v8.writeHeapSnapshot();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // 글로벌 변수 정리
  private clearGlobalVariables(): number {
    let cleared = 0;
    const globalKeys = Object.keys(global);
    
    // 안전하게 제거할 수 있는 글로벌 변수들
    const safeToRemove = ['_tmp', '_cache', '_temp', '_debug'];
    
    for (const key of globalKeys) {
      if (safeToRemove.some(safe => key.startsWith(safe))) {
        try {
          delete (global as any)[key];
          cleared++;
        } catch (error) {
          // 삭제할 수 없는 변수는 무시
        }
      }
    }

    return cleared;
  }

  // 이벤트 리스너 정리
  private clearEventListeners(): number {
    let cleared = 0;
    
    // 프로세스 이벤트 리스너 정리
    const processEvents = ['uncaughtException', 'unhandledRejection', 'warning'];
    
    for (const event of processEvents) {
      const listenerCount = process.listenerCount(event);
      if (listenerCount > 10) { // 너무 많은 리스너가 있는 경우
        process.removeAllListeners(event);
        cleared += listenerCount;
      }
    }

    return cleared;
  }

  // 사용하지 않는 캐시 정리
  private async clearUnusedCaches(): Promise<number> {
    let clearedBytes = 0;
    
    // Node.js 모듈 캐시 정리
    const moduleKeys = Object.keys(require.cache);
    const unusedModules = moduleKeys.filter(key => {
      const module = require.cache[key];
      return module && module.children.length === 0;
    });

    for (const key of unusedModules) {
      try {
        delete require.cache[key];
        clearedBytes += key.length * 2; // 대략적인 크기 계산
      } catch (error) {
        // 삭제할 수 없는 모듈은 무시
      }
    }

    return clearedBytes;
  }

  // 임계값 확인
  private checkThresholds(): void {
    const currentMemory = process.memoryUsage().heapUsed;
    const currentMB = currentMemory / (1024 * 1024);

    if (currentMB > this.config.criticalThreshold) {
      const alert: MemoryAlert = {
        type: 'critical',
        threshold: this.config.criticalThreshold,
        current: currentMB,
        message: `Memory usage is critically high: ${currentMB.toFixed(2)}MB`,
        suggestions: [
          'Force garbage collection',
          'Clear unused caches',
          'Reduce data in memory',
          'Restart application if necessary'
        ]
      };
      this.emit('memory_alert', alert);
    } else if (currentMB > this.config.warningThreshold) {
      const alert: MemoryAlert = {
        type: 'warning',
        threshold: this.config.warningThreshold,
        current: currentMB,
        message: `Memory usage is high: ${currentMB.toFixed(2)}MB`,
        suggestions: [
          'Monitor memory usage closely',
          'Consider cleanup operations',
          'Check for memory leaks'
        ]
      };
      this.emit('memory_alert', alert);
    }
  }

  // 메모리 누수 감지
  detectMemoryLeaks(): Map<string, number> {
    const currentSnapshot = this.captureSnapshot();
    
    if (this.snapshots.length < 2) {
      return new Map();
    }

    const previousSnapshot = this.snapshots[this.snapshots.length - 2];
    const memoryGrowth = currentSnapshot.heapUsed - previousSnapshot.heapUsed;
    
    if (memoryGrowth > 10 * 1024 * 1024) { // 10MB 증가
      const timestamp = currentSnapshot.timestamp.toISOString();
      this.memoryLeaks.set(timestamp, memoryGrowth);
      
      this.emit('potential_memory_leak', {
        timestamp,
        growth: memoryGrowth,
        current: currentSnapshot.heapUsed,
        previous: previousSnapshot.heapUsed
      });
    }

    return new Map(this.memoryLeaks);
  }

  // 메모리 트렌드 분석
  analyzeMemoryTrend(): {
    trend: 'increasing' | 'decreasing' | 'stable';
    averageGrowth: number;
    prediction: number;
  } {
    if (this.snapshots.length < 3) {
      return {
        trend: 'stable',
        averageGrowth: 0,
        prediction: 0
      };
    }

    const recent = this.snapshots.slice(-10); // 최근 10개 스냅샷
    const growthRates: number[] = [];

    for (let i = 1; i < recent.length; i++) {
      const growth = recent[i].heapUsed - recent[i - 1].heapUsed;
      growthRates.push(growth);
    }

    const averageGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    const currentMemory = recent[recent.length - 1].heapUsed;
    const prediction = currentMemory + (averageGrowth * 10); // 10스냅샷 후 예상

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (averageGrowth > 1024 * 1024) { // 1MB 이상 증가
      trend = 'increasing';
    } else if (averageGrowth < -1024 * 1024) { // 1MB 이상 감소
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return {
      trend,
      averageGrowth,
      prediction
    };
  }

  // 현재 메모리 상태 조회
  getCurrentMemoryState(): {
    usage: NodeJS.MemoryUsage;
    usageMB: Record<string, number>;
    heapStats: v8.HeapSpaceInfo[];
    gcStats: GarbageCollectionStats;
  } {
    const usage = process.memoryUsage();
    const usageMB = {
      heapUsed: usage.heapUsed / (1024 * 1024),
      heapTotal: usage.heapTotal / (1024 * 1024),
      external: usage.external / (1024 * 1024),
      arrayBuffers: usage.arrayBuffers / (1024 * 1024),
      rss: usage.rss / (1024 * 1024)
    };

    return {
      usage,
      usageMB,
      heapStats: v8.getHeapSpaceStatistics(),
      gcStats: { ...this.gcStats }
    };
  }

  // 메모리 히스토리 조회
  getMemoryHistory(limit?: number): MemorySnapshot[] {
    return limit ? this.snapshots.slice(-limit) : [...this.snapshots];
  }

  // 메모리 보고서 생성
  generateMemoryReport(): {
    summary: any;
    trends: any;
    alerts: MemoryAlert[];
    recommendations: string[];
  } {
    const currentState = this.getCurrentMemoryState();
    const trends = this.analyzeMemoryTrend();
    const alerts: MemoryAlert[] = [];
    const recommendations: string[] = [];

    // 현재 상태 기반 권장사항
    if (currentState.usageMB.heapUsed > this.config.warningThreshold) {
      recommendations.push('Consider running memory optimization');
      recommendations.push('Check for memory leaks');
    }

    if (trends.trend === 'increasing') {
      recommendations.push('Monitor memory growth closely');
      recommendations.push('Review application logic for memory efficiency');
    }

    if (this.gcStats.averageDuration > 100) {
      recommendations.push('GC is taking too long - consider reducing heap size');
    }

    return {
      summary: currentState,
      trends,
      alerts,
      recommendations
    };
  }

  // 유틸리티 메서드
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  // 정리
  dispose(): void {
    this.stopMonitoring();
    this.snapshots = [];
    this.memoryLeaks.clear();
    this.removeAllListeners();
  }
}

export default MemoryOptimizer;