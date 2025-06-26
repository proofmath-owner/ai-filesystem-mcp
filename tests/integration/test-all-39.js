#!/usr/bin/env node
/**
 * Phase 1 Complete Test - All 39 Commands
 * 모든 명령어를 체계적으로 테스트
 */

import { createCommandRegistry } from '../../dist/core/commands/index.js';
import { FileSystemManager } from '../../dist/core/FileSystemManager.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_DIR = './phase1-complete-test';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

async function setup() {
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.mkdir(path.join(TEST_DIR, 'subdir'), { recursive: true });
  
  // 테스트 파일들 생성
  await fs.writeFile(path.join(TEST_DIR, 'sample.txt'), 'Hello Phase 1!');
  await fs.writeFile(path.join(TEST_DIR, 'test.js'), 'function test() { return 42; }');
  await fs.writeFile(path.join(TEST_DIR, 'config.json'), '{"name": "test", "version": "1.0.0"}');
  await fs.writeFile(path.join(TEST_DIR, 'subdir/nested.txt'), 'Nested content');
}

async function testCommand(name, args, description) {
  const registry = createCommandRegistry();
  const fsManager = new FileSystemManager();
  
  process.stdout.write(`  ${name.padEnd(25)} ${description.padEnd(35)}`);
  
  try {
    const start = Date.now();
    const result = await registry.execute(name, { args, fsManager });
    const duration = Date.now() - start;
    
    // 에러 체크
    if (result.content[0].text.startsWith('Error:')) {
      console.log(`${colors.red}❌ ERROR${colors.reset} - ${result.content[0].text}`);
      return { status: 'error', error: result.content[0].text };
    }
    
    console.log(`${colors.green}✅ PASS${colors.reset} ${colors.gray}(${duration}ms)${colors.reset}`);
    return { status: 'pass', duration };
  } catch (error) {
    console.log(`${colors.red}❌ FAIL${colors.reset} - ${error.message}`);
    return { status: 'fail', error: error.message };
  }
}

