#!/usr/bin/env node
import { execSync } from 'child_process';
import { createCommandRegistry } from '../../dist/core/commands/index.js';
import { FileSystemManager } from '../../dist/core/FileSystemManager.js';

const testResults = [];

async function testCommand(name, args, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`   Command: ${name}`);
  console.log(`   Args:`, JSON.stringify(args, null, 2));
  
  try {
    const registry = createCommandRegistry();
    const fsManager = new FileSystemManager();
    
    const result = await registry.execute(name, {
      args,
      fsManager
    });
    
    console.log('   ✅ Success:', result.content[0].text.substring(0, 100) + '...');
    testResults.push({ command: name, status: 'success', description });
    return true;
  } catch (error) {
    console.log('   ❌ Failed:', error.message);
    testResults.push({ command: name, status: 'failed', error: error.message, description });
    return false;
  }
}

async function runPhase1Tests() {
  console.log('=== Phase 1 Complete Test Suite ===');
  console.log('Testing all 39 migrated commands...\n');
  
  // First, build the project
  console.log('🔨 Building project...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: '/Users/Sangbinna/mcp/ai-filesystem-mcp' });
    console.log('✅ Build successful\n');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
  
  // File Commands (5)
  await testCommand('read_file', { path: './package.json' }, 'Read single file');
  await testCommand('read_files', { paths: ['./package.json', './README.md'] }, 'Read multiple files');
  await testCommand('write_file', { path: './test-output.txt', content: 'Test content' }, 'Write file');
  await testCommand('update_file', { 
    path: './test-output.txt', 
    updates: [{oldText: 'Test', newText: 'Updated'}] 
  }, 'Update file');
  await testCommand('move_file', { source: './test-output.txt', destination: './test-moved.txt' }, 'Move file');
  
  // Search Commands (6)
  await testCommand('search_files', { pattern: '*.json', directory: '.' }, 'Search files by pattern');
  await testCommand('search_content', { pattern: 'function', directory: './src', filePattern: '*.ts' }, 'Search content');
  await testCommand('search_by_date', { directory: '.', after: '2024-01-01' }, 'Search by date');
  await testCommand('search_by_size', { directory: '.', min: 1000, max: 10000 }, 'Search by size');
  await testCommand('fuzzy_search', { pattern: 'packge', directory: '.', threshold: 0.8 }, 'Fuzzy search');
  await testCommand('semantic_search', { query: 'file system operations', directory: './src' }, 'Semantic search');
  
  // Git Commands (2)
  await testCommand('git_status', {}, 'Git status');
  await testCommand('git_commit', { message: 'test: phase 1 validation' }, 'Git commit');
  
  // Code Analysis Commands (2)
  await testCommand('analyze_code', { path: './src/index.ts' }, 'Analyze code');
  await testCommand('modify_code', { 
    path: './src/index.ts',
    modifications: [{type: 'addImport', importPath: 'fs', importName: 'promises'}]
  }, 'Modify code');
  
  // Transaction Commands (1)
  await testCommand('create_transaction', {
    operations: [
      { type: 'write', path: 'trans1.txt', content: 'Transaction test' },
      { type: 'remove', path: 'trans1.txt' }
    ]
  }, 'Create transaction');
  
  // File Watcher Commands (3)
  await testCommand('start_watching', { paths: './src' }, 'Start watching');
  await testCommand('get_watcher_stats', {}, 'Get watcher stats');
  await testCommand('stop_watching', { watcherId: 'all' }, 'Stop watching');
  
  // Archive Commands (2)
  await testCommand('compress_files', { 
    files: ['./package.json', './README.md'], 
    outputPath: './test-archive.zip' 
  }, 'Compress files');
  await testCommand('extract_archive', { 
    archivePath: './test-archive.zip', 
    destination: './test-extract' 
  }, 'Extract archive');
  
  // System Commands (1)
  await testCommand('get_filesystem_stats', {}, 'Get filesystem stats');
  
  // Batch Commands (1)
  await testCommand('batch_operations', {
    operations: [
      { op: 'copy', files: ['./package.json'], options: { destination: './package-copy.json' } }
    ]
  }, 'Batch operations');
  
  // Refactoring Commands (3)
  await testCommand('suggest_refactoring', { path: './src/index.ts' }, 'Suggest refactoring');
  await testCommand('auto_format_project', { directory: './src' }, 'Auto format project');
  await testCommand('analyze_code_quality', { path: './src/index.ts' }, 'Analyze code quality');
  
  // Cloud Commands (1)
  await testCommand('sync_with_cloud', { 
    localPath: './test-sync', 
    remotePath: 's3://test-bucket/test', 
    cloudType: 's3' 
  }, 'Sync with cloud');
  
  // Security Commands (5)
  await testCommand('change_permissions', { path: './test-moved.txt', permissions: '644' }, 'Change permissions');
  await testCommand('encrypt_file', { path: './test-moved.txt', password: 'testpass' }, 'Encrypt file');
  await testCommand('decrypt_file', { encryptedPath: './test-moved.txt.enc', password: 'testpass' }, 'Decrypt file');
  await testCommand('scan_secrets', { directory: './src' }, 'Scan secrets');
  await testCommand('security_audit', { directory: '.' }, 'Security audit');
  
  // Metadata Commands (7)
  await testCommand('analyze_project', { directory: '.' }, 'Analyze project');
  await testCommand('get_file_metadata', { path: './package.json' }, 'Get file metadata');
  await testCommand('get_directory_tree', { path: '.', maxDepth: 2 }, 'Get directory tree');
  await testCommand('compare_files', { file1: './package.json', file2: './package-copy.json' }, 'Compare files');
  await testCommand('find_duplicate_files', { directory: '.' }, 'Find duplicate files');
  await testCommand('create_symlink', { target: './README.md', linkPath: './README-link.md' }, 'Create symlink');
  await testCommand('diff_files', { file1: './package.json', file2: './tsconfig.json' }, 'Diff files');
  
  // Summary
  console.log('\n=== Test Summary ===');
  const successCount = testResults.filter(r => r.status === 'success').length;
  const failedCount = testResults.filter(r => r.status === 'failed').length;
  
  console.log(`Total: ${testResults.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  
  if (failedCount > 0) {
    console.log('\nFailed commands:');
    testResults.filter(r => r.status === 'failed').forEach(r => {
      console.log(`- ${r.command}: ${r.error}`);
    });
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up test files...');
  try {
    const fs = await import('fs/promises');
    const filesToClean = [
      './test-output.txt', './test-moved.txt', './test-archive.zip',
      './package-copy.json', './README-link.md', './trans1.txt'
    ];
    for (const file of filesToClean) {
      try {
        await fs.unlink(file);
      } catch (e) {
        // Ignore if file doesn't exist
      }
    }
    try {
      await fs.rmdir('./test-extract', { recursive: true });
    } catch (e) {
      // Ignore
    }
  } catch (e) {
    console.log('Some cleanup failed, but that\'s okay');
  }
  
  console.log('\n✨ Phase 1 testing complete!');
  process.exit(failedCount > 0 ? 1 : 0);
}

// Run the tests
runPhase1Tests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});