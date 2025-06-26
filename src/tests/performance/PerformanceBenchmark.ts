import * as fs from 'fs/promises';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import { EnhancedFileWatcher } from '../../core/EnhancedFileWatcher.js';
import { StreamingFileService } from '../../core/StreamingFileService.js';
import { ParallelProcessingManager } from '../../core/ParallelProcessingManager.js';
import { EnhancedCacheManager } from '../../core/EnhancedCacheManager.js';
import { MemoryOptimizer } from '../../core/MemoryOptimizer.js';

export interface BenchmarkResult {
  name: string;
  duration: number;
  operations: number;
  throughput: number; // operations per second
  memoryUsage: {
    before: number;
    after: number;
    peak: number;
  };
  cpuUsage?: number;
  errorRate: number;
  details?: Record<string, any>;
}

export interface BenchmarkSuite {
  name: string;
  description: string;
  results: BenchmarkResult[];
  summary: {
    totalDuration: number;
    averageThroughput: number;
    totalMemoryUsed: number;
    averageErrorRate: number;
  };
}

export interface BenchmarkOptions {
  iterations?: number;
  warmupIterations?: number;
  concurrency?: number;
  dataSize?: number;
  enableMemoryProfiling?: boolean;
  enableCpuProfiling?: boolean;
  outputFile?: string;
}

export class PerformanceBenchmark extends EventEmitter {
  private options: Required<BenchmarkOptions>;
  private results: BenchmarkSuite[] = [];
  private testDataPath: string;
  private memoryOptimizer: MemoryOptimizer;

  constructor(options: BenchmarkOptions = {}) {
    super();
    
    this.options = {
      iterations: options.iterations || 1000,
      warmupIterations: options.warmupIterations || 100,
      concurrency: options.concurrency || 10,
      dataSize: options.dataSize || 1024 * 1024, // 1MB
      enableMemoryProfiling: options.enableMemoryProfiling ?? true,
      enableCpuProfiling: options.enableCpuProfiling ?? false,
      outputFile: options.outputFile || './benchmark-results.json'
    };

    this.testDataPath = path.join(__dirname, '../../../test-data');
    this.memoryOptimizer = new MemoryOptimizer({
      enableProfiling: this.options.enableMemoryProfiling
    });
  }

  // 모든 벤치마크 실행
  async runAllBenchmarks(): Promise<BenchmarkSuite[]> {
    console.log('🚀 Starting Performance Benchmarks...\n');
    
    await this.setupTestData();
    
    // 파일 시스템 벤치마크
    const fileSystemSuite = await this.runFileSystemBenchmarks();
    this.results.push(fileSystemSuite);

    // 캐시 시스템 벤치마크
    const cacheSuite = await this.runCacheBenchmarks();
    this.results.push(cacheSuite);

    // 스트리밍 벤치마크
    const streamingSuite = await this.runStreamingBenchmarks();
    this.results.push(streamingSuite);

    // 병렬 처리 벤치마크
    const parallelSuite = await this.runParallelProcessingBenchmarks();
    this.results.push(parallelSuite);

    // 메모리 최적화 벤치마크
    const memorySuite = await this.runMemoryOptimizationBenchmarks();
    this.results.push(memorySuite);

    // 파일 감시 벤치마크
    const watcherSuite = await this.runFileWatcherBenchmarks();
    this.results.push(watcherSuite);

    await this.generateReport();
    await this.cleanup();

    console.log('✅ All benchmarks completed!\n');
    return this.results;
  }

  // 파일 시스템 벤치마크
  private async runFileSystemBenchmarks(): Promise<BenchmarkSuite> {
    console.log('📁 Running File System Benchmarks...');
    
    const suite: BenchmarkSuite = {
      name: 'File System Operations',
      description: 'Basic file system operations performance',
      results: [],
      summary: {
        totalDuration: 0,
        averageThroughput: 0,
        totalMemoryUsed: 0,
        averageErrorRate: 0
      }
    };

    // 파일 읽기 벤치마크
    const readResult = await this.benchmarkOperation(
      'File Read',
      async () => {
        const filePath = await this.createTestFile(this.options.dataSize);
        await fs.readFile(filePath);
        await fs.unlink(filePath);
      },
      this.options.iterations
    );
    suite.results.push(readResult);

    // 파일 쓰기 벤치마크
    const writeResult = await this.benchmarkOperation(
      'File Write',
      async () => {
        const filePath = path.join(this.testDataPath, `write-test-${Date.now()}.tmp`);
        const data = Buffer.alloc(this.options.dataSize, 'test');
        await fs.writeFile(filePath, data);
        await fs.unlink(filePath);
      },
      this.options.iterations
    );
    suite.results.push(writeResult);

    // 동시 파일 읽기 벤치마크
    const concurrentReadResult = await this.benchmarkOperation(
      'Concurrent File Read',
      async () => {
        const files = await Promise.all(
          Array.from({ length: this.options.concurrency }, () =>
            this.createTestFile(this.options.dataSize / this.options.concurrency)
          )
        );
        
        await Promise.all(files.map(file => fs.readFile(file)));
        await Promise.all(files.map(file => fs.unlink(file)));
      },
      Math.floor(this.options.iterations / this.options.concurrency)
    );
    suite.results.push(concurrentReadResult);

    this.calculateSuiteSummary(suite);
    return suite;
  }