async function main() {
  console.log(`${colors.blue}╔═══════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║        Phase 1 Complete Test (39 Commands)        ║${colors.reset}`);
  console.log(`${colors.blue}╚═══════════════════════════════════════════════════╝${colors.reset}\n`);
  
  await setup();
  
  const testGroups = [
    {
      name: '📁 File Commands (5)',
      tests: [
        ['read_file', { path: path.join(TEST_DIR, 'sample.txt') }, 'Read single file'],
        ['read_files', { paths: [path.join(TEST_DIR, 'sample.txt'), path.join(TEST_DIR, 'test.js')] }, 'Read multiple files'],
        ['write_file', { path: path.join(TEST_DIR, 'output.txt'), content: 'Test write' }, 'Write new file'],
        ['update_file', { path: path.join(TEST_DIR, 'sample.txt'), updates: [{oldText: 'Hello', newText: 'Hi'}] }, 'Update file content'],
        ['move_file', { source: path.join(TEST_DIR, 'output.txt'), destination: path.join(TEST_DIR, 'moved.txt') }, 'Move/rename file']
      ]
    },
    {
      name: '🔍 Search Commands (6)',
      tests: [
        ['search_files', { pattern: '*.txt', directory: TEST_DIR }, 'Search by pattern'],
        ['search_content', { pattern: 'function', directory: TEST_DIR, filePattern: '*.js' }, 'Search in content'],
        ['search_by_date', { directory: TEST_DIR, after: '2024-01-01' }, 'Search by date'],
        ['search_by_size', { directory: TEST_DIR, min: 1, max: 1000 }, 'Search by size'],
        ['fuzzy_search', { pattern: 'sampl', directory: TEST_DIR, threshold: 0.7 }, 'Fuzzy search'],
        ['semantic_search', { query: 'configuration files', directory: TEST_DIR }, 'Semantic search']
      ]
    },
    {
      name: '🌿 Git Commands (2)',
      tests: [
        ['git_status', {}, 'Check git status'],
        ['git_commit', { message: 'test: phase 1 validation' }, 'Create commit']
      ]
    },
    {
      name: '🔬 Code Analysis (2)',
      tests: [
        ['analyze_code', { path: path.join(TEST_DIR, 'test.js') }, 'Analyze code structure'],
        ['modify_code', { path: path.join(TEST_DIR, 'test.js'), modifications: [{type: 'rename', target: 'test', newName: 'myTest'}] }, 'Modify code']
      ]
    },
    {
      name: '💾 Transaction (1)',
      tests: [
        ['create_transaction', { operations: [
          { type: 'write', path: path.join(TEST_DIR, 'trans.txt'), content: 'Transaction test' },
          { type: 'update', path: path.join(TEST_DIR, 'trans.txt'), updates: [{oldText: 'test', newText: 'TEST'}] }
        ]}, 'Transaction operations']
      ]
    },
    {
      name: '👁️ File Watcher (3)',
      tests: [
        ['start_watching', { paths: TEST_DIR }, 'Start watching'],
        ['get_watcher_stats', {}, 'Get watcher stats'],
        ['stop_watching', { watcherId: 'all' }, 'Stop watching']
      ]
    },
    {
      name: '📦 Archive (2)',
      tests: [
        ['compress_files', { files: [path.join(TEST_DIR, 'sample.txt')], outputPath: path.join(TEST_DIR, 'archive.zip') }, 'Compress files'],
        ['extract_archive', { archivePath: path.join(TEST_DIR, 'archive.zip'), destination: path.resolve(TEST_DIR, 'extracted') }, 'Extract archive']
      ]
    },
    {
      name: '📊 System (1)',
      tests: [
        ['get_filesystem_stats', {}, 'Get filesystem stats']
      ]
    },
    {
      name: '🔄 Batch (1)',
      tests: [
        ['batch_operations', { operations: [{ op: 'copy', files: [path.join(TEST_DIR, 'config.json')], options: { destination: path.join(TEST_DIR, 'config-copy.json') } }] }, 'Batch operations']
      ]
    },
    {
      name: '🛠️ Refactoring (3)',
      tests: [
        ['suggest_refactoring', { path: path.join(TEST_DIR, 'test.js') }, 'Suggest refactoring'],
        ['auto_format_project', { directory: TEST_DIR }, 'Auto format'],
        ['analyze_code_quality', { path: path.join(TEST_DIR, 'test.js') }, 'Analyze quality']
      ]
    },
    {
      name: '☁️ Cloud (1)',
      tests: [
        ['sync_with_cloud', { localPath: TEST_DIR, remotePath: 's3://test/path', cloudType: 's3' }, 'Cloud sync']
      ]
    },
    {
      name: '🔐 Security (5)',
      tests: [
        ['change_permissions', { path: path.join(TEST_DIR, 'sample.txt'), permissions: '644' }, 'Change permissions'],
        ['encrypt_file', { path: path.join(TEST_DIR, 'sample.txt'), password: 'test123' }, 'Encrypt file'],
        ['decrypt_file', { encryptedPath: path.join(TEST_DIR, 'sample.txt.enc'), password: 'test123' }, 'Decrypt file'],
        ['scan_secrets', { directory: TEST_DIR }, 'Scan for secrets'],
        ['security_audit', { directory: TEST_DIR }, 'Security audit']
      ]
    },
    {
      name: '📋 Metadata (7)',
      tests: [
        ['analyze_project', { directory: TEST_DIR }, 'Analyze project'],
        ['get_file_metadata', { path: path.join(TEST_DIR, 'sample.txt') }, 'Get file metadata'],
        ['get_directory_tree', { path: TEST_DIR, maxDepth: 2 }, 'Get directory tree'],
        ['compare_files', { file1: path.join(TEST_DIR, 'sample.txt'), file2: path.join(TEST_DIR, 'config.json') }, 'Compare files'],
        ['find_duplicate_files', { directory: TEST_DIR }, 'Find duplicates'],
        ['create_symlink', { target: path.join(TEST_DIR, 'sample.txt'), linkPath: path.join(TEST_DIR, 'link.txt') }, 'Create symlink'],
        ['diff_files', { file1: path.join(TEST_DIR, 'sample.txt'), file2: path.join(TEST_DIR, 'config.json') }, 'Diff files']
      ]
    }
  ];
  
  const results = { total: 0, passed: 0, failed: 0, errors: 0 };
  const failedCommands = [];
  
  for (const group of testGroups) {
    console.log(`\n${group.name}`);
    console.log('═'.repeat(70));
    
    for (const [cmd, args, desc] of group.tests) {
      const result = await testCommand(cmd, args, desc);
      results.total++;
      
      if (result.status === 'pass') {
        results.passed++;
      } else if (result.status === 'error') {
        results.errors++;
        failedCommands.push({ cmd, error: result.error, type: 'error' });
      } else {
        results.failed++;
        failedCommands.push({ cmd, error: result.error, type: 'fail' });
      }
    }
  }
  
  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}SUMMARY${colors.reset}`);
  console.log(`  Total Commands: ${results.total}`);
  console.log(`  ${colors.green}✅ Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.yellow}⚠️  Errors: ${results.errors}${colors.reset}`);
  console.log(`  ${colors.red}❌ Failed: ${results.failed}${colors.reset}`);
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(`\n  Success Rate: ${successRate}%`);
  
  if (failedCommands.length > 0) {
    console.log(`\n${colors.red}Failed Commands:${colors.reset}`);
    failedCommands.forEach(({ cmd, error, type }) => {
      console.log(`  - ${cmd} (${type}): ${error}`);
    });
  }
  
  // Cleanup
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch (e) {
    // Ignore
  }
  
  if (successRate >= 90) {
    console.log(`\n${colors.green}🎉 Phase 1 is in excellent shape!${colors.reset}`);
  } else if (successRate >= 80) {
    console.log(`\n${colors.green}👍 Phase 1 is working well!${colors.reset}`);
  } else if (successRate >= 70) {
    console.log(`\n${colors.yellow}⚠️  Phase 1 needs some improvements${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ Phase 1 needs significant work${colors.reset}`);
  }
}

main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});