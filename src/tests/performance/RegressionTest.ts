import PerformanceBenchmark, { BenchmarkOptions, BenchmarkResult } from './PerformanceBenchmark.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface PerformanceBaseline {
  version: string;
  timestamp: string;
  benchmarks: Record<string, BenchmarkMetrics>;
}

export interface BenchmarkMetrics {
  throughput: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  memoryUsage: number;
  errorRate: number;
}

export interface RegressionResult {
  benchmark: string;
  baseline: BenchmarkMetrics;
  current: BenchmarkMetrics;
  regression: {
    throughput: number; // percentage change
    latency: number;
    memory: number;
    errorRate: number;
  };
  isRegression: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RegressionTestConfig {
  baselineFile: string;
  thresholds: {
    throughput: number; // -10% threshold
    latency: number;    // +20% threshold
    memory: number;     // +30% threshold
    errorRate: number;  // +5% threshold
  };
  benchmarkOptions: BenchmarkOptions;
}

export class RegressionTest {
  private config: RegressionTestConfig;
  private baseline: PerformanceBaseline | null = null;

  constructor(config: Partial<RegressionTestConfig> = {}) {
    this.config = {
      baselineFile: config.baselineFile || './performance-baseline.json',
      thresholds: {
        throughput: config.thresholds?.throughput || -10,
        latency: config.thresholds?.latency || 20,
        memory: config.thresholds?.memory || 30,
        errorRate: config.thresholds?.errorRate || 5,
        ...config.thresholds
      },
      benchmarkOptions: {
        iterations: 500,
        warmupIterations: 50,
        concurrency: 5,
        dataSize: 512 * 1024, // 512KB
        enableMemoryProfiling: true,
        ...config.benchmarkOptions
      }
    };
  }

  // 성능 회귀 테스트 실행
  async runRegressionTest(): Promise<RegressionResult[]> {
    console.log('🔍 Running Performance Regression Test...\n');

    // 베이스라인 로드
    await this.loadBaseline();

    // 현재 성능 벤치마크 실행
    const currentResults = await this.runCurrentBenchmarks();

    // 회귀 분석
    const regressionResults = this.analyzeRegression(currentResults);

    // 결과 보고
    this.reportRegressionResults(regressionResults);

    // 새 베이스라인 업데이트 (회귀가 없는 경우)
    if (!this.hasSignificantRegression(regressionResults)) {
      await this.updateBaseline(currentResults);
    }

    return regressionResults;
  }

  // 베이스라인 생성
  async createBaseline(version: string): Promise<void> {
    console.log(`📊 Creating performance baseline for version ${version}...\n`);

    const benchmarkResults = await this.runCurrentBenchmarks();
    
    const baseline: PerformanceBaseline = {
      version,
      timestamp: new Date().toISOString(),
      benchmarks: benchmarkResults
    };

    await fs.writeFile(this.config.baselineFile, JSON.stringify(baseline, null, 2));
    console.log(`✅ Baseline created: ${this.config.baselineFile}`);
  }

  // 베이스라인 로드
  private async loadBaseline(): Promise<void> {
    try {
      const baselineData = await fs.readFile(this.config.baselineFile, 'utf-8');
      this.baseline = JSON.parse(baselineData);
      console.log(`📋 Loaded baseline from ${this.config.baselineFile}`);
      console.log(`   Version: ${this.baseline!.version}`);
      console.log(`   Created: ${this.baseline!.timestamp}\n`);
    } catch (error) {
      throw new Error(`Failed to load baseline: ${this.config.baselineFile}. Create baseline first.`);
    }
  }

  // 현재 벤치마크 실행
  private async runCurrentBenchmarks(): Promise<Record<string, BenchmarkMetrics>> {
    const benchmark = new PerformanceBenchmark(this.config.benchmarkOptions);
    const suites = await benchmark.runAllBenchmarks();

    const results: Record<string, BenchmarkMetrics> = {};

    for (const suite of suites) {
      for (const result of suite.results) {
        const metrics = this.extractMetrics(result);
        results[`${suite.name} - ${result.name}`] = metrics;
      }
    }

    return results;
  }

  // 벤치마크 결과에서 메트릭 추출
  private extractMetrics(result: BenchmarkResult): BenchmarkMetrics {
    return {
      throughput: result.throughput,
      averageLatency: result.duration / result.operations,
      p95Latency: result.duration / result.operations * 1.5, // 추정값
      p99Latency: result.duration / result.operations * 2.0, // 추정값
      memoryUsage: result.memoryUsage.peak - result.memoryUsage.before,
      errorRate: result.errorRate
    };
  }

  // 회귀 분석
  private analyzeRegression(currentResults: Record<string, BenchmarkMetrics>): RegressionResult[] {
    if (!this.baseline) {
      throw new Error('Baseline not loaded');
    }

    const regressionResults: RegressionResult[] = [];

    for (const [benchmarkName, currentMetrics] of Object.entries(currentResults)) {
      const baselineMetrics = this.baseline.benchmarks[benchmarkName];
      
      if (!baselineMetrics) {
        console.log(`⚠️ No baseline found for ${benchmarkName}, skipping`);
        continue;
      }

      const regression = this.calculateRegression(baselineMetrics, currentMetrics);
      const isRegression = this.isSignificantRegression(regression);
      const severity = this.calculateSeverity(regression);

      regressionResults.push({
        benchmark: benchmarkName,
        baseline: baselineMetrics,
        current: currentMetrics,
        regression,
        isRegression,
        severity
      });
    }

    return regressionResults;
  }

