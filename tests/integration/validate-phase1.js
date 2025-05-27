#!/usr/bin/env node
/**
 * Phase 1 실시간 검증 스크립트
 * 각 명령어가 실제로 작동하는지 빠르게 확인
 */

import { execSync } from 'child_process';
import { createCommandRegistry } from './dist/core/commands/index.js';
import { FileSystemManager } from './dist/core/FileSystemManager.js';
import fs from 'fs/promises';
import path from 'path';

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

const TEST_DIR = './phase1-validation';

async function setup() {
  console.log(`${colors.blue}🔧 Setting up test environment...${colors.reset}`);
  
  // 테스트 디렉토리 생성
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.writeFile(path.join(TEST_DIR, 'sample.txt'), 'This is a test file for Phase 1 validation.');
  await fs.writeFile(path.join(TEST_DIR, 'sample.js'), 'function hello() { return "world"; }');
  
  console.log(`${colors.green}✅ Test environment ready${colors.reset}\n`);
}

async function cleanup() {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch (e) {
    // Ignore
  }
}

async function testCommand(category, name, args, validate) {
  process.stdout.write(`  ${name.padEnd(25)}`);
  
  const registry = createCommandRegistry();
  const fsManager = new FileSystemManager();
  
  try {
    const startTime = Date.now();
    const result = await registry.execute(name, { args, fsManager });
    const duration = Date.now() - startTime;
    
    // 결과 검증
    let isValid = true;
    if (validate) {
      isValid = await validate(result);
    }
    
    if (isValid) {
      console.log(`${colors.green}✅ PASS${colors.reset} ${colors.gray}(${duration}ms)${colors.reset}`);
      return { status: 'pass', duration };
    } else {
      console.log(`${colors.red}❌ FAIL${colors.reset} - Invalid result`);
      return { status: 'fail', error: 'Invalid result' };
    }
  } catch (error) {
    console.log(`${colors.red}❌ ERROR${colors.reset} - ${error.message}`);
    return { status: 'error', error: error.message };
  }
}

async function main() {
  console.log(`${colors.blue}╔══════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║     Phase 1 Command Validation Test      ║${colors.reset}`);
  console.log(`${colors.blue}╚══════════════════════════════════════════╝${colors.reset}\n`);
  
  // 빌드 먼저
  console.log(`${colors.yellow}📦 Building project...${colors.reset}`);
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log(`${colors.green}✅ Build successful${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}❌ Build failed!${colors.reset}`);
    process.exit(1);
  }
  
  await setup();
  
  const categories = [
    {
      name: '📁 File Operations',
      tests: [
        ['read_file', { path: path.join(TEST_DIR, 'sample.txt') }, 
          (r) => r.content[0].text.includes('test file')],
        ['write_file', { path: path.join(TEST_DIR, 'new.txt'), content: 'Hello Phase 1!' }, 
          async () => (await fs.readFile(path.join(TEST_DIR, 'new.txt'), 'utf-8')) === 'Hello Phase 1!'],
        ['update_file', { path: path.join(TEST_DIR, 'sample.txt'), updates: [{oldText: 'test', newText: 'TEST'}] },
          async () => (await fs.readFile(path.join(TEST_DIR, 'sample.txt'), 'utf-8')).includes('TEST')],
        ['get_file_metadata', { path: path.join(TEST_DIR, 'sample.txt') },
          (r) => r.content[0].text.toLowerCase().includes('size')],
        ['get_directory_tree', { path: TEST_DIR, maxDepth: 2 },
          (r) => r.content[0].text.includes('sample.txt')]
      ]
    },
    {
      name: '🔍 Search Operations',
      tests: [
        ['search_files', { pattern: '*.txt', directory: TEST_DIR }],
        ['search_content', { pattern: 'test', directory: TEST_DIR, filePattern: '*.txt' }],
        ['fuzzy_search', { pattern: 'sampl', directory: TEST_DIR, threshold: 0.7 }]
      ]
    },
    {
      name: '🔬 Code Analysis',
      tests: [
        ['analyze_code', { path: path.join(TEST_DIR, 'sample.js') },
          (r) => r.content[0].text.toLowerCase().includes('function')],
        ['analyze_code_quality', { path: path.join(TEST_DIR, 'sample.js') }]
      ]
    },
    {
      name: '🔐 Security',
      tests: [
        ['scan_secrets', { directory: TEST_DIR }],
        ['change_permissions', { path: path.join(TEST_DIR, 'sample.txt'), permissions: '644' }]
      ]
    },
    {
      name: '📦 Archive Operations',
      tests: [
        ['compress_files', { 
          files: [path.join(TEST_DIR, 'sample.txt')], 
          outputPath: path.join(TEST_DIR, 'archive.zip') 
        }],
        ['extract_archive', { 
          archivePath: path.join(TEST_DIR, 'archive.zip'), 
          destination: path.join(TEST_DIR, 'extracted') 
        }]
      ]
    }
  ];
  
  const results = { total: 0, passed: 0, failed: 0, errors: 0 };
  
  for (const category of categories) {
    console.log(`\n${category.name}`);
    console.log('─'.repeat(40));
    
    for (const [cmd, args, validate] of category.tests) {
      const result = await testCommand(category.name, cmd, args, validate);
      results.total++;
      if (result.status === 'pass') results.passed++;
      else if (result.status === 'fail') results.failed++;
      else results.errors++;
    }
  }
  
  // 요약
  console.log(`\n${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}Summary:${colors.reset}`);
  console.log(`  Total Commands Tested: ${results.total}`);
  console.log(`  ${colors.green}✅ Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}❌ Failed: ${results.failed}${colors.reset}`);
  console.log(`  ${colors.yellow}⚠️  Errors: ${results.errors}${colors.reset}`);
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(`\n  Success Rate: ${successRate}%`);
  
  if (successRate >= 90) {
    console.log(`\n${colors.green}🎉 Phase 1 is working great!${colors.reset}`);
  } else if (successRate >= 70) {
    console.log(`\n${colors.yellow}⚠️  Phase 1 needs some fixes${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ Phase 1 has significant issues${colors.reset}`);
  }
  
  await cleanup();
}

// 실행
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});