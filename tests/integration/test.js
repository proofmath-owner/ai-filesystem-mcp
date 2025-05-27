#!/usr/bin/env node
import { FileSystemManager } from '../../dist/core/FileSystemManager.js';

async function testFileSystem() {
  console.log('🧪 Testing AI FileSystem MCP...\n');
  
  const fs = new FileSystemManager();
  
  try {
    // Test 1: Basic file operations
    console.log('1️⃣ Testing basic file operations...');
    await fs.writeFile('test.txt', 'Hello, AI FileSystem!');
    const readResult = await fs.readFile('test.txt');
    console.log('✅ File read:', readResult.content[0].text.substring(0, 50));
    
    // Test 2: Transaction
    console.log('\n2️⃣ Testing transactions...');
    const transaction = fs.createTransaction();
    transaction
      .write('transaction1.txt', 'Transaction test 1')
      .write('transaction2.txt', 'Transaction test 2')
      .update('test.txt', [{ oldText: 'Hello', newText: 'Hi' }]);
    
    const txResult = await transaction.commit();
    console.log('✅ Transaction result:', txResult);
    
    // Test 3: Git status (if in git repo)
    console.log('\n3️⃣ Testing git integration...');
    try {
      const gitStatus = await fs.gitStatus();
      console.log('✅ Git status retrieved successfully');
    } catch (e) {
      console.log('⚠️  Not a git repository (expected if not in git repo)');
    }
    
    // Test 4: File watching
    console.log('\n4️⃣ Testing file watching...');
    const watcherId = await fs.startWatching('./test-watch', {
      persistent: false,
      ignoreInitial: true
    });
    console.log('✅ Watcher started:', watcherId);
    
    const stats = fs.getWatcherStats();
    console.log('✅ Watcher stats:', stats.content[0].text.split('\n')[0]);
    
    await fs.stopWatching(watcherId.content[0].text.split(': ')[1]);
    
    // Test 5: Code analysis (if TypeScript file exists)
    console.log('\n5️⃣ Testing code analysis...');
    try {
      const analysis = await fs.analyzeCode('./src/index.ts');
      console.log('✅ Code analysis completed successfully');
    } catch (e) {
      console.log('⚠️  Could not analyze code (file might not exist)');
    }
    
    // Test 6: File metadata
    console.log('\n6️⃣ Testing file metadata...');
    const metadata = await fs.getFileMetadata('test.txt', true);
    console.log('✅ File metadata retrieved');
    
    // Test 7: Directory tree
    console.log('\n7️⃣ Testing directory tree...');
    const tree = await fs.getDirectoryTree('.', 2);
    console.log('✅ Directory tree generated');
    
    // Test 8: File comparison
    console.log('\n8️⃣ Testing file comparison...');
    await fs.writeFile('test2.txt', 'Hello, AI FileSystem!');
    const comparison = await fs.compareFiles('test.txt', 'test2.txt');
    console.log('✅ Files compared');
    
    // Cleanup
    console.log('\n🧹 Cleaning up test files...');
    const cleanup = fs.createTransaction();
    cleanup
      .remove('test.txt')
      .remove('test2.txt')
      .remove('transaction1.txt')
      .remove('transaction2.txt');
    await cleanup.commit();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testFileSystem().catch(console.error);