  // 회귀 계산
  private calculateRegression(
    baseline: BenchmarkMetrics, 
    current: BenchmarkMetrics
  ): RegressionResult['regression'] {
    return {
      throughput: ((current.throughput - baseline.throughput) / baseline.throughput) * 100,
      latency: ((current.averageLatency - baseline.averageLatency) / baseline.averageLatency) * 100,
      memory: ((current.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage) * 100,
      errorRate: ((current.errorRate - baseline.errorRate) / Math.max(baseline.errorRate, 0.001)) * 100
    };
  }

  // 의미있는 회귀인지 판단
  private isSignificantRegression(regression: RegressionResult['regression']): boolean {
    return (
      regression.throughput < this.config.thresholds.throughput ||
      regression.latency > this.config.thresholds.latency ||
      regression.memory > this.config.thresholds.memory ||
      regression.errorRate > this.config.thresholds.errorRate
    );
  }

  // 심각도 계산
  private calculateSeverity(regression: RegressionResult['regression']): RegressionResult['severity'] {
    const maxRegression = Math.max(
      Math.abs(regression.throughput),
      Math.abs(regression.latency),
      Math.abs(regression.memory),
      Math.abs(regression.errorRate)
    );

    if (maxRegression > 50) return 'critical';
    if (maxRegression > 30) return 'high';
    if (maxRegression > 15) return 'medium';
    return 'low';
  }

  // 전체적으로 의미있는 회귀가 있는지 확인
  private hasSignificantRegression(results: RegressionResult[]): boolean {
    return results.some(result => result.isRegression && result.severity !== 'low');
  }

  // 회귀 결과 보고
  private reportRegressionResults(results: RegressionResult[]): void {
    console.log('\n🔍 Performance Regression Analysis');
    console.log('==================================\n');

    const regressions = results.filter(r => r.isRegression);
    const improvements = results.filter(r => !r.isRegression && r.regression.throughput > 5);

    if (regressions.length === 0) {
      console.log('✅ No significant performance regressions detected!\n');
    } else {
      console.log(`❌ Found ${regressions.length} performance regressions:\n`);
      
      regressions.forEach(result => {
        console.log(`🔴 ${result.benchmark} [${result.severity.toUpperCase()}]`);
        console.log(`   Throughput: ${result.regression.throughput.toFixed(2)}% (${this.formatChange(result.regression.throughput)})`);
        console.log(`   Latency: ${result.regression.latency.toFixed(2)}% (${this.formatChange(result.regression.latency)})`);
        console.log(`   Memory: ${result.regression.memory.toFixed(2)}% (${this.formatChange(result.regression.memory)})`);
        console.log(`   Error Rate: ${result.regression.errorRate.toFixed(2)}% (${this.formatChange(result.regression.errorRate)})`);
        console.log();
      });
    }

    if (improvements.length > 0) {
      console.log(`🎉 Performance improvements detected:\n`);
      
      improvements.forEach(result => {
        console.log(`🟢 ${result.benchmark}`);
        console.log(`   Throughput improved by ${result.regression.throughput.toFixed(2)}%`);
        console.log();
      });
    }

    // 요약 통계
    console.log('📊 Summary:');
    console.log(`   Total benchmarks: ${results.length}`);
    console.log(`   Regressions: ${regressions.length}`);
    console.log(`   Improvements: ${improvements.length}`);
    console.log(`   Stable: ${results.length - regressions.length - improvements.length}`);

    const criticalRegressions = regressions.filter(r => r.severity === 'critical').length;
    const highRegressions = regressions.filter(r => r.severity === 'high').length;
    
    if (criticalRegressions > 0) {
      console.log(`   🚨 Critical regressions: ${criticalRegressions}`);
    }
    if (highRegressions > 0) {
      console.log(`   ⚠️ High regressions: ${highRegressions}`);
    }

    console.log();
  }

  // 변화량 포맷팅
  private formatChange(percentage: number): string {
    if (percentage > 0) {
      return `+${percentage.toFixed(2)}%`;
    } else {
      return `${percentage.toFixed(2)}%`;
    }
  }

  // 베이스라인 업데이트
  private async updateBaseline(currentResults: Record<string, BenchmarkMetrics>): Promise<void> {
    if (!this.baseline) {
      return;
    }

    // 현재 버전을 새 베이스라인으로 업데이트
    const newBaseline: PerformanceBaseline = {
      version: `${this.baseline.version}-updated`,
      timestamp: new Date().toISOString(),
      benchmarks: currentResults
    };

    await fs.writeFile(this.config.baselineFile, JSON.stringify(newBaseline, null, 2));
    console.log(`✅ Baseline updated: ${this.config.baselineFile}`);
  }

  // 임계값 설정
  setThresholds(thresholds: Partial<RegressionTestConfig['thresholds']>): void {
    this.config.thresholds = { ...this.config.thresholds, ...thresholds };
  }

  // 베이스라인 정보 조회
  getBaselineInfo(): PerformanceBaseline | null {
    return this.baseline;
  }

  // 상세 보고서 생성
  async generateDetailedReport(results: RegressionResult[], outputPath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      baseline: this.baseline,
      currentResults: results,
      summary: {
        totalBenchmarks: results.length,
        regressions: results.filter(r => r.isRegression).length,
        improvements: results.filter(r => !r.isRegression && r.regression.throughput > 5).length,
        criticalIssues: results.filter(r => r.severity === 'critical').length
      },
      config: this.config
    };

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed regression report saved: ${outputPath}`);
  }
}

export default RegressionTest;