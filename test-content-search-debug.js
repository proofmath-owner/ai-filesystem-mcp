#!/usr/bin/env node

import { ContentSearcher } from './dist/core/services/search/ContentSearcher.js';
import fs from 'fs/promises';

const TEST_DIR = './content-search-debug-test';

async function setup() {
  try {
    await fs.rmdir(TEST_DIR, { recursive: true });
  } catch {}
  
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.writeFile(`${TEST_DIR}/test.txt`, 'test content here');
  console.log('✅ Setup complete');
}

async function testContentSearch() {
  console.log('🔍 Testing ContentSearcher...');
  
  const searcher = new ContentSearcher();
  
  try {
    console.log('  Calling searchContent...');
    const results = await searcher.searchContent(TEST_DIR, 'test');
    console.log(`  ✅ Got ${results.length} results`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function cleanup() {
  try {
    await fs.rmdir(TEST_DIR, { recursive: true });
    console.log('🧹 Cleanup complete');
  } catch (error) {
    console.log(`⚠️ Cleanup error: ${error.message}`);
  }
}

async function main() {
  console.log('ContentSearcher Debug Test');
  console.log('==========================');
  
  await setup();
  
  // Set a timeout to detect hanging
  const timeoutId = setTimeout(() => {
    console.error('❌ TIMEOUT: ContentSearcher is hanging!');
    process.exit(1);
  }, 10000);
  
  const success = await testContentSearch();
  
  clearTimeout(timeoutId);
  await cleanup();
  
  console.log(success ? '✅ Test passed' : '❌ Test failed');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});