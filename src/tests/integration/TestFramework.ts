import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { performance } from 'perf_hooks';

export interface TestCase {
  name: string;
  description: string;
  timeout?: number;
  skip?: boolean;
  only?: boolean;
  execute(): Promise<TestResult>;
}

export interface TestSuite {
  name: string;
  description: string;
  setup?(): Promise<void>;
  teardown?(): Promise<void>;
  beforeEach?(): Promise<void>;
  afterEach?(): Promise<void>;
  tests: TestCase[];
}

export interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: Error;
  output?: string;
  metadata?: Record<string, any>;
}

export interface TestSuiteResult {
  suite: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

export interface TestConfiguration {
  timeout: number;
  retries: number;
  parallel: boolean;
  maxConcurrency: number;
  outputDir: string;
  generateReport: boolean;
  verbose: boolean;
}

export interface MockMCPServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  execute(command: string, args: any): Promise<any>;
  getMetrics(): ServerMetrics;
}

export interface ServerMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorCount: number;
  memoryUsage: number;
}

export class TestFramework extends EventEmitter {
  private config: TestConfiguration;
  private suites: TestSuite[] = [];
  private results: TestSuiteResult[] = [];
  private mockServer?: MockMCPServer;
  private testDataPath: string;

  constructor(config: Partial<TestConfiguration> = {}) {
    super();
    
    this.config = {
      timeout: config.timeout || 30000,
      retries: config.retries || 0,
      parallel: config.parallel ?? false,
      maxConcurrency: config.maxConcurrency || 5,
      outputDir: config.outputDir || './test-output',
      generateReport: config.generateReport ?? true,
      verbose: config.verbose ?? true
    };

    this.testDataPath = path.join(__dirname, '../../../test-data');
  }

  // 테스트 스위트 등록
  addSuite(suite: TestSuite): void {
    this.suites.push(suite);
    this.emit('suite_registered', suite.name);
  }

  // 모든 테스트 실행
  async runAll(): Promise<TestSuiteResult[]> {
    console.log('🧪 Starting Test Framework...\n');
    
    await this.setupTestEnvironment();
    
    try {
      if (this.config.parallel) {
        await this.runSuitesParallel();
      } else {
        await this.runSuitesSequential();
      }
    } finally {
      await this.teardownTestEnvironment();
    }

    if (this.config.generateReport) {
      await this.generateReport();
    }

    this.printSummary();
    return this.results;
  }

  // 특정 스위트 실행
  async runSuite(suiteName: string): Promise<TestSuiteResult | null> {
    const suite = this.suites.find(s => s.name === suiteName);
    if (!suite) {
      throw new Error(`Test suite '${suiteName}' not found`);
    }

    await this.setupTestEnvironment();
    
    try {
      const result = await this.executeSuite(suite);
      this.results.push(result);
      return result;
    } finally {
      await this.teardownTestEnvironment();
    }
  }

  // 순차 실행
  private async runSuitesSequential(): Promise<void> {
    for (const suite of this.suites) {
      const result = await this.executeSuite(suite);
      this.results.push(result);
    }
  }

  // 병렬 실행
  private async runSuitesParallel(): Promise<void> {
    const chunks: TestSuite[][] = [];
    for (let i = 0; i < this.suites.length; i += this.config.maxConcurrency) {
      chunks.push(this.suites.slice(i, i + this.config.maxConcurrency));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(suite => this.executeSuite(suite));
      const results = await Promise.all(promises);
      this.results.push(...results);
    }
  }