  // 캐시 벤치마크
  private async runCacheBenchmarks(): Promise<BenchmarkSuite> {
    console.log('💾 Running Cache System Benchmarks...');
    
    const suite: BenchmarkSuite = {
      name: 'Cache System',
      description: 'Enhanced cache manager performance',
      results: [],
      summary: {
        totalDuration: 0,
        averageThroughput: 0,
        totalMemoryUsed: 0,
        averageErrorRate: 0
      }
    };

    const cache = new EnhancedCacheManager({
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 10000
    });

    // 캐시 설정 벤치마크
    const setResult = await this.benchmarkOperation(
      'Cache Set',
      async () => {
        const key = `key-${Math.random()}`;
        const value = { data: 'test'.repeat(100) };
        await cache.set(key, value);
      },
      this.options.iterations
    );
    suite.results.push(setResult);

    // 캐시 조회 벤치마크 (히트)
    const keys = Array.from({ length: 1000 }, (_, i) => `benchmark-key-${i}`);
    await Promise.all(keys.map(key => cache.set(key, { data: 'test' })));

    const getHitResult = await this.benchmarkOperation(
      'Cache Get (Hit)',
      async () => {
        const key = keys[Math.floor(Math.random() * keys.length)];
        await cache.get(key);
      },
      this.options.iterations
    );
    suite.results.push(getHitResult);

    // 캐시 조회 벤치마크 (미스)
    const getMissResult = await this.benchmarkOperation(
      'Cache Get (Miss)',
      async () => {
        const key = `nonexistent-${Math.random()}`;
        await cache.get(key);
      },
      this.options.iterations
    );
    suite.results.push(getMissResult);

    await cache.dispose();
    this.calculateSuiteSummary(suite);
    return suite;
  }

  // 스트리밍 벤치마크
  private async runStreamingBenchmarks(): Promise<BenchmarkSuite> {
    console.log('🌊 Running Streaming Benchmarks...');
    
    const suite: BenchmarkSuite = {
      name: 'Streaming Operations',
      description: 'Large file streaming performance',
      results: [],
      summary: {
        totalDuration: 0,
        averageThroughput: 0,
        totalMemoryUsed: 0,
        averageErrorRate: 0
      }
    };

    const streamingService = new StreamingFileService();
    const largeFileSize = 10 * 1024 * 1024; // 10MB

    // 스트리밍 읽기 벤치마크
    const streamReadResult = await this.benchmarkOperation(
      'Streaming Read',
      async () => {
        const filePath = await this.createTestFile(largeFileSize);
        await streamingService.readFileStreaming(filePath, {
          chunkSize: 64 * 1024
        });
        await fs.unlink(filePath);
      },
      Math.floor(this.options.iterations / 10) // 큰 파일이므로 적은 반복
    );
    suite.results.push(streamReadResult);

    // 파일 분할 벤치마크
    const splitResult = await this.benchmarkOperation(
      'File Split',
      async () => {
        const filePath = await this.createTestFile(largeFileSize);
        const outputDir = path.join(this.testDataPath, `split-${Date.now()}`);
        
        const result = await streamingService.splitFileStreaming(
          filePath,
          outputDir,
          2 * 1024 * 1024 // 2MB chunks
        );
        
        await fs.unlink(filePath);
        await Promise.all(result.parts.map(part => fs.unlink(part)));
        await fs.rmdir(outputDir);
      },
      Math.floor(this.options.iterations / 20)
    );
    suite.results.push(splitResult);

    await streamingService.dispose();
    this.calculateSuiteSummary(suite);
    return suite;
  }

