#!/usr/bin/env node
/**
 * Test new commands added in PHASE1 enhancement
 */

import { createCommandRegistry } from './dist/core/commands/index.js';
import { FileSystemManager } from './dist/core/FileSystemManager.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_DIR = './phase1-new-commands-test';
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
  await fs.writeFile(path.join(TEST_DIR, 'test.txt'), 'Test content');
  await fs.writeFile(path.join(TEST_DIR, 'sample.js'), 'function test() { return 42; }');
}

async function testCommand(name, args, description) {
  const registry = createCommandRegistry();
  const fsManager = new FileSystemManager();
  
  process.stdout.write(`  ${name.padEnd(25)} ${description.padEnd(35)}`);
  
  try {
    const start = Date.now();
    const result = await registry.execute(name, { args, fsManager });
    const duration = Date.now() - start;
    
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
  console.log(`${colors.blue}║      PHASE1 Enhancement - New Commands Test       ║${colors.reset}`);
  console.log(`${colors.blue}╚═══════════════════════════════════════════════════╝${colors.reset}\n`);
  
  await setup();
  
  const testGroups = [
    {
      name: '📁 Directory Commands',
      tests: [
        ['create_directory', { path: path.join(TEST_DIR, 'new-dir'), recursive: true }, 'Create directory'],
        ['list_directory', { path: TEST_DIR, detailed: true, sortBy: 'name' }, 'List directory detailed'],
        ['copy_directory', { source: path.join(TEST_DIR, 'new-dir'), destination: path.join(TEST_DIR, 'copy-dir') }, 'Copy directory'],
        ['move_directory', { source: path.join(TEST_DIR, 'copy-dir'), destination: path.join(TEST_DIR, 'moved-dir') }, 'Move directory'],
        ['remove_directory', { path: path.join(TEST_DIR, 'moved-dir'), recursive: true }, 'Remove directory']
      ]
    },
    {
      name: '🛠️ Utility Commands',
      tests: [
        ['touch', { path: path.join(TEST_DIR, 'touched.txt') }, 'Touch file'],
        ['copy_file', { source: path.join(TEST_DIR, 'test.txt'), destination: path.join(TEST_DIR, 'copy.txt') }, 'Copy single file'],
        ['pwd', {}, 'Get working directory'],
        ['disk_usage', { path: TEST_DIR, humanReadable: true }, 'Check disk usage'],
        ['delete_files', { paths: [path.join(TEST_DIR, 'touched.txt'), path.join(TEST_DIR, 'copy.txt')] }, 'Delete multiple files']
      ]
    },
    {
      name: '🌿 Git Advanced Commands',
      tests: [
        ['git_remote', { action: 'list', verbose: true }, 'List git remotes'],
        ['git_stash', { action: 'list' }, 'List stashes'],
        ['git_tag', { action: 'list' }, 'List tags'],
        ['git_diff', { nameOnly: true }, 'Show git diff']
      ]
    }
  ];
  
  const results = { total: 0, passed: 0, failed: 0, errors: 0 };
  const failedCommands = [];
  
  for (const group of testGroups) {
    console.log(`\n${group.name}`);
    console.log('═'.repeat(60));
    
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
    console.log(`\n${colors.green}🎉 New commands are working great!${colors.reset}`);
  } else if (successRate >= 70) {
    console.log(`\n${colors.yellow}⚠️  Some new commands need attention${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ New commands have issues${colors.reset}`);
  }
  
  // Note about missing commands
  console.log(`\n${colors.yellow}Note:${colors.reset} Some commands may fail if:`);
  console.log('  - They are not yet registered in the command registry');
  console.log('  - GitIntegration methods are not implemented');
  console.log('  - They require specific environment setup');
}

main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
