import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface Task<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  priority?: number;
  timeout?: number;
}

export interface TaskResult<R = any> {
  id: string;
  success: boolean;
  result?: R;
  error?: string;
  duration: number;
  workerId: string;
}

export interface WorkerPoolOptions {
  maxWorkers?: number;
  taskTimeout?: number;
  idleTimeout?: number;
  retryAttempts?: number;
  enableMetrics?: boolean;
}

export interface WorkerMetrics {
  workerId: string;
  tasksCompleted: number;
  tasksSuccessful: number;
  tasksFailed: number;
  averageTaskDuration: number;
  totalDuration: number;
  memoryUsage: number;
  cpuUsage: number;
  isActive: boolean;
  lastTaskTime: Date;
}

export interface PoolMetrics {
  activeWorkers: number;
  totalWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDuration: number;
  throughput: number; // tasks per second
  memoryUsage: number;
  cpuUsage: number;
}

class WorkerInfo {
  id: string;
  worker: Worker;
  isActive: boolean = false;
  currentTask: Task | null = null;
  lastUsed: Date = new Date();
  metrics: WorkerMetrics;

  constructor(id: string, worker: Worker) {
    this.id = id;
    this.worker = worker;
    this.metrics = {
      workerId: id,
      tasksCompleted: 0,
      tasksSuccessful: 0,
      tasksFailed: 0,
      averageTaskDuration: 0,
      totalDuration: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      isActive: false,
      lastTaskTime: new Date()
    };
  }

  updateMetrics(duration: number, success: boolean, memoryUsage: number = 0): void {
    this.metrics.tasksCompleted++;
    this.metrics.totalDuration += duration;
    this.metrics.averageTaskDuration = this.metrics.totalDuration / this.metrics.tasksCompleted;
    this.metrics.lastTaskTime = new Date();
    this.metrics.memoryUsage = memoryUsage;

    if (success) {
      this.metrics.tasksSuccessful++;
    } else {
      this.metrics.tasksFailed++;
    }
  }
}

export class ParallelProcessingManager {
  private workers: Map<string, WorkerInfo> = new Map();
  private taskQueue: Task[] = [];
  private pendingTasks: Map<string, { resolve: Function; reject: Function; startTime: number }> = new Map();
  private options: Required<WorkerPoolOptions>;
  private isShuttingDown: boolean = false;
  private idleTimer: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private workerScript: string;

