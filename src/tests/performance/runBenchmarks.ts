#!/usr/bin/env node

import PerformanceBenchmark, { BenchmarkOptions } from './PerformanceBenchmark.js';

async function main() {
  const args = process.argv.slice(2);
  
  // 옵션 파싱
  const options: BenchmarkOptions = {
    iterations: 1000,
    warmupIterations: 100,
    concurrency: 10,
    dataSize: 1024 * 1024, // 1MB
    enableMemoryProfiling: true,
    enableCpuProfiling: false,
    outputFile: './benchmark-results.json'
  };

  // 명령행 인수 처리
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    switch (key) {
      case '--iterations':
        options.iterations = parseInt(value);
        break;
      case '--warmup':
        options.warmupIterations = parseInt(value);
        break;
      case '--concurrency':
        options.concurrency = parseInt(value);
        break;
      case '--data-size':
        options.dataSize = parseInt(value);
        break;
      case '--output':
        options.outputFile = value;
        break;
      case '--no-memory-profiling':
        options.enableMemoryProfiling = false;
        i--; // 값이 없는 플래그
        break;
      case '--cpu-profiling':
        options.enableCpuProfiling = true;
        i--; // 값이 없는 플래그
        break;
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  console.log('🚀 AI FileSystem MCP Performance Benchmarks');
  console.log('============================================\n');
  console.log('Configuration:');
  console.log(`  Iterations: ${options.iterations}`);
  console.log(`  Warmup Iterations: ${options.warmupIterations}`);
  console.log(`  Concurrency: ${options.concurrency}`);
  console.log(`  Data Size: ${(options.dataSize! / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  Memory Profiling: ${options.enableMemoryProfiling ? '✅' : '❌'}`);
  console.log(`  CPU Profiling: ${options.enableCpuProfiling ? '✅' : '❌'}`);
  console.log(`  Output File: ${options.outputFile}\n`);

  try {
    const benchmark = new PerformanceBenchmark(options);
    
    // 진행 상황 리스너
    benchmark.on('suite_started', (suiteName) => {
      console.log(`📦 Starting ${suiteName}...`);
    });
    
    benchmark.on('suite_completed', (suiteName, summary) => {
      console.log(`✅ ${suiteName} completed:`);
      console.log(`   Average Throughput: ${summary.averageThroughput.toFixed(2)} ops/sec`);
      console.log(`   Total Duration: ${summary.totalDuration.toFixed(2)}ms`);
      console.log(`   Error Rate: ${(summary.averageErrorRate * 100).toFixed(2)}%\n`);
    });

    const startTime = Date.now();
    const results = await benchmark.runAllBenchmarks();
    const totalTime = Date.now() - startTime;

    // 결과 요약 출력
    console.log('\n📊 Benchmark Results Summary');
    console.log('============================');
    console.log(`Total Execution Time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`Total Suites: ${results.length}`);
    console.log(`Total Benchmarks: ${results.reduce((sum, suite) => sum + suite.results.length, 0)}`);
    
    console.log('\n🏆 Top Performers:');
    const allResults = results.flatMap(suite => 
      suite.results.map(result => ({
        name: `${suite.name} - ${result.name}`,
        throughput: result.throughput
      }))
    );
    
    allResults
      .sort((a, b) => b.throughput - a.throughput)
      .slice(0, 5)
      .forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.name}: ${result.throughput.toFixed(2)} ops/sec`);
      });

    console.log('\n⚠️ Performance Concerns:');
    const slowResults = allResults.filter(r => r.throughput < 100);
    if (slowResults.length === 0) {
      console.log('   None detected! 🎉');
    } else {
      slowResults.forEach(result => {
        console.log(`   - ${result.name}: ${result.throughput.toFixed(2)} ops/sec`);
      });
    }

    console.log(`\n📄 Detailed results saved to: ${options.outputFile}`);
    console.log('\n✨ Benchmarks completed successfully!');
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
AI FileSystem MCP Performance Benchmarks

Usage: node runBenchmarks.js [options]

Options:
  --iterations <number>      Number of iterations per benchmark (default: 1000)
  --warmup <number>         Number of warmup iterations (default: 100)
  --concurrency <number>    Concurrency level for parallel tests (default: 10)
  --data-size <bytes>       Test data size in bytes (default: 1048576)
  --output <file>           Output file for results (default: ./benchmark-results.json)
  --no-memory-profiling     Disable memory profiling
  --cpu-profiling           Enable CPU profiling
  --help                    Show this help message

Examples:
  node runBenchmarks.js --iterations 5000 --concurrency 20
  node runBenchmarks.js --data-size 10485760 --output ./results.json
  node runBenchmarks.js --no-memory-profiling --cpu-profiling
`);
}

// 스크립트로 직접 실행된 경우
if (require.main === module) {
  main().catch(console.error);
}

export { main };