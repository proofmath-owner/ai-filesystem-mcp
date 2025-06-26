import { FSWatcher, watch } from 'chokidar';
import { EventEmitter } from 'events';

export interface WatchEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  timestamp: Date;
}

export interface WatcherStatus {
  active: boolean;
  startedAt?: Date;
  eventsCount: number;
  lastEvent?: WatchEvent;
}

export class FileWatcherService extends EventEmitter {
  private watchers: Map<string, {
    watcher: FSWatcher;
    events: WatchEvent[];
    status: WatcherStatus;
  }> = new Map();

  async startWatching(
    path: string,
    options?: {
      events?: Array<'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'>;
      recursive?: boolean;
      ignorePatterns?: string[];
    }
  ): Promise<string> {
    // Check if already watching this path
    if (this.watchers.has(path)) {
      throw new Error(`Already watching path: ${path}`);
    }

    const watcherId = `watcher_${Date.now()}`;
    const events: WatchEvent[] = [];
    const status: WatcherStatus = {
      active: true,
      startedAt: new Date(),
      eventsCount: 0
    };

    const watcher = watch(path, {
      persistent: true,
      ignoreInitial: true,
      depth: options?.recursive ? undefined : 0,
      ignored: options?.ignorePatterns
    });

    const eventTypes = options?.events || ['add', 'change', 'unlink', 'addDir', 'unlinkDir'];

    eventTypes.forEach(eventType => {
      watcher.on(eventType, (filePath: string) => {
        const event: WatchEvent = {
          type: eventType,
          path: filePath,
          timestamp: new Date()
        };

        events.push(event);
        status.eventsCount++;
        status.lastEvent = event;

        // Keep only last 1000 events
        if (events.length > 1000) {
          events.shift();
        }

        this.emit('file-event', event);
      });
    });

    watcher.on('error', (error) => {
      this.emit('watcher-error', { path, error });
    });

    this.watchers.set(path, { watcher, events, status });
    return watcherId;
  }

  async stopWatching(path: string): Promise<void> {
    const watcherInfo = this.watchers.get(path);
    if (!watcherInfo) {
      throw new Error(`No watcher found for path: ${path}`);
    }

    await watcherInfo.watcher.close();
    watcherInfo.status.active = false;
    this.watchers.delete(path);
  }

  async getStatus(path: string): Promise<WatcherStatus> {
    const watcherInfo = this.watchers.get(path);
    if (!watcherInfo) {
      return {
        active: false,
        eventsCount: 0
      };
    }

    return { ...watcherInfo.status };
  }

  async getRecentEvents(path: string, limit: number = 100): Promise<WatchEvent[]> {
    const watcherInfo = this.watchers.get(path);
    if (!watcherInfo) {
      return [];
    }

    return watcherInfo.events.slice(-limit);
  }

  async stopAllWatchers(): Promise<void> {
    const promises = Array.from(this.watchers.keys()).map(path => 
      this.stopWatching(path)
    );
    await Promise.all(promises);
  }

  getActiveWatchers(): string[] {
    return Array.from(this.watchers.keys()).filter(path => {
      const info = this.watchers.get(path);
      return info?.status.active;
    });
  }
}
