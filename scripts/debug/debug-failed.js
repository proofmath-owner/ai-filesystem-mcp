#!/usr/bin/env node
// 실패한 명령어 디버깅

import { createCommandRegistry } from './dist/core/commands/index.js';
import { FileSystemManager } from './dist/core/FileSystemManager.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_DIR = './phase1-validation';

async function setup() {
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.writeFile(path.join(TEST_DIR, 'sample.txt'), 'This is a test file for Phase 1 validation.');
  await fs.writeFile(path.join(TEST_DIR, 'sample.js'), 'function hello() { return "world"; }');
}

async function debugFailedCommands() {
  console.log('🔍 Debugging Failed Commands\n');
  
  await setup();
  
  const registry = createCommandRegistry();
  const fsManager = new FileSystemManager();
  
  // 1. get_file_metadata 테스트
  console.log('1️⃣ Testing get_file_metadata:');
  console.log('   Path:', path.join(TEST_DIR, 'sample.txt'));
  
  try {
    const result = await registry.execute('get_file_metadata', {
      args: { path: path.join(TEST_DIR, 'sample.txt') },
      fsManager
    });
    
    console.log('   Result type:', result.content[0].type);
    console.log('   Result text (first 200 chars):', result.content[0].text.substring(0, 200));
    console.log('   Contains "size"?', result.content[0].text.includes('size'));
    console.log('   Full result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  console.log('\n2️⃣ Testing analyze_code:');
  console.log('   Path:', path.join(TEST_DIR, 'sample.js'));
  
  try {
    const result = await registry.execute('analyze_code', {
      args: { path: path.join(TEST_DIR, 'sample.js') },
      fsManager
    });
    
    console.log('   Result type:', result.content[0].type);
    console.log('   Result text (first 200 chars):', result.content[0].text.substring(0, 200));
    console.log('   Contains "function"?', result.content[0].text.includes('function'));
    console.log('   Full result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  // Cleanup
  await fs.rm(TEST_DIR, { recursive: true, force: true });
}

debugFailedCommands().catch(console.error);