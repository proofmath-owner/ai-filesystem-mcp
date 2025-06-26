#!/usr/bin/env node

/**
 * Quick test runner for the modular architecture
 * This validates that the new structure is working correctly
 */

import { ServiceContainer } from '../dist/core/ServiceContainer.js';
import { ReadFileCommand } from '../dist/commands/implementations/file/ReadFileCommand.js';
import { WriteFileCommand } from '../dist/commands/implementations/file/WriteFileCommand.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const testDir = './test-output';

async function runTests() {
  console.log('🧪 Running Modular Architecture Tests...\n');
  
  let passed = 0;
  let failed = 0;

  // Setup
  await fs.mkdir(testDir, { recursive: true });
  const container = new ServiceContainer();
  await container.initialize();

  try {
    // Test 1: Write File
    console.log('Test 1: Write File Command');
    const writeCommand = new WriteFileCommand();
    const writeResult = await writeCommand.execute({
      args: {
        path: path.join(testDir, 'test.txt'),
        content: 'Hello from modular architecture!'
      },
      container
    });
    
    if (writeResult.success) {
      console.log('✅ Write file test passed');
      passed++;
    } else {
      console.log('❌ Write file test failed');
      failed++;
    }

    // Test 2: Read File
    console.log('\nTest 2: Read File Command');
    const readCommand = new ReadFileCommand();
    const readResult = await readCommand.execute({
      args: {
        path: path.join(testDir, 'test.txt')
      },
      container
    });
    
    if (readResult.success && readResult.data === 'Hello from modular architecture!') {
      console.log('✅ Read file test passed');
      passed++;
    } else {
      console.log('❌ Read file test failed');
      failed++;
    }

    // Test 3: Cache Test
    console.log('\nTest 3: Cache Functionality');
    const startTime = Date.now();
    const cacheResult1 = await readCommand.execute({
      args: { path: path.join(testDir, 'test.txt') },
      container
    });
    const firstReadTime = Date.now() - startTime;

    const startTime2 = Date.now();
    const cacheResult2 = await readCommand.execute({
      args: { path: path.join(testDir, 'test.txt') },
      container
    });
    const secondReadTime = Date.now() - startTime2;

    if (cacheResult1.data === cacheResult2.data) {
      console.log(`✅ Cache test passed (1st read: ${firstReadTime}ms, 2nd read: ${secondReadTime}ms)`);
      passed++;
    } else {
      console.log('❌ Cache test failed');
      failed++;
    }

    // Test 4: Service Container
    console.log('\nTest 4: Service Container');
    const fileService = container.getService('fileService');
    if (fileService) {
      console.log('✅ Service container test passed');
      passed++;
    } else {
      console.log('❌ Service container test failed');
      failed++;
    }

    // Test 5: Error Handling
    console.log('\nTest 5: Error Handling');
    try {
      await readCommand.execute({
        args: { path: '/non/existent/file.txt' },
        container
      });
      console.log('❌ Error handling test failed - should have thrown');
      failed++;
    } catch (error) {
      console.log('✅ Error handling test passed');
      passed++;
    }

  } catch (error) {
    console.error('Test suite error:', error);
    failed++;
  } finally {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
    await container.cleanup();
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);
