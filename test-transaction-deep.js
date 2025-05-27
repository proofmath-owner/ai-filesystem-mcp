#!/usr/bin/env node
// create_transaction 심층 테스트

import { createCommandRegistry } from './dist/core/commands/index.js';
import { FileSystemManager } from './dist/core/FileSystemManager.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_DIR = './transaction-test';

async function testTransaction() {
  console.log('🔍 Testing create_transaction in various scenarios\n');
  
  const registry = createCommandRegistry();
  const fsManager = new FileSystemManager();
  
  // Setup
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.writeFile(path.join(TEST_DIR, 'existing.txt'), 'Original content');
  
  // Test 1: 정상적인 트랜잭션
  console.log('1️⃣ Normal transaction (should work):');
  try {
    const result = await registry.execute('create_transaction', {
      args: {
        operations: [
          { type: 'write', path: path.join(TEST_DIR, 'new.txt'), content: 'New file' },
          { type: 'update', path: path.join(TEST_DIR, 'existing.txt'), updates: [{oldText: 'Original', newText: 'Updated'}] }
        ]
      },
      fsManager
    });
    console.log('✅ Success:', result.content[0].text);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 2: 없는 디렉토리에 쓰기 (문제 발생!)
  console.log('\n2️⃣ Write to non-existent directory (this might fail):');
  try {
    const result = await registry.execute('create_transaction', {
      args: {
        operations: [
          { type: 'write', path: path.join(TEST_DIR, 'nonexistent/subfolder/file.txt'), content: 'Test' }
        ]
      },
      fsManager
    });
    console.log('✅ Success:', result.content[0].text);
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('   Stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
  }
  
  // Test 3: 트랜잭션 중간에 실패하는 경우
  console.log('\n3️⃣ Transaction with failure in the middle:');
  try {
    const result = await registry.execute('create_transaction', {
      args: {
        operations: [
          { type: 'write', path: path.join(TEST_DIR, 'first.txt'), content: 'First file' },
          { type: 'update', path: path.join(TEST_DIR, 'nonexistent.txt'), updates: [{oldText: 'foo', newText: 'bar'}] },
          { type: 'write', path: path.join(TEST_DIR, 'third.txt'), content: 'Third file' }
        ]
      },
      fsManager
    });
    console.log('✅ Success:', result.content[0].text);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 4: Transaction 실제 구현 확인
  console.log('\n4️⃣ Checking actual Transaction implementation:');
  console.log('   Looking at Transaction.ts...');
  
  // Cleanup
  await fs.rm(TEST_DIR, { recursive: true, force: true });
}

testTransaction().catch(console.error);