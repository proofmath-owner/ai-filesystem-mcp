# Phase 3: 성능 최적화 계획

## 📋 개요
Phase 2에서 구조 개선을 완료한 후, Phase 3에서는 성능 최적화에 집중합니다. 대용량 파일 처리, 실시간 파일 감시, 병렬 처리를 통해 시스템의 효율성을 극대화할 계획입니다.

## 🎯 목표
1. **파일 감시 효율화**: 폴링 방식에서 이벤트 기반으로 전환
2. **스트리밍 처리**: 대용량 파일의 메모리 효율적 처리
3. **병렬 처리**: CPU 집약적 작업의 병렬화

## 📊 현재 성능 병목 지점

### 1. 파일 감시 시스템
```typescript
// 현재: 1초마다 폴링 (비효율적)
setInterval(() => {
  checkForChanges();
}, 1000);

// 문제점:
// - CPU 낭비 (변경사항이 없어도 계속 체크)
// - 1초의 지연 시간
// - 많은 파일 감시 시 성능 저하
```

### 2. 대용량 파일 처리
```typescript
// 현재: 전체 파일을 메모리에 로드
const content = await fs.readFile(largePath, 'utf-8');

// 문제점:
// - 1GB 파일 = 1GB 메모리 사용
// - OOM(Out of Memory) 위험
// - 처리 시작까지 긴 대기 시간
```

### 3. 순차 처리
```typescript
// 현재: 파일들을 순차적으로 처리
for (const file of files) {
  await processFile(file);
}

// 문제점:
// - CPU 코어 1개만 사용
// - 전체 처리 시간 = 각 파일 처리 시간의 합
```

## 🚀 Phase 3-1: 효율적인 파일 감시

### 1. Native fs.watch 활용
```typescript
// src/core/monitoring/NativeWatcher.ts
import { watch, FSWatcher } from 'fs';

export class NativeWatcher implements IFileWatcher {
  private watchers = new Map<string, FSWatcher>();
  
  async watchFile(path: string, callback: WatchCallback): Promise<string> {
    const watcher = watch(path, { persistent: true }, (eventType, filename) => {
      callback({
        type: eventType as 'rename' | 'change',
        path: filename || path,
        timestamp: Date.now()
      });
    });
    
    const id = generateId();
    this.watchers.set(id, watcher);
    return id;
  }
  
  async stopWatching(id: string): Promise<void> {
    const watcher = this.watchers.get(id);
    watcher?.close();
    this.watchers.delete(id);
  }
}
```

### 2. Chokidar 통합 (크로스 플랫폼)
```typescript
// src/core/monitoring/ChokidarWatcher.ts
import chokidar from 'chokidar';

export class ChokidarWatcher implements IFileWatcher {
  private watchers = new Map<string, chokidar.FSWatcher>();
  
  async watchDirectory(
    path: string, 
    options: WatchOptions
  ): Promise<string> {
    const watcher = chokidar.watch(path, {
      ignored: options.ignored,
      persistent: true,
      ignoreInitial: options.ignoreInitial,
      depth: options.depth,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });
    
    watcher
      .on('add', path => this.emit('add', path))
      .on('change', path => this.emit('change', path))
      .on('unlink', path => this.emit('remove', path))
      .on('error', error => this.emit('error', error));
    
    const id = generateId();
    this.watchers.set(id, watcher);
    return id;
  }
}
```

### 3. 지능형 감시 전략
```typescript
// src/core/monitoring/SmartWatcher.ts
export class SmartWatcher {
  constructor(
    private nativeWatcher: NativeWatcher,
    private chokidarWatcher: ChokidarWatcher
  ) {}
  
  async watch(path: string, options: WatchOptions): Promise<string> {
    // 파일 수에 따라 전략 선택
    const stats = await this.analyzeTarget(path);
    
    if (stats.fileCount < 100 && stats.isLocal) {
      // 적은 수의 로컬 파일: Native 사용
      return this.nativeWatcher.watchFile(path, options.callback);
    } else {
      // 많은 파일 또는 네트워크 드라이브: Chokidar 사용
      return this.chokidarWatcher.watchDirectory(path, options);
    }
  }
}
```

## 📈 Phase 3-2: 스트리밍 처리

### 1. 스트림 기반 파일 읽기
```typescript
// src/core/streaming/StreamReader.ts
export class StreamReader {
  async readLargeFile(
    path: string, 
    processor: StreamProcessor
  ): Promise<ProcessResult> {
    const stream = createReadStream(path, {
      encoding: 'utf8',
      highWaterMark: 16 * 1024 // 16KB chunks
    });
    
    const pipeline = stream
      .pipe(new LineTransform()) // 라인 단위로 변환
      .pipe(processor)           // 사용자 정의 처리
      .pipe(new ResultCollector()); // 결과 수집
    
    return new Promise((resolve, reject) => {
      pipeline.on('finish', () => resolve(pipeline.result));
      pipeline.on('error', reject);
    });
  }
}
```

