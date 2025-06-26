#!/usr/bin/env node

import E2ETestSuites from './E2ETestSuites.js';
import { performance } from 'perf_hooks';

async function main() {
  console.log('🚀 AI FileSystem MCP - End-to-End Tests');
  console.log('========================================\n');

  const startTime = performance.now();
  
  try {
    const e2eTests = new E2ETestSuites();
    await e2eTests.runAllE2ETests();
    
    const duration = performance.now() - startTime;
    console.log(`\n✨ E2E Tests completed successfully in ${(duration / 1000).toFixed(2)}s`);
    
  } catch (error) {
    console.error('❌ E2E Tests failed:', error);
    process.exit(1);
  }
}

// 스크립트로 직접 실행된 경우
if (require.main === module) {
  main().catch(console.error);
}

export { main };