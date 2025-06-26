import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import * as path from 'path';
import { Worker } from 'worker_threads';

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  timestamp: Date;
  size?: number;
  stats?: {
    isFile: boolean;
    isDirectory: boolean;
    mtime: Date;
    ctime: Date;
    size: number;
  };
}

export interface WatcherStats {
  watcherId: string;
  pathsWatched: string[];
  eventsProcessed: number;
  lastEvent?: FileChangeEvent;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface AdvancedWatchOptions {
  // 기본 chokidar 옵션
  persistent?: boolean;
  ignored?: string | RegExp | string[];
  ignoreInitial?: boolean;
  followSymlinks?: boolean;
  depth?: number;
  awaitWriteFinish?: boolean | {
    stabilityThreshold?: number;
    pollInterval?: number;
  };
  
  // 향상된 옵션
  batchEvents?: boolean;           // 이벤트 배치 처리
  batchTimeout?: number;           // 배치 타임아웃 (ms)
  debounceTimeout?: number;        // 디바운스 타임아웃 (ms)
  maxEventHistory?: number;        // 최대 이벤트 히스토리
  enableStats?: boolean;           // 통계 수집 활성화
  useWorkerThread?: boolean;       // 워커 스레드 사용
  filterExtensions?: string[];     // 특정 확장자만 감시
  minFileSize?: number;            // 최소 파일 크기
  maxFileSize?: number;            // 최대 파일 크기
}

export class EnhancedFileWatcher extends EventEmitter {
  private watchers: Map<string, FSWatcher> = new Map();
  private changeHistory: Map<string, FileChangeEvent[]> = new Map();
  private stats: Map<string, WatcherStats> = new Map();
  private eventBatches: Map<string, FileChangeEvent[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private workers: Map<string, Worker> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100); // 많은 경로를 감시할 수 있도록
  }

