#!/usr/bin/env node

/**
 * Search Functionality Analysis Test
 * Tests all search implementations for potential issues
 */

import { AdvancedSearchManager } from './dist/core/AdvancedSearchManager.js';
import { SearchService } from './dist/core/services/search/SearchService.js';
import { ContentSearcher } from './dist/core/services/search/ContentSearcher.js';
import { FuzzySearcher } from './dist/core/services/search/FuzzySearcher.js';
import { SemanticSearcher } from './dist/core/services/search/SemanticSearcher.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_DIR = './search-test-analysis';

async function setup() {
  try {
    await fs.rmdir(TEST_DIR, { recursive: true });
  } catch {}
  
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.mkdir(path.join(TEST_DIR, 'subdir'), { recursive: true });
  
  // Create test files
  await fs.writeFile(path.join(TEST_DIR, 'test.js'), 'function testFunction() { return 42; }');
  await fs.writeFile(path.join(TEST_DIR, 'sample.txt'), 'This is a sample file with test content');
  await fs.writeFile(path.join(TEST_DIR, 'config.json'), '{"name": "test", "version": "1.0.0"}');
  await fs.writeFile(path.join(TEST_DIR, 'README.md'), '# Test Project\nThis is a test project for search functionality');
  await fs.writeFile(path.join(TEST_DIR, 'subdir/nested.py'), 'def hello_world():\n    print("Hello World")');
  
  console.log('✅ Test files created');
}

async function testAdvancedSearchManager() {
  console.log('\n🔍 Testing AdvancedSearchManager...');
  const manager = new AdvancedSearchManager();
  
  try {
    // Test fuzzy search with timeout
    console.log('  Testing fuzzy search...');
    const startTime = Date.now();
    const fuzzyResults = await manager.fuzzySearch('test', TEST_DIR, 0.5);
    const fuzzyDuration = Date.now() - startTime;
    console.log(`  ✅ Fuzzy search: ${fuzzyResults.length} results in ${fuzzyDuration}ms`);
    
    if (fuzzyDuration > 5000) {
      console.log('  ⚠️  WARNING: Fuzzy search took longer than expected timeout');
    }
    
    // Test semantic search with timeout
    console.log('  Testing semantic search...');
    const semanticStart = Date.now();
    const semanticResults = await manager.semanticSearch('test project files', TEST_DIR);
    const semanticDuration = Date.now() - semanticStart;
    console.log(`  ✅ Semantic search: ${semanticResults.length} results in ${semanticDuration}ms`);
    
    if (semanticDuration > 15000) {
      console.log('  ⚠️  WARNING: Semantic search took longer than expected timeout');
    }
    
    // Test date search
    console.log('  Testing date search...');
    const dateResults = await manager.searchByDate(TEST_DIR, { after: new Date(Date.now() - 3600000) });
    console.log(`  ✅ Date search: ${dateResults.length} results`);
    
    // Test size search
    console.log('  Testing size search...');
    const sizeResults = await manager.searchBySize(TEST_DIR, { min: 0, max: 1024000 });
    console.log(`  ✅ Size search: ${sizeResults.length} results`);
    
  } catch (error) {
    console.error(`  ❌ AdvancedSearchManager error: ${error.message}`);
    return false;
  }
  
  return true;
}

async function testSearchService() {
  console.log('\n🔍 Testing SearchService...');
  
  try {
    const contentSearcher = new ContentSearcher();
    const fuzzySearcher = new FuzzySearcher();
    const semanticSearcher = new SemanticSearcher();
    const searchService = new SearchService(contentSearcher, fuzzySearcher, semanticSearcher);
    
    // Test content search
    console.log('  Testing content search...');
    const contentResults = await searchService.searchContent(TEST_DIR, 'test', '*.js');
    console.log(`  ✅ Content search: ${contentResults.length} results`);
    
    // Test fuzzy search
    console.log('  Testing fuzzy search...');
    const fuzzyResults = await searchService.fuzzySearch('test', TEST_DIR, { threshold: 0.5 });
    console.log(`  ✅ Fuzzy search: ${fuzzyResults.length} results`);
    
    // Test semantic search
    console.log('  Testing semantic search...');
    const semanticResults = await searchService.semanticSearch('test files', TEST_DIR);
    console.log(`  ✅ Semantic search: ${semanticResults.files.length} results`);
    
  } catch (error) {
    console.error(`  ❌ SearchService error: ${error.message}`);
    return false;
  }
  
  return true;
}

