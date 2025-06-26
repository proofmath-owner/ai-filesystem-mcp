#!/usr/bin/env node
// create_transaction 전체 테스트

import { createCommandRegistry } from './dist/core/commands/index.js';
import { FileSystemManager } from './dist/core/FileSystemManager.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_DIR = './transaction-deep-test';

async function testTransactionIssues() {
  console.log('🔍 Testing create_transaction edge cases\n');
  
  const registry = createCommandRegistry();
  const fsManager = new FileSystemManager();
  
  // Setup
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.writeFile(path.join(TEST_DIR, 'existing.txt'), 'Original content');
  
  console.log('1️⃣ Checking transaction backup directory:');
  console.log('   Current working directory:', process.cwd());
  console.log('   Expected backup location:', path.join(process.cwd(), '.ai-fs-transactions'));
  
  // Check if we can create the backup directory
  try {
    await fs.access(path.join(process.cwd(), '.ai-fs-transactions'));
    console.log('   ✅ Backup directory exists');
  } catch (e) {
    console.log('   ⚠️  Backup directory does not exist');
    try {
      await fs.mkdir(path.join(process.cwd(), '.ai-fs-transactions'), { recursive: true });
      console.log('   ✅ Successfully created backup directory');
    } catch (err) {
      console.log('   ❌ Failed to create backup directory:', err.message);
    }
  }
  
  console.log('\n2️⃣ Test: Write to non-existent nested directory');
  try {
    const result = await registry.execute('create_transaction', {
      args: {
        operations: [
          { 
            type: 'write', 
            path: path.join(TEST_DIR, 'deep/nested/folder/file.txt'), 
            content: 'Test content in nested folder' 
          }
        ]
      },
      fsManager
    });
    console.log('   Result:', result.content[0].text);
    
    // Verify file was created
    try {
      const content = await fs.readFile(path.join(TEST_DIR, 'deep/nested/folder/file.txt'), 'utf-8');
      console.log('   ✅ File created successfully with content:', content);
    } catch (e) {
      console.log('   ❌ File was not created!');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  console.log('\n3️⃣ Test: Update non-existent file');
  try {
    const result = await registry.execute('create_transaction', {
      args: {
        operations: [
          { 
            type: 'update', 
            path: path.join(TEST_DIR, 'does-not-exist.txt'), 
            updates: [{oldText: 'foo', newText: 'bar'}] 
          }
        ]
      },
      fsManager
    });
    console.log('   Result:', result.content[0].text);
  } catch (error) {
    console.log('   ❌ Expected error:', error.message);
  }
  
  console.log('\n4️⃣ Test: Transaction rollback');
  // Create a file that will be modified
  await fs.writeFile(path.join(TEST_DIR, 'rollback-test.txt'), 'Original content for rollback test');
  
  try {
    const result = await registry.execute('create_transaction', {
      args: {
        operations: [
          // First operation should succeed
          { 
            type: 'update', 
            path: path.join(TEST_DIR, 'rollback-test.txt'), 
            updates: [{oldText: 'Original', newText: 'Modified'}] 
          },
          // Second operation should fail
          { 
            type: 'update', 
            path: path.join(TEST_DIR, 'does-not-exist.txt'), 
            updates: [{oldText: 'foo', newText: 'bar'}] 
          }
        ]
      },
      fsManager
    });
    console.log('   Result:', result.content[0].text);
  } catch (error) {
    console.log('   ❌ Transaction failed (expected):', error.message);
  }
  
  // Check if rollback worked
  const rollbackContent = await fs.readFile(path.join(TEST_DIR, 'rollback-test.txt'), 'utf-8');
  console.log('   Rollback check - File content:', rollbackContent);
  console.log('   Rollback', rollbackContent === 'Original content for rollback test' ? '✅ worked!' : '❌ failed!');
  
  console.log('\n5️⃣ Test: Large transaction');
  try {
    const operations = [];
    for (let i = 0; i < 10; i++) {
      operations.push({
        type: 'write',
        path: path.join(TEST_DIR, `file${i}.txt`),
        content: `Content for file ${i}`
      });
    }
    
    const result = await registry.execute('create_transaction', {
      args: { operations },
      fsManager
    });
    console.log('   Result:', result.content[0].text);
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  // Check .ai-fs-transactions directory
  console.log('\n6️⃣ Checking backup directory after tests:');
  try {
    const backupDir = path.join(process.cwd(), '.ai-fs-transactions');
    const entries = await fs.readdir(backupDir);
    console.log('   Backup directory contains:', entries.length, 'entries');
    if (entries.length > 0) {
      console.log('   Recent backups:', entries.slice(-5));
    }
  } catch (e) {
    console.log('   No backup directory found');
  }
  
  // Cleanup
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  
  console.log('\n✅ Transaction deep test complete!');
}

testTransactionIssues().catch(console.error);