  // 스위트 실행
  private async executeSuite(suite: TestSuite): Promise<TestSuiteResult> {
    console.log(`📦 Running suite: ${suite.name}`);
    const startTime = performance.now();

    let results: TestResult[] = [];

    try {
      // Setup
      if (suite.setup) {
        await suite.setup();
      }

      // Run tests
      for (const test of suite.tests) {
        if (test.skip) {
          results.push({
            name: test.name,
            success: true,
            duration: 0,
            output: 'SKIPPED'
          });
          continue;
        }

        if (suite.beforeEach) {
          await suite.beforeEach();
        }

        const testResult = await this.executeTest(test);
        results.push(testResult);

        if (suite.afterEach) {
          await suite.afterEach();
        }

        // Only 모드 체크
        if (test.only) {
          break;
        }
      }

    } catch (error) {
      console.error(`Suite setup/teardown failed: ${error}`);
    } finally {
      // Teardown
      if (suite.teardown) {
        try {
          await suite.teardown();
        } catch (error) {
          console.error(`Suite teardown failed: ${error}`);
        }
      }
    }

    const duration = performance.now() - startTime;
    const summary = {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success && r.output !== 'SKIPPED').length,
      skipped: results.filter(r => r.output === 'SKIPPED').length,
      duration
    };

    const suiteResult: TestSuiteResult = {
      suite: suite.name,
      results,
      summary
    };

    console.log(`  ✅ ${summary.passed} passed, ❌ ${summary.failed} failed, ⏭️ ${summary.skipped} skipped (${duration.toFixed(2)}ms)\n`);
    
