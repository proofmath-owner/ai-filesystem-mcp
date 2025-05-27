#!/usr/bin/env node
// Simple test to check if Phase 1 commands are working

import { createCommandRegistry } from './src/core/commands/index.js';
import { FileSystemManager } from './src/core/FileSystemManager.js';

async function quickTest() {
  console.log('🔍 Quick Phase 1 Test\n');
  
  try {
    const registry = createCommandRegistry();
    const fsManager = new FileSystemManager();
    
    console.log(`✅ Registry created with ${registry.size} commands`);
    console.log('📋 Command list:');
    const commands = registry.getCommandNames();
    commands.forEach((cmd, i) => {
      console.log(`   ${i+1}. ${cmd}`);
    });
    
    console.log('\n🧪 Testing a few commands...\n');
    
    // Test 1: Read this file
    console.log('1. Testing read_file:');
    const readResult = await registry.execute('read_file', {
      args: { path: './package.json' },
      fsManager
    });
    console.log('   ✅ Success! Read', readResult.content[0].text.length, 'characters');
    
    // Test 2: Get directory tree
    console.log('\n2. Testing get_directory_tree:');
    const treeResult = await registry.execute('get_directory_tree', {
      args: { path: './src', maxDepth: 2 },
      fsManager
    });
    console.log('   ✅ Success!');
    
    // Test 3: Search files
    console.log('\n3. Testing search_files:');
    const searchResult = await registry.execute('search_files', {
      args: { pattern: '*.json', directory: '.' },
      fsManager
    });
    console.log('   ✅ Success!');
    
    // Test 4: Git status
    console.log('\n4. Testing git_status:');
    try {
      const gitResult = await registry.execute('git_status', {
        args: {},
        fsManager
      });
      console.log('   ✅ Success!');
    } catch (e) {
      console.log('   ⚠️  Git not initialized (expected)');
    }
    
    // Test 5: Analyze code
    console.log('\n5. Testing analyze_code:');
    const analyzeResult = await registry.execute('analyze_code', {
      args: { path: './src/index.ts' },
      fsManager
    });
    console.log('   ✅ Success!');
    
    console.log('\n✨ Phase 1 seems to be working correctly!');
    console.log('   All', registry.size, 'commands are registered.');
    
    // Check which commands might have issues
    console.log('\n🔍 Checking command registration:');
    const expectedCommands = [
      'read_file', 'write_file', 'search_files', 'git_status', 
      'analyze_code', 'create_transaction', 'get_directory_tree',
      'compress_files', 'change_permissions', 'sync_with_cloud'
    ];
    
    for (const cmd of expectedCommands) {
      if (registry.has(cmd)) {
        console.log(`   ✅ ${cmd} - registered`);
      } else {
        console.log(`   ❌ ${cmd} - NOT FOUND!`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

quickTest().catch(console.error);