### 2. 스트림 변환기
```typescript
// src/core/streaming/transforms/SearchTransform.ts
export class SearchTransform extends Transform {
  private lineNumber = 0;
  private matches: SearchMatch[] = [];
  
  constructor(private pattern: RegExp) {
    super({ objectMode: true });
  }
  
  _transform(chunk: string, encoding: string, callback: Function) {
    this.lineNumber++;
    
    if (this.pattern.test(chunk)) {
      this.matches.push({
        line: this.lineNumber,
        content: chunk,
        column: chunk.search(this.pattern)
      });
      
      // 매치 발견 즉시 전달 (실시간 결과)
      this.push({
        type: 'match',
        data: this.matches[this.matches.length - 1]
      });
    }
    
    callback();
  }
}
```

### 3. 메모리 효율적 파일 처리
```typescript
// src/core/streaming/ChunkedProcessor.ts
export class ChunkedProcessor {
  async processLargeFile(
    path: string,
    chunkSize: number = 1024 * 1024 // 1MB
  ): Promise<void> {
    const fd = await fs.open(path, 'r');
    const buffer = Buffer.alloc(chunkSize);
    let position = 0;
    
    try {
      while (true) {
        const { bytesRead } = await fd.read(
          buffer, 
          0, 
          chunkSize, 
          position
        );
        
        if (bytesRead === 0) break;
        
        // 청크 처리 (메모리에 전체 파일 로드하지 않음)
        await this.processChunk(
          buffer.slice(0, bytesRead), 
          position
        );
        
        position += bytesRead;
        
        // 메모리 압박 시 GC 강제 실행
        if (position % (100 * 1024 * 1024) === 0) {
          if (global.gc) global.gc();
        }
      }
    } finally {
      await fd.close();
    }
  }
}
```

## 🔄 Phase 3-3: 병렬 처리

### 1. Worker Pool 구현
```typescript
// src/core/parallel/WorkerPool.ts
import { Worker } from 'worker_threads';
import os from 'os';

export class WorkerPool {
  private workers: Worker[] = [];
  private queue: Task[] = [];
  private busy = new Set<Worker>();
  
  constructor(
    private workerScript: string,
    private poolSize: number = os.cpus().length
  ) {
    this.initializeWorkers();
  }
  
  private initializeWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript);
      
      worker.on('message', (result) => {
        this.handleWorkerResult(worker, result);
      });
      
      worker.on('error', (error) => {
        this.handleWorkerError(worker, error);
      });
      
      this.workers.push(worker);
    }
  }
  
  async execute<T>(task: Task): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedTask = {
        ...task,
        resolve,
        reject
      };
      
      const availableWorker = this.getAvailableWorker();
      if (availableWorker) {
        this.assignTask(availableWorker, wrappedTask);
      } else {
        this.queue.push(wrappedTask);
      }
    });
  }
}
```

### 2. 파일 배치 처리 Worker
```typescript
// src/core/parallel/workers/batchProcessor.js
const { parentPort } = require('worker_threads');
const fs = require('fs').promises;

parentPort.on('message', async (task) => {
  try {
    const { files, operation } = task;
    const results = [];
    
    for (const file of files) {
      const result = await processFile(file, operation);
      results.push(result);
    }
    
    parentPort.postMessage({
      taskId: task.id,
      success: true,
      results
    });
  } catch (error) {
    parentPort.postMessage({
      taskId: task.id,
      success: false,
      error: error.message
    });
  }
});
```

### 3. 병렬 검색 구현
```typescript
// src/core/parallel/ParallelSearch.ts
export class ParallelSearch {
  constructor(private workerPool: WorkerPool) {}
  
  async searchInFiles(
    files: string[], 
    pattern: string
  ): Promise<SearchResult[]> {
    // 파일을 청크로 분할 (워커당 균등 분배)
    const chunks = this.chunkArray(files, this.workerPool.size);
    
    // 각 청크를 워커에 할당
    const promises = chunks.map(chunk => 
      this.workerPool.execute({
        type: 'search',
        files: chunk,
        pattern
      })
    );
    
    // 모든 워커의 결과 수집
    const results = await Promise.all(promises);
    
    // 결과 병합 및 정렬
    return this.mergeResults(results);
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    const chunkSize = Math.ceil(array.length / size);
    
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    
    return chunks;
  }
}
```

## 🔬 Phase 3-4: 고급 최적화

### 1. 캐시 최적화
```typescript
// src/core/optimization/SmartCache.ts
export class SmartCache {
  private cache: LRUCache<string, CacheEntry>;
  private hotData = new Map<string, any>(); // 자주 접근하는 데이터
  
  constructor(options: CacheOptions) {
    this.cache = new LRUCache({
      max: options.maxSize,
      ttl: options.ttl,
      updateAgeOnGet: true,
      // 메모리 기반 크기 계산
      sizeCalculation: (entry) => {
        return Buffer.byteLength(JSON.stringify(entry));
      }
    });
    
    // 주기적으로 핫 데이터 분석
    setInterval(() => this.analyzeHotData(), 60000);
  }
  
  async get(key: string): Promise<any> {
    // 핫 데이터 우선 확인
    if (this.hotData.has(key)) {
      return this.hotData.get(key);
    }
    
    // 일반 캐시 확인
    const entry = this.cache.get(key);
    if (entry) {
      entry.accessCount++;
      return entry.data;
    }
    
    return null;
  }
}
```