    this.emit('suite_completed', suiteResult);
    return suiteResult;
  }

  // 개별 테스트 실행
  private async executeTest(test: TestCase): Promise<TestResult> {
    const startTime = performance.now();
    let retries = this.config.retries;

    while (retries >= 0) {
      try {
        // 타임아웃 설정
        const timeout = test.timeout || this.config.timeout;
        const result = await Promise.race([
          test.execute(),
          this.createTimeoutPromise(timeout, test.name)
        ]);

        const duration = performance.now() - startTime;
        
        if (this.config.verbose) {
          console.log(`    ✅ ${test.name} (${duration.toFixed(2)}ms)`);
        }

        this.emit('test_passed', test.name, duration);
        return {
          ...result,
          duration
        };

      } catch (error) {
        if (retries > 0) {
          retries--;
          console.log(`    🔄 Retrying ${test.name} (${retries} attempts left)`);
          continue;
        }

        const duration = performance.now() - startTime;
        
        if (this.config.verbose) {
          console.log(`    ❌ ${test.name} (${duration.toFixed(2)}ms)`);
          console.log(`       Error: ${error instanceof Error ? error.message : error}`);
        }

        this.emit('test_failed', test.name, error, duration);
        return {
          name: test.name,
          success: false,
          duration,
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }

    throw new Error('Should not reach here');
  }

  // 타임아웃 프로미스
  private createTimeoutPromise(timeout: number, testName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Test '${testName}' timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  // 테스트 환경 설정
  private async setupTestEnvironment(): Promise<void> {
    // 테스트 데이터 디렉토리 생성
    await fs.mkdir(this.testDataPath, { recursive: true });
    await fs.mkdir(this.config.outputDir, { recursive: true });

    // Mock MCP 서버 시작
    this.mockServer = new MockMCPServerImpl();
    await this.mockServer.start();

    this.emit('environment_setup');
  }

  // 테스트 환경 정리
  private async teardownTestEnvironment(): Promise<void> {
    // Mock 서버 중지
    if (this.mockServer) {
      await this.mockServer.stop();
    }

    // 테스트 데이터 정리
    try {
      await fs.rmdir(this.testDataPath, { recursive: true });
    } catch (error) {
      // 정리 실패는 무시
    }

    this.emit('environment_teardown');
  }

  // 테스트 보고서 생성
  private async generateReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: this.config,
      results: this.results,
      summary: this.calculateOverallSummary()
    };

    const reportPath = path.join(this.config.outputDir, 'test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // HTML 보고서도 생성
    const htmlReport = this.generateHtmlReport(report);
    const htmlPath = path.join(this.config.outputDir, 'test-report.html');
    await fs.writeFile(htmlPath, htmlReport);

    console.log(`📊 Test report generated: ${reportPath}`);
  }

  // 전체 요약 계산
  private calculateOverallSummary() {
    const allResults = this.results.flatMap(suite => suite.results);
    
    return {
      totalSuites: this.results.length,
      totalTests: allResults.length,
      passed: allResults.filter(r => r.success).length,
      failed: allResults.filter(r => !r.success && r.output !== 'SKIPPED').length,
      skipped: allResults.filter(r => r.output === 'SKIPPED').length,
      duration: this.results.reduce((sum, suite) => sum + suite.summary.duration, 0)
    };
  }

  // 요약 출력
  private printSummary(): void {
    const summary = this.calculateOverallSummary();
    
    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log(`Total Suites: ${summary.totalSuites}`);
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏭️ Skipped: ${summary.skipped}`);
    console.log(`⏱️ Duration: ${(summary.duration / 1000).toFixed(2)}s\n`);

    if (summary.failed > 0) {
      console.log('❌ Some tests failed!');
      process.exitCode = 1;
    } else {
      console.log('✅ All tests passed!');
    }
  }

  // HTML 보고서 생성
  private generateHtmlReport(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .suite { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .suite-header { background: #e9e9e9; padding: 10px; font-weight: bold; }
        .test { padding: 8px; border-bottom: 1px solid #eee; }
        .passed { color: green; }
        .failed { color: red; }
        .skipped { color: orange; }
    </style>
</head>
<body>
    <h1>Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Generated: ${report.timestamp}</p>
        <p>Total Suites: ${report.summary.totalSuites}</p>
        <p>Total Tests: ${report.summary.totalTests}</p>
        <p>Passed: <span class="passed">${report.summary.passed}</span></p>
        <p>Failed: <span class="failed">${report.summary.failed}</span></p>
        <p>Skipped: <span class="skipped">${report.summary.skipped}</span></p>
        <p>Duration: ${(report.summary.duration / 1000).toFixed(2)}s</p>
    </div>
    
    ${report.results.map((suite: TestSuiteResult) => `
        <div class="suite">
            <div class="suite-header">${suite.suite}</div>
            ${suite.results.map((test: TestResult) => `
                <div class="test ${test.success ? 'passed' : test.output === 'SKIPPED' ? 'skipped' : 'failed'}">
                    ${test.name} (${test.duration.toFixed(2)}ms)
                    ${test.error ? `<br><small>${test.error.message}</small>` : ''}
                </div>
            `).join('')}
        </div>
    `).join('')}
</body>
</html>`;
  }

  // 유틸리티 메서드들
  async createTestFile(name: string, content: string): Promise<string> {
    const filePath = path.join(this.testDataPath, name);
    await fs.writeFile(filePath, content);
    return filePath;
  }

  async cleanupTestFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // 파일이 없으면 무시
    }
  }

  getMockServer(): MockMCPServer | undefined {
    return this.mockServer;
  }
}

// Mock MCP 서버 구현
class MockMCPServerImpl implements MockMCPServer {
  private isRunning = false;
  private metrics: ServerMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    errorCount: 0,
    memoryUsage: 0
  };

  async start(): Promise<void> {
    this.isRunning = true;
    console.log('🔧 Mock MCP Server started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('🔧 Mock MCP Server stopped');
  }

  async execute(command: string, args: any): Promise<any> {
    if (!this.isRunning) {
      throw new Error('Server is not running');
    }

    const startTime = performance.now();
    this.metrics.requestCount++;

    try {
      // 실제 명령어 실행 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      const duration = performance.now() - startTime;
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime + duration) / this.metrics.requestCount;

      return {
        command,
        args,
        result: `Mock result for ${command}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  getMetrics(): ServerMetrics {
    this.metrics.memoryUsage = process.memoryUsage().heapUsed;
    return { ...this.metrics };
  }
}

export default TestFramework;