async function testIndividualSearchers() {
  console.log('\n🔍 Testing Individual Searchers...');
  
  try {
    // Test ContentSearcher
    console.log('  Testing ContentSearcher...');
    const contentSearcher = new ContentSearcher();
    const contentResults = await contentSearcher.searchContent(TEST_DIR, 'test');
    console.log(`  ✅ ContentSearcher: ${contentResults.length} results`);
    
    // Test FuzzySearcher  
    console.log('  Testing FuzzySearcher...');
    const fuzzySearcher = new FuzzySearcher();
    const fuzzyResults = await fuzzySearcher.fuzzySearch(TEST_DIR, 'test', 0.5);
    console.log(`  ✅ FuzzySearcher: ${fuzzyResults.length} results`);
    
    // Test SemanticSearcher
    console.log('  Testing SemanticSearcher...');
    const semanticSearcher = new SemanticSearcher();
    const semanticResults = await semanticSearcher.semanticSearch(TEST_DIR, 'test files');
    console.log(`  ✅ SemanticSearcher: ${semanticResults.length} results`);
    
  } catch (error) {
    console.error(`  ❌ Individual searchers error: ${error.message}`);
    return false;
  }
  
  return true;
}

async function testNaturalJSImports() {
  console.log('\n📦 Testing Natural.js Imports...');
  
  try {
    // Test natural import
    const natural = await import('natural');
    console.log('  ✅ Natural.js imported successfully');
    
    // Test TfIdf
    const TfIdf = natural.default.TfIdf;
    const tfidf = new TfIdf();
    tfidf.addDocument('test document');
    console.log('  ✅ TfIdf class works');
    
    // Test tokenizer
    const tokenizer = new natural.default.WordTokenizer();
    const tokens = tokenizer.tokenize('test words here');
    console.log(`  ✅ WordTokenizer works: ${tokens.length} tokens`);
    
    // Test Levenshtein distance
    const distance = natural.default.LevenshteinDistance('test', 'best');
    console.log(`  ✅ LevenshteinDistance works: ${distance}`);
    
  } catch (error) {
    console.error(`  ❌ Natural.js import error: ${error.message}`);
    return false;
  }
  
  return true;
}

async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  
  // Create larger test directory
  const largeDirPath = path.join(TEST_DIR, 'large');
  await fs.mkdir(largeDirPath, { recursive: true });
  
  // Create 100 test files
  for (let i = 0; i < 100; i++) {
    await fs.writeFile(
      path.join(largeDirPath, `file${i}.txt`), 
      `This is file number ${i} with test content and random data ${Math.random()}`
    );
  }
  
  const manager = new AdvancedSearchManager();
  
  try {
    // Test fuzzy search performance
    console.log('  Testing fuzzy search performance...');
    const fuzzyStart = Date.now();
    const fuzzyResults = await manager.fuzzySearch('file', largeDirPath, 0.6);
    const fuzzyTime = Date.now() - fuzzyStart;
    console.log(`  ✅ Fuzzy search on 100 files: ${fuzzyResults.length} results in ${fuzzyTime}ms`);
    
    if (fuzzyTime > 10000) {
      console.log('  ⚠️  WARNING: Fuzzy search performance issue - took more than 10s');
    }
    
    // Test semantic search performance
    console.log('  Testing semantic search performance...');
    const semanticStart = Date.now();
    const semanticResults = await manager.semanticSearch('test file content', largeDirPath);
    const semanticTime = Date.now() - semanticStart;
    console.log(`  ✅ Semantic search on 100 files: ${semanticResults.length} results in ${semanticTime}ms`);
    
    if (semanticTime > 20000) {
      console.log('  ⚠️  WARNING: Semantic search performance issue - took more than 20s');
    }
    
  } catch (error) {
    console.error(`  ❌ Performance test error: ${error.message}`);
    return false;
  }
  
  return true;
}

async function cleanup() {
  try {
    await fs.rmdir(TEST_DIR, { recursive: true });
    console.log('\n🧹 Cleanup completed');
  } catch (error) {
    console.log(`\n⚠️  Cleanup warning: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 AI FileSystem MCP - Search Functionality Analysis');
  console.log('==================================================');
  
  await setup();
  
  const results = [
    await testNaturalJSImports(),
    await testAdvancedSearchManager(),
    await testSearchService(),
    await testIndividualSearchers(),
    await testPerformance()
  ];
  
  await cleanup();
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All search functionality tests passed!');
  } else {
    console.log('❌ Some search functionality issues detected');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💀 Fatal error:', error);
  process.exit(1);
});