### 2. 메모리 모니터링
```typescript
// src/core/optimization/MemoryMonitor.ts
export class MemoryMonitor {
  private threshold = 0.8; // 80% 메모리 사용 시 경고
  
  startMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      const heapUsed = usage.heapUsed / usage.heapTotal;
      
      if (heapUsed > this.threshold) {
        this.handleHighMemoryUsage();
      }
    }, 5000);
  }
  
  private handleHighMemoryUsage() {
    // 1. 캐시 정리
    this.cache.prune();
    
    // 2. GC 강제 실행
    if (global.gc) {
      global.gc();
    }
    
    // 3. 큰 객체 해제
    this.releaseLargeObjects();
    
    // 4. 경고 로그
    console.warn('High memory usage detected', {
      heapUsed: process.memoryUsage().heapUsed,
      rss: process.memoryUsage().rss
    });
  }
}
```

## 📊 벤치마크 및 성능 목표

### 1. 파일 감시 성능
```typescript
// 목표 성능
const benchmarks = {
  watchLatency: {
    current: 1000,  // 1초 (폴링)
    target: 10,     // 10ms (이벤트 기반)
    improvement: '100x'
  },
  cpuUsage: {
    current: '5%',  // 1000개 파일 감시 시
    target: '0.1%',
    improvement: '50x'
  }
};
```

### 2. 대용량 파일 처리
```typescript
// 1GB 파일 처리 벤치마크
const fileBenchmarks = {
  memoryUsage: {
    current: '1GB',
    target: '50MB',  // 스트리밍 버퍼만 사용
    improvement: '20x'
  },
  processingTime: {
    current: '30s',
    target: '5s',    // 병렬 처리
    improvement: '6x'
  }
};
```

### 3. 배치 작업 성능
```typescript
// 10,000개 파일 처리
const batchBenchmarks = {
  sequentialTime: '100s',
  parallelTime: '15s',     // 8 코어 기준
  improvement: '6.7x',
  throughput: '667 files/sec'
};
```

## 🧪 성능 테스트

### 1. 부하 테스트
```typescript
// src/tests/performance/load.test.ts
describe('Performance Tests', () => {
  test('should handle 10000 concurrent file operations', async () => {
    const operations = Array(10000).fill(null).map((_, i) => 
      fsService.readFile(`test-${i}.txt`)
    );
    
    const start = Date.now();
    await Promise.all(operations);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000); // 5초 이내
  });
});
```

### 2. 메모리 누수 테스트
```typescript
// src/tests/performance/memory.test.ts
test('should not leak memory during long operations', async () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  // 1시간 동안 연속 작업
  for (let i = 0; i < 3600; i++) {
    await processLargeFile('1gb-file.dat');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  global.gc();
  const finalMemory = process.memoryUsage().heapUsed;
  
  // 메모리 증가량이 10MB 미만
  expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024);
});
```

## 📅 구현 일정

### Month 1: 파일 감시 최적화
- Week 1-2: Native fs.watch 구현
- Week 3: Chokidar 통합
- Week 4: 성능 테스트 및 튜닝

### Month 2: 스트리밍 처리
- Week 1-2: 기본 스트림 구현
- Week 3: 변환 스트림 개발
- Week 4: 대용량 파일 테스트

### Month 3: 병렬 처리
- Week 1-2: Worker Pool 구현
- Week 3: 병렬 알고리즘 개발
- Week 4: 통합 및 최적화

### Month 4: 고급 최적화
- Week 1: 캐시 최적화
- Week 2: 메모리 모니터링
- Week 3: 전체 시스템 프로파일링
- Week 4: 최종 튜닝 및 문서화

## 🎯 완료 기준

1. **성능 목표 달성**
   - 모든 벤치마크 통과
   - 메모리 사용량 50% 감소
   - 응답 시간 80% 개선

2. **안정성**
   - 24시간 연속 운영 테스트 통과
   - 메모리 누수 없음
   - 크래시 0건

3. **확장성**
   - 100,000개 파일 동시 감시 가능
   - 10GB 파일 처리 가능
   - 선형적 성능 확장

## 📚 참고 자료
- [Node.js Stream API](https://nodejs.org/api/stream.html)
- [Worker Threads](https://nodejs.org/api/worker_threads.html)
- [V8 Memory Management](https://v8.dev/blog/trash-talk)
- [High Performance Node.js](https://www.oreilly.com/library/view/high-performance-nodejs/9781492080084/)