  constructor(options: WorkerPoolOptions = {}) {
    this.options = {
      maxWorkers: options.maxWorkers || Math.max(1, cpus().length - 1),
      taskTimeout: options.taskTimeout || 30000,
      idleTimeout: options.idleTimeout || 60000,
      retryAttempts: options.retryAttempts || 3,
      enableMetrics: options.enableMetrics ?? true
    };

    this.workerScript = this.createWorkerScript();
    
    if (this.options.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  // 작업 실행
  async executeTask<T, R>(task: Task<T, R>): Promise<R> {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }

    return new Promise<R>((resolve, reject) => {
      const timeout = task.timeout || this.options.taskTimeout;
      
      // 타임아웃 설정
      const timeoutId = setTimeout(() => {
        this.pendingTasks.delete(task.id);
        reject(new Error(`Task ${task.id} timed out after ${timeout}ms`));
      }, timeout);

      this.pendingTasks.set(task.id, {
        resolve: (result: R) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        startTime: Date.now()
      });

      // 큐에 추가
      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  // 배치 작업 실행
  async executeBatch<T, R>(tasks: Task<T, R>[]): Promise<TaskResult<R>[]> {
    const promises = tasks.map(task => 
      this.executeTask(task)
        .then(result => ({
          id: task.id,
          success: true,
          result,
          duration: 0,
          workerId: ''
        } as TaskResult<R>))
        .catch(error => ({
          id: task.id,
          success: false,
          error: error.message,
          duration: 0,
          workerId: ''
        } as TaskResult<R>))
    );

    return Promise.all(promises);
  }

  // 병렬 맵 처리
  async parallelMap<T, R>(
    items: T[],
    taskType: string,
    mapper: (item: T, index: number) => any,
    concurrency?: number
  ): Promise<R[]> {
    const maxConcurrency = concurrency || this.options.maxWorkers;
    const results: R[] = new Array(items.length);
    const tasks: Task[] = items.map((item, index) => ({
      id: `map_${Date.now()}_${index}`,
      type: taskType,
      data: { item, index, mapper: mapper.toString() }
    }));

    // 청크로 나누어 병렬 처리
    const chunks: Task[][] = [];
    for (let i = 0; i < tasks.length; i += maxConcurrency) {
      chunks.push(tasks.slice(i, i + maxConcurrency));
    }

    for (const chunk of chunks) {
      const chunkResults = await this.executeBatch(chunk);
      chunkResults.forEach((result, chunkIndex) => {
        const originalIndex = chunk[chunkIndex].data.index;
        if (result.success) {
          results[originalIndex] = result.result;
        } else {
          throw new Error(`Task failed for item ${originalIndex}: ${result.error}`);
        }
      });
    }

    return results;
  }

  // CPU 집약적 작업들
  async hashFiles(filePaths: string[]): Promise<{ path: string; hash: string }[]> {
    return this.parallelMap(filePaths, 'hash_file', (filePath: string) => filePath);
  }

  async compressFiles(
    filePaths: string[],
    outputDir: string,
    compressionLevel: number = 6
  ): Promise<{ input: string; output: string; ratio: number }[]> {
    return this.parallelMap(
      filePaths, 
      'compress_file', 
      (filePath: string) => ({ filePath, outputDir, compressionLevel })
    );
  }

  async analyzeCodeFiles(filePaths: string[]): Promise<any[]> {
    return this.parallelMap(filePaths, 'analyze_code', (filePath: string) => filePath);
  }

  async searchInFiles(
    filePaths: string[],
    pattern: string,
    options: any = {}
  ): Promise<any[]> {
    return this.parallelMap(
      filePaths,
      'search_in_file',
      (filePath: string) => ({ filePath, pattern, options })
    );
  }

  // 큐 처리
  private async processQueue(): Promise<void> {
    if (this.taskQueue.length === 0) {
      return;
    }

    // 우선순위 정렬
    this.taskQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // 사용 가능한 워커 찾기 또는 생성
    let worker = this.getAvailableWorker();
    if (!worker) {
      worker = await this.createWorker();
    }

    if (!worker) {
      // 모든 워커가 사용 중이면 잠시 대기
      setTimeout(() => this.processQueue(), 100);
      return;
    }

    const task = this.taskQueue.shift()!;
    await this.assignTaskToWorker(worker, task);

    // 큐에 더 많은 작업이 있으면 계속 처리
    if (this.taskQueue.length > 0) {
      setImmediate(() => this.processQueue());
    }
  }

  private getAvailableWorker(): WorkerInfo | null {
    for (const worker of this.workers.values()) {
      if (!worker.isActive) {
        return worker;
      }
    }
    return null;
  }

  private async createWorker(): Promise<WorkerInfo | null> {
    if (this.workers.size >= this.options.maxWorkers) {
      return null;
    }

    const workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const worker = new Worker(this.workerScript, {
        workerData: { workerId }
      });

      const workerInfo = new WorkerInfo(workerId, worker);
      this.workers.set(workerId, workerInfo);

      // 워커 이벤트 핸들러 설정
      worker.on('message', (message) => {
        this.handleWorkerMessage(workerId, message);
      });

      worker.on('error', (error) => {
        this.handleWorkerError(workerId, error);
      });

      worker.on('exit', (code) => {
        this.handleWorkerExit(workerId, code);
      });

      return workerInfo;
    } catch (error) {
      console.error(`Failed to create worker ${workerId}:`, error);
      return null;
    }
  }

  private async assignTaskToWorker(workerInfo: WorkerInfo, task: Task): Promise<void> {
    workerInfo.isActive = true;
    workerInfo.currentTask = task;
    workerInfo.lastUsed = new Date();

    try {
      workerInfo.worker.postMessage({
        type: 'task',
        task
      });
    } catch (error) {
      this.handleTaskError(task.id, error as Error, workerInfo.id);
    }
  }

  private handleWorkerMessage(workerId: string, message: any): void {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;

    if (message.type === 'task_completed') {
      const { taskId, result, duration, memoryUsage } = message;
      const pending = this.pendingTasks.get(taskId);
      
      if (pending) {
        workerInfo.updateMetrics(duration, true, memoryUsage);
        workerInfo.isActive = false;
        workerInfo.currentTask = null;
        
        this.pendingTasks.delete(taskId);
        pending.resolve(result);
      }
    } else if (message.type === 'task_failed') {
      const { taskId, error, duration } = message;
      this.handleTaskError(taskId, new Error(error), workerId, duration);
    }

    // 큐에 대기 중인 작업이 있으면 계속 처리
    if (this.taskQueue.length > 0) {
      setImmediate(() => this.processQueue());
    }
  }

  private handleWorkerError(workerId: string, error: Error): void {
    console.error(`Worker ${workerId} error:`, error);
    
    const workerInfo = this.workers.get(workerId);
    if (workerInfo && workerInfo.currentTask) {
      this.handleTaskError(workerInfo.currentTask.id, error, workerId);
    }
    
    this.removeWorker(workerId);
  }

  private handleWorkerExit(workerId: string, code: number): void {
    console.log(`Worker ${workerId} exited with code ${code}`);
    this.removeWorker(workerId);
  }

  private handleTaskError(taskId: string, error: Error, workerId: string, duration?: number): void {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.updateMetrics(duration || 0, false);
      workerInfo.isActive = false;
      workerInfo.currentTask = null;
    }

    const pending = this.pendingTasks.get(taskId);
    if (pending) {
      this.pendingTasks.delete(taskId);
      pending.reject(error);
    }
  }

  private removeWorker(workerId: string): void {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.worker.terminate();
      this.workers.delete(workerId);
    }
  }

  // 통계 수집
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 5000); // 5초마다 메트릭 수집
  }

  private collectMetrics(): void {
    // 메모리 사용량 수집
    const memUsage = process.memoryUsage();
    
    // 각 워커의 메트릭 업데이트
    for (const workerInfo of this.workers.values()) {
      workerInfo.metrics.isActive = workerInfo.isActive;
      // CPU 사용량은 별도 모니터링 도구 필요
    }
  }

  // 풀 통계 조회
  getPoolMetrics(): PoolMetrics {
    const workerMetrics = Array.from(this.workers.values()).map(w => w.metrics);
    const completedTasks = workerMetrics.reduce((sum, m) => sum + m.tasksCompleted, 0);
    const failedTasks = workerMetrics.reduce((sum, m) => sum + m.tasksFailed, 0);
    const totalDuration = workerMetrics.reduce((sum, m) => sum + m.totalDuration, 0);

    return {
      activeWorkers: Array.from(this.workers.values()).filter(w => w.isActive).length,
      totalWorkers: this.workers.size,
      queuedTasks: this.taskQueue.length,
      completedTasks,
      failedTasks,
      averageTaskDuration: completedTasks > 0 ? totalDuration / completedTasks : 0,
      throughput: completedTasks / (Date.now() / 1000), // rough calculation
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: 0 // Would need separate monitoring
    };
  }

  // 개별 워커 통계 조회
  getWorkerMetrics(workerId?: string): WorkerMetrics | WorkerMetrics[] {
    if (workerId) {
      const worker = this.workers.get(workerId);
      return worker ? worker.metrics : null;
    }
    return Array.from(this.workers.values()).map(w => w.metrics);
  }

  // 워커 스크립트 생성
  private createWorkerScript(): string {
    const workerCode = `
const { parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const deflate = promisify(zlib.deflate);

const workerId = workerData.workerId;

// 작업 처리 함수들
const taskHandlers = {
  async hash_file(data) {
    const { item: filePath } = data;
    const content = await fs.readFile(filePath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return { path: filePath, hash };
  },

  async compress_file(data) {
    const { item } = data;
    const { filePath, outputDir, compressionLevel } = item;
    
    const content = await fs.readFile(filePath);
    const compressed = await gzip(content, { level: compressionLevel });
    
    const outputPath = path.join(outputDir, path.basename(filePath) + '.gz');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, compressed);
    
    const ratio = content.length / compressed.length;
    return { input: filePath, output: outputPath, ratio };
  },

  async analyze_code(data) {
    const { item: filePath } = data;
    const content = await fs.readFile(filePath, 'utf-8');
    
    // 간단한 코드 분석
    const lines = content.split('\\n');
    const analysis = {
      file: filePath,
      lines: lines.length,
      nonEmptyLines: lines.filter(line => line.trim().length > 0).length,
      functions: (content.match(/function\\s+\\w+/g) || []).length,
      classes: (content.match(/class\\s+\\w+/g) || []).length,
      imports: (content.match(/import\\s+.*from/g) || []).length,
      exports: (content.match(/export\\s+/g) || []).length
    };
    
    return analysis;
  },

  async search_in_file(data) {
    const { item } = data;
    const { filePath, pattern, options } = item;
    
    const content = await fs.readFile(filePath, 'utf-8');
    const regex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
    const matches = [];
    
    const lines = content.split('\\n');
    lines.forEach((line, index) => {
      let match;
      while ((match = regex.exec(line)) !== null) {
        matches.push({
          line: index + 1,
          column: match.index,
          text: match[0],
          context: line.trim()
        });
      }
    });
    
    return { file: filePath, matches };
  }
};

// 메시지 핸들러
parentPort.on('message', async (message) => {
  if (message.type === 'task') {
    const { task } = message;
    const startTime = Date.now();
    
    try {
      const handler = taskHandlers[task.type];
      if (!handler) {
        throw new Error(\`Unknown task type: \${task.type}\`);
      }
      
      const result = await handler(task.data);
      const duration = Date.now() - startTime;
      const memoryUsage = process.memoryUsage().heapUsed;
      
      parentPort.postMessage({
        type: 'task_completed',
        taskId: task.id,
        result,
        duration,
        memoryUsage
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      parentPort.postMessage({
        type: 'task_failed',
        taskId: task.id,
        error: error.message,
        duration
      });
    }
  }
});

// 워커 준비 완료 신호
parentPort.postMessage({
  type: 'worker_ready',
  workerId
});
`;

    const workerPath = path.join(__dirname, 'parallelWorker.js');
    fs.writeFile(workerPath, workerCode).catch(console.error);
    return workerPath;
  }

  // 정리
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // 메트릭 수집 중지
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // 모든 워커 종료
    const workers = Array.from(this.workers.values());
    await Promise.all(workers.map(workerInfo => workerInfo.worker.terminate()));
    
    this.workers.clear();
    this.taskQueue.length = 0;
    this.pendingTasks.clear();
  }
}

export default ParallelProcessingManager;