  // 병렬 처리 벤치마크
  private async runParallelProcessingBenchmarks(): Promise<BenchmarkSuite> {
    console.log('⚡ Running Parallel Processing Benchmarks...');
    
    const suite: BenchmarkSuite = {
      name: 'Parallel Processing',
      description: 'CPU-intensive parallel operations',
      results: [],
      summary: {
        totalDuration: 0,
        averageThroughput: 0,
        totalMemoryUsed: 0,
        averageErrorRate: 0
      }
    };

    const parallelManager = new ParallelProcessingManager({
      maxWorkers: 4
    });

    // 파일 해싱 벤치마크
    const files = await Promise.all(
      Array.from({ length: 50 }, () => this.createTestFile(100 * 1024)) // 100KB files
    );

    const hashResult = await this.benchmarkOperation(
      'Parallel File Hashing',
      async () => {
        await parallelManager.hashFiles(files.slice(0, 10));
      },
      Math.floor(this.options.iterations / 50)
    );
    suite.results.push(hashResult);

    // 코드 분석 벤치마크
    const codeFiles = await Promise.all(
      Array.from({ length: 20 }, async (_, i) => {
        const filePath = path.join(this.testDataPath, `code-${i}.js`);
        const codeContent = `
          function example${i}() {
            const data = ${JSON.stringify({ test: i })};
            return data.test * 2;
          }
          export default example${i};
        `;
        await fs.writeFile(filePath, codeContent);
        return filePath;
      })
    );

    const analyzeResult = await this.benchmarkOperation(
      'Parallel Code Analysis',
      async () => {
        await parallelManager.analyzeCodeFiles(codeFiles.slice(0, 5));
      },
      Math.floor(this.options.iterations / 100)
    );
    suite.results.push(analyzeResult);

    // 정리
    await Promise.all([...files, ...codeFiles].map(file => fs.unlink(file)));
    await parallelManager.shutdown();
    
    this.calculateSuiteSummary(suite);
    return suite;
  }

  // 메모리 최적화 벤치마크
  private async runMemoryOptimizationBenchmarks(): Promise<BenchmarkSuite> {
    console.log('🧠 Running Memory Optimization Benchmarks...');
    
    const suite: BenchmarkSuite = {
      name: 'Memory Optimization',
      description: 'Memory management and optimization',
      results: [],
      summary: {
        totalDuration: 0,
        averageThroughput: 0,
        totalMemoryUsed: 0,
        averageErrorRate: 0
      }
    };

    // 메모리 할당/해제 벤치마크
    const memoryResult = await this.benchmarkOperation(
      'Memory Allocation/Deallocation',
      async () => {
        const largeArray = new Array(10000).fill(0).map((_, i) => ({
          id: i,
          data: 'test'.repeat(100)
        }));
        // 메모리 사용
        largeArray.forEach(item => item.data.length);
        // 참조 제거
        largeArray.length = 0;
      },
      this.options.iterations
    );
    suite.results.push(memoryResult);

    // 가비지 컬렉션 벤치마크
    const gcResult = await this.benchmarkOperation(
      'Garbage Collection',
      async () => {
        if (global.gc) {
          global.gc();
        }
      },
      100
    );
    suite.results.push(gcResult);

    this.calculateSuiteSummary(suite);
    return suite;
  }

  // 파일 감시 벤치마크
  private async runFileWatcherBenchmarks(): Promise<BenchmarkSuite> {
    console.log('👁️ Running File Watcher Benchmarks...');
    
    const suite: BenchmarkSuite = {
      name: 'File Watcher',
      description: 'File system monitoring performance',
      results: [],
      summary: {
        totalDuration: 0,
        averageThroughput: 0,
        totalMemoryUsed: 0,
        averageErrorRate: 0
      }
    };

    const watcher = new EnhancedFileWatcher();
    const watchDir = path.join(this.testDataPath, 'watch-test');
    await fs.mkdir(watchDir, { recursive: true });

    // 파일 감시 설정 벤치마크
    const setupResult = await this.benchmarkOperation(
      'Watcher Setup',
      async () => {
        const watcherId = await watcher.watchAdvanced(watchDir, {
          batchEvents: true,
          batchTimeout: 100
        });
        await watcher.unwatch(watcherId);
      },
      50
    );
    suite.results.push(setupResult);

    // 이벤트 처리 성능 테스트
    const watcherId = await watcher.watchAdvanced(watchDir, {
      batchEvents: true,
      batchTimeout: 100
    });

    let eventCount = 0;
    watcher.on('batchChange', () => eventCount++);

    const eventResult = await this.benchmarkOperation(
      'Event Processing',
      async () => {
        const testFile = path.join(watchDir, `test-${Date.now()}.txt`);
        await fs.writeFile(testFile, 'test content');
        await new Promise(resolve => setTimeout(resolve, 50)); // 이벤트 처리 대기
        await fs.unlink(testFile);
      },
      100
    );
    suite.results.push(eventResult);

    await watcher.unwatch(watcherId);
    await watcher.dispose();
    await fs.rmdir(watchDir, { recursive: true });

    this.calculateSuiteSummary(suite);
    return suite;
  }