  // 향상된 파일 감시 시작
  async watchAdvanced(
    pathToWatch: string | string[],
    options: AdvancedWatchOptions = {}
  ): Promise<string> {
    const paths = Array.isArray(pathToWatch) ? pathToWatch : [pathToWatch];
    const watcherId = `enhanced_watch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const defaultOptions: AdvancedWatchOptions = {
      persistent: true,
      ignored: /(^|[\/\\])\../,
      ignoreInitial: true,
      followSymlinks: false,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
      },
      batchEvents: true,
      batchTimeout: 1000,
      debounceTimeout: 300,
      maxEventHistory: 1000,
      enableStats: true,
      useWorkerThread: false,
      ...options
    };

    // 워커 스레드 생성 (CPU 집약적 작업용)
    if (defaultOptions.useWorkerThread) {
      const workerPath = this.createFileProcessingWorker();
      const worker = new Worker(workerPath);
      this.workers.set(watcherId, worker);
    }

    // chokidar 와처 생성
    const watcher = watch(paths, {
      persistent: defaultOptions.persistent,
      ignored: defaultOptions.ignored,
      ignoreInitial: defaultOptions.ignoreInitial,
      followSymlinks: defaultOptions.followSymlinks,
      depth: defaultOptions.depth,
      awaitWriteFinish: defaultOptions.awaitWriteFinish
    });

    this.watchers.set(watcherId, watcher);
    this.changeHistory.set(watcherId, []);
    this.eventBatches.set(watcherId, []);

    // 통계 초기화
    if (defaultOptions.enableStats) {
      this.stats.set(watcherId, {
        watcherId,
        pathsWatched: paths,
        eventsProcessed: 0,
        uptime: Date.now(),
        memoryUsage: 0,
        cpuUsage: 0
      });
    }

    // 이벤트 핸들러 등록
    this.setupEventHandlers(watcher, watcherId, defaultOptions);

    await new Promise<void>((resolve, reject) => {
      watcher.on('ready', () => {
        console.log(`Enhanced file watcher ${watcherId} is ready`);
        resolve();
      });
      watcher.on('error', reject);
    });

    return watcherId;
  }

  private setupEventHandlers(
    watcher: FSWatcher,
    watcherId: string,
    options: AdvancedWatchOptions
  ): void {
    const eventTypes: Array<'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'> = 
      ['add', 'change', 'unlink', 'addDir', 'unlinkDir'];

    eventTypes.forEach(eventType => {
      watcher.on(eventType, async (filePath: string, stats?: any) => {
        try {
          await this.handleFileEvent(eventType, filePath, watcherId, options, stats);
        } catch (error) {
          this.emit('error', {
            watcherId,
            error,
            path: filePath,
            eventType
          });
        }
      });
    });
  }

  private async handleFileEvent(
    eventType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir',
    filePath: string,
    watcherId: string,
    options: AdvancedWatchOptions,
    stats?: any
  ): Promise<void> {
    // 파일 필터링
    if (!this.shouldProcessFile(filePath, options)) {
      return;
    }

    const event: FileChangeEvent = {
      type: eventType,
      path: filePath,
      timestamp: new Date(),
      size: stats?.size,
      stats: stats ? {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        mtime: stats.mtime,
        ctime: stats.ctime,
        size: stats.size
      } : undefined
    };

    // 이벤트 히스토리 저장
    this.addToHistory(watcherId, event, options.maxEventHistory || 1000);

    // 통계 업데이트
    this.updateStats(watcherId);

    // 디바운스 처리
    if (options.debounceTimeout && options.debounceTimeout > 0) {
      await this.handleDebounce(watcherId, event, options);
      return;
    }

    // 배치 처리
    if (options.batchEvents) {
      await this.handleBatch(watcherId, event, options);
    } else {
      // 즉시 처리
      await this.processEvent(watcherId, event, options);
    }
  }

  private shouldProcessFile(filePath: string, options: AdvancedWatchOptions): boolean {
    const ext = path.extname(filePath).toLowerCase();
    
    // 확장자 필터링
    if (options.filterExtensions && options.filterExtensions.length > 0) {
      if (!options.filterExtensions.includes(ext)) {
        return false;
      }
    }

    return true;
  }

  private async handleDebounce(
    watcherId: string,
    event: FileChangeEvent,
    options: AdvancedWatchOptions
  ): Promise<void> {
    const key = `${watcherId}_${event.path}`;
    
    // 기존 타이머 취소
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }

    // 새 타이머 설정
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(key);
      
      if (options.batchEvents) {
        await this.handleBatch(watcherId, event, options);
      } else {
        await this.processEvent(watcherId, event, options);
      }
    }, options.debounceTimeout!);

    this.debounceTimers.set(key, timer);
  }

  private async handleBatch(
    watcherId: string,
    event: FileChangeEvent,
    options: AdvancedWatchOptions
  ): Promise<void> {
    const batch = this.eventBatches.get(watcherId) || [];
    batch.push(event);
    this.eventBatches.set(watcherId, batch);

    // 배치 타이머가 없으면 생성
    if (!this.batchTimers.has(watcherId)) {
      const timer = setTimeout(async () => {
        const batchToProcess = this.eventBatches.get(watcherId) || [];
        this.eventBatches.set(watcherId, []);
        this.batchTimers.delete(watcherId);

        if (batchToProcess.length > 0) {
          await this.processBatch(watcherId, batchToProcess, options);
        }
      }, options.batchTimeout || 1000);

      this.batchTimers.set(watcherId, timer);
    }
  }

  private async processEvent(
    watcherId: string,
    event: FileChangeEvent,
    options: AdvancedWatchOptions
  ): Promise<void> {
    // 워커 스레드 사용
    if (options.useWorkerThread && this.workers.has(watcherId)) {
      const worker = this.workers.get(watcherId)!;
      worker.postMessage({ type: 'processEvent', event });
      return;
    }

    // 메인 스레드에서 처리
    this.emit('change', {
      watcherId,
      event,
      batch: false
    });
  }

  private async processBatch(
    watcherId: string,
    batch: FileChangeEvent[],
    options: AdvancedWatchOptions
  ): Promise<void> {
    // 중복 제거 및 최적화
    const optimizedBatch = this.optimizeBatch(batch);

    // 워커 스레드 사용
    if (options.useWorkerThread && this.workers.has(watcherId)) {
      const worker = this.workers.get(watcherId)!;
      worker.postMessage({ type: 'processBatch', batch: optimizedBatch });
      return;
    }

    // 메인 스레드에서 처리
    this.emit('batchChange', {
      watcherId,
      events: optimizedBatch,
      batch: true,
      originalCount: batch.length,
      optimizedCount: optimizedBatch.length
    });
  }

  private optimizeBatch(batch: FileChangeEvent[]): FileChangeEvent[] {
    // 경로별로 그룹화
    const pathGroups = new Map<string, FileChangeEvent[]>();
    
    batch.forEach(event => {
      const path = event.path;
      if (!pathGroups.has(path)) {
        pathGroups.set(path, []);
      }
      pathGroups.get(path)!.push(event);
    });

    // 각 경로에서 최신 이벤트만 유지 (최적화)
    const optimized: FileChangeEvent[] = [];
    
    pathGroups.forEach(events => {
      if (events.length === 1) {
        optimized.push(events[0]);
      } else {
        // 마지막 이벤트만 유지 (연속된 change 이벤트 등 최적화)
        const lastEvent = events[events.length - 1];
        optimized.push(lastEvent);
      }
    });

    return optimized.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private addToHistory(
    watcherId: string,
    event: FileChangeEvent,
    maxSize: number
  ): void {
    const history = this.changeHistory.get(watcherId) || [];
    history.push(event);
    
    if (history.length > maxSize) {
      history.shift();
    }
    
    this.changeHistory.set(watcherId, history);
  }

  private updateStats(watcherId: string): void {
    const stats = this.stats.get(watcherId);
    if (stats) {
      stats.eventsProcessed++;
      stats.memoryUsage = process.memoryUsage().heapUsed;
      // CPU 사용량은 별도 모니터링 필요
    }
  }

  private createFileProcessingWorker(): string {
    // 워커 스레드용 파일 생성 (실제 구현에서는 별도 파일로)
    const workerCode = `
      const { parentPort } = require('worker_threads');
      
      parentPort.on('message', (data) => {
        const { type, event, batch } = data;
        
        if (type === 'processEvent') {
          // 단일 이벤트 처리
          processFileEvent(event);
        } else if (type === 'processBatch') {
          // 배치 이벤트 처리
          batch.forEach(processFileEvent);
        }
      });
      
      function processFileEvent(event) {
        // CPU 집약적 파일 처리 작업
        // 예: 파일 해싱, 내용 분석, 인덱싱 등
        
        parentPort.postMessage({
          type: 'eventProcessed',
          event,
          result: 'processed'
        });
      }
    `;

    const fs = require('fs');
    const workerPath = path.join(__dirname, 'fileProcessingWorker.js');
    fs.writeFileSync(workerPath, workerCode);
    return workerPath;
  }

  // 감시 중지
  async unwatch(watcherId: string): Promise<void> {
    const watcher = this.watchers.get(watcherId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(watcherId);
    }

    // 정리
    this.changeHistory.delete(watcherId);
    this.eventBatches.delete(watcherId);
    this.stats.delete(watcherId);

    // 타이머 정리
    const batchTimer = this.batchTimers.get(watcherId);
    if (batchTimer) {
      clearTimeout(batchTimer);
      this.batchTimers.delete(watcherId);
    }

    // 워커 종료
    const worker = this.workers.get(watcherId);
    if (worker) {
      await worker.terminate();
      this.workers.delete(watcherId);
    }
  }

  // 통계 조회
  getStats(watcherId?: string): WatcherStats | WatcherStats[] {
    if (watcherId) {
      return this.stats.get(watcherId) || null;
    }
    return Array.from(this.stats.values());
  }

  // 이벤트 히스토리 조회
  getHistory(watcherId: string, limit?: number): FileChangeEvent[] {
    const history = this.changeHistory.get(watcherId) || [];
    return limit ? history.slice(-limit) : history;
  }

  // 모든 와처 중지
  async dispose(): Promise<void> {
    const watcherIds = Array.from(this.watchers.keys());
    await Promise.all(watcherIds.map(id => this.unwatch(id)));
  }
}

export default EnhancedFileWatcher;