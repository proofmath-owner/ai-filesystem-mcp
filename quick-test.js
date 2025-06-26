#!/usr/bin/env node
/**
 * 빠른 작동 확인 테스트
 */

import { createCommandRegistry } from './dist/core/commands/index.js';
import { FileSystemManager } from './dist/core/FileSystemManager.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_DIR = './quick-test-temp';

async function setup() {
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.writeFile(path.join(TEST_DIR, 'test.txt'), 'Hello World');
  await fs.writeFile(path.join(TEST_DIR, 'test.js'), 'console.log("test");');
}

async function cleanup() {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch {}
}

async function quickTest() {
  const registry = createCommandRegistry();
  const fsManager = new FileSystemManager();
  
  console.log('🔍 Quick Test - Current Commands\n');
  
  // 기본 명령어들만 테스트
  const basicTests = [
    ['read_file', { path: path.join(TEST_DIR, 'test.txt') }],
    ['write_file', { path: path.join(TEST_DIR, 'new.txt'), content: 'New file' }],
    ['search_files', { pattern: '*.txt', directory: TEST_DIR }],
    ['git_status', {}],
    ['analyze_code', { path: path.join(TEST_DIR, 'test.js') }],
    ['get_file_metadata', { path: path.join(TEST_DIR, 'test.txt') }]
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const [cmd, args] of basicTests) {
    try {
      console.log(`Testing ${cmd}...`);
      const result = await registry.execute(cmd, { args, fsManager });
      
      if (result.content && result.content[0] && result.content[0].text) {
        console.log(`✅ ${cmd}: Success`);
        console.log(`   Output: ${result.content[0].text.substring(0, 50)}...`);
        passed++;
      } else {
        console.log(`❌ ${cmd}: No output`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${cmd}: ${error.message}`);
      failed++;
    }
    console.log('');
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  // 등록된 명령어 수 확인
  console.log(`\nTotal registered commands: ${registry.size}`);
}

async function main() {
  try {
    await setup();
    await quickTest();
    await cleanup();
  } catch (error) {
    console.error('Fatal error:', error);
    await cleanup();
    process.exit(1);
  }
}

main();
