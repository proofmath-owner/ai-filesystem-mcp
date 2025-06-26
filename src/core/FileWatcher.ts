import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import * as path from 'path';

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  timestamp: Date;
}

export interface WatchOptions {
  persistent?: boolean;
  ignored?: string | RegExp | string[];
  ignoreInitial?: boolean;
  followSymlinks?: boolean;
  depth?: number;
  awaitWriteFinish?: boolean | {
    stabilityThreshold?: number;
    pollInterval?: number;
  };
}

export class FileWatcher extends EventEmitter {
  private watchers: Map<string, FSWatcher> = new Map();
  private changeHistory: FileChangeEvent[] = [];
  private maxHistorySize = 1000;

  // 파일/디렉토리 감시 시작
  async watch(
    pathToWatch: string | string[], 
    options?: WatchOptions
  ): Promise<string> {
    const paths = Array.isArray(pathToWatch) ? pathToWatch : [pathToWatch];
    const watcherId = `watch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const defaultOptions: WatchOptions = {
      persistent: true,
      ignored: /(^|[\/\\])\../, // 숨김 파일 무시
      ignoreInitial: true,
      followSymlinks: false,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
      },
      ...options
    };

    const watcher = watch(paths, defaultOptions);

    // 이벤트 핸들러 등록
    watcher
      .on('add', (filePath) => this.handleEvent('add', filePath))
      .on('change', (filePath) => this.handleEvent('change', filePath))
      .on('unlink', (filePath) => this.handleEvent('unlink', filePath))
      .on('addDir', (dirPath) => this.handleEvent('addDir', dirPath))
      .on('unlinkDir', (dirPath) => this.handleEvent('unlinkDir', dirPath))
      .on('error', (error) => this.emit('error', error))
      .on('ready', () => this.emit('ready', watcherId));

    this.watchers.set(watcherId, watcher);

    return watcherId;
  }

  // 감시 중지
  async unwatch(watcherId: string): Promise<void> {
    const watcher = this.watchers.get(watcherId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(watcherId);
    }
  }

  // 모든 감시 중지
  async unwatchAll(): Promise<void> {
    const promises = Array.from(this.watchers.values()).map(watcher => watcher.close());
    await Promise.all(promises);
    this.watchers.clear();
  }
  
  // close 메서드 추가 (cleanup을 위한 alias)
  async close(): Promise<void> {
    await this.unwatchAll();
    this.removeAllListeners();
    this.changeHistory = [];
  }

  // 이벤트 처리
  private handleEvent(type: FileChangeEvent['type'], filePath: string): void {
    const event: FileChangeEvent = {
      type,
      path: path.resolve(filePath),
      timestamp: new Date()
    };

    // 히스토리에 추가
    this.changeHistory.push(event);
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory.shift();
    }

    // 이벤트 발생
    this.emit('change', event);
    this.emit(type, filePath);
  }

  // 변경 이력 조회
  getHistory(limit?: number): FileChangeEvent[] {
    if (limit) {
      return this.changeHistory.slice(-limit);
    }
    return [...this.changeHistory];
  }

  // 특정 경로의 변경 이력 조회
  getPathHistory(pathPattern: string | RegExp, limit?: number): FileChangeEvent[] {
    const regex = typeof pathPattern === 'string' 
      ? new RegExp(pathPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      : pathPattern;

    const filtered = this.changeHistory.filter(event => regex.test(event.path));
    
    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  // 감시 중인 경로 목록
  getWatchedPaths(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    
    for (const [id, watcher] of this.watchers) {
      const watched = watcher.getWatched();
      const paths: string[] = [];
      
      for (const [dir, files] of Object.entries(watched)) {
        if (files.length === 0) {
          paths.push(dir);
        } else {
          paths.push(...files.map(file => path.join(dir, file)));
        }
      }
      
      result.set(id, paths);
    }
    
    return result;
  }

  // 통계 정보
  getStats(): {
    totalWatchers: number;
    totalChanges: number;
    changesByType: Record<FileChangeEvent['type'], number>;
    recentChanges: FileChangeEvent[];
  } {
    const changesByType: Record<FileChangeEvent['type'], number> = {
      add: 0,
      change: 0,
      unlink: 0,
      addDir: 0,
      unlinkDir: 0
    };

    for (const event of this.changeHistory) {
      changesByType[event.type]++;
    }

    return {
      totalWatchers: this.watchers.size,
      totalChanges: this.changeHistory.length,
      changesByType,
      recentChanges: this.changeHistory.slice(-10)
    };
  }
}