  // 개별 벤치마크 실행
  private async benchmarkOperation(
    name: string,
    operation: () => Promise<void>,
    iterations: number
  ): Promise<BenchmarkResult> {
    console.log(`  ⏱️ Benchmarking: ${name}...`);
    
    const warmupIterations = Math.min(this.options.warmupIterations, iterations);
    let errors = 0;
    let memoryBefore = 0;
    let memoryAfter = 0;
    let memoryPeak = 0;

    // 워밍업
    for (let i = 0; i < warmupIterations; i++) {
      try {
        await operation();
      } catch (error) {
        // 워밍업 에러는 무시
      }
    }

    // 메모리 측정 시작
    if (this.options.enableMemoryProfiling) {
      memoryBefore = process.memoryUsage().heapUsed;
    }

    // 실제 벤치마크
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      try {
        await operation();
        
        // 메모리 피크 추적
        if (this.options.enableMemoryProfiling) {
          const current = process.memoryUsage().heapUsed;
          memoryPeak = Math.max(memoryPeak, current);
        }
      } catch (error) {
        errors++;
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // 메모리 측정 완료
    if (this.options.enableMemoryProfiling) {
      memoryAfter = process.memoryUsage().heapUsed;
    }

    const result: BenchmarkResult = {
      name,
      duration,
      operations: iterations,
      throughput: iterations / (duration / 1000),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: memoryPeak
      },
      errorRate: errors / iterations
    };

    console.log(`    ✅ ${name}: ${result.throughput.toFixed(2)} ops/sec`);
    return result;
  }

  // 테스트 데이터 설정
  private async setupTestData(): Promise<void> {
    await fs.mkdir(this.testDataPath, { recursive: true });
  }

  // 테스트 파일 생성
  private async createTestFile(size: number): Promise<string> {
    const filePath = path.join(this.testDataPath, `test-${Date.now()}-${Math.random()}.tmp`);
    const data = Buffer.alloc(size, 'test data');
    await fs.writeFile(filePath, data);
    return filePath;
  }

  // 스위트 요약 계산
  private calculateSuiteSummary(suite: BenchmarkSuite): void {
    const results = suite.results;
    
    suite.summary = {
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      averageThroughput: results.reduce((sum, r) => sum + r.throughput, 0) / results.length,
      totalMemoryUsed: results.reduce((sum, r) => sum + (r.memoryUsage.peak - r.memoryUsage.before), 0),
      averageErrorRate: results.reduce((sum, r) => sum + r.errorRate, 0) / results.length
    };
  }

  // 보고서 생성
  private async generateReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: this.options,
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cpus: require('os').cpus().length,
        totalMemory: require('os').totalmem(),
        freeMemory: require('os').freemem()
      },
      results: this.results,
      summary: {
        totalSuites: this.results.length,
        totalBenchmarks: this.results.reduce((sum, suite) => sum + suite.results.length, 0),
        overallDuration: this.results.reduce((sum, suite) => sum + suite.summary.totalDuration, 0),
        averageThroughput: this.results.reduce((sum, suite) => sum + suite.summary.averageThroughput, 0) / this.results.length
      }
    };

    await fs.writeFile(this.options.outputFile, JSON.stringify(report, null, 2));
    console.log(`📊 Benchmark report saved to: ${this.options.outputFile}`);
  }

  // 정리
  private async cleanup(): Promise<void> {
    try {
      await fs.rmdir(this.testDataPath, { recursive: true });
    } catch (error) {
      // 정리 실패는 무시
    }

    this.memoryOptimizer.dispose();
  }
}

export default PerformanceBenchmark;