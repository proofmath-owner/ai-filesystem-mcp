#!/usr/bin/env node
import { createCommandRegistry } from '../../dist/core/commands/index.js';

async function testRefactoredCommands() {
  console.log('🧪 Testing Refactored Command System...\n');
  
  try {
    // Command Registry 생성
    const registry = createCommandRegistry();
    
    console.log(`✅ Command Registry created with ${registry.size} commands`);
    console.log(`📋 Available commands: ${registry.getCommandNames().join(', ')}\n`);
    
    // Mock FileSystemManager (테스트용)
    const mockFsManager = {
      readFile: async (path) => ({
        content: [{ type: 'text', text: `Mock content of ${path}` }]
      }),
      writeFile: async (path, content) => ({
        content: [{ type: 'text', text: `Mock: Written to ${path}` }]
      }),
      searchFiles: async (pattern, dir) => ({
        content: [{ type: 'text', text: `Mock: Found files matching ${pattern} in ${dir || '.'}` }]
      }),
      gitStatus: async () => ({
        content: [{ type: 'text', text: `Mock: Git status - 2 files modified, 1 file staged` }]
      }),
      gitCommit: async (message, files) => ({
        content: [{ type: 'text', text: `Mock: Committed with message "${message}"${files ? ` (${files.length} files)` : ' (all files)'}` }]
      }),
      analyzeCode: async (path) => ({
        content: [{ type: 'text', text: `Mock: Analyzed ${path} - Found 5 functions, 3 classes, 10 imports` }]
      }),
      modifyCode: async (path, modifications) => ({
        content: [{ type: 'text', text: `Mock: Modified ${path} with ${modifications.length} changes` }]
      }),
      createTransaction: () => ({
        write: (path, content) => console.log(`  - Write: ${path}`),
        update: (path, updates) => console.log(`  - Update: ${path}`),
        remove: (path) => console.log(`  - Remove: ${path}`),
        commit: async () => ({ success: true, operations: 3 })
      })
    };
    
    // Test 1: ReadFile Command
    console.log('1️⃣ Testing ReadFile Command...');
    const readResult = await registry.execute('read_file', {
      args: { path: 'test.txt' },
      fsManager: mockFsManager
    });
    console.log('Result:', readResult.content[0].text);
    
    // Test 2: WriteFile Command
    console.log('\n2️⃣ Testing WriteFile Command...');
    const writeResult = await registry.execute('write_file', {
      args: { path: 'test.txt', content: 'Hello, World!' },
      fsManager: mockFsManager
    });
    console.log('Result:', writeResult.content[0].text);
    
    // Test 3: SearchFiles Command
    console.log('\n3️⃣ Testing SearchFiles Command...');
    const searchResult = await registry.execute('search_files', {
      args: { pattern: '*.ts', directory: './src' },
      fsManager: mockFsManager
    });
    console.log('Result:', searchResult.content[0].text);
    
    // Test 4: Error handling
    console.log('\n4️⃣ Testing Error Handling...');
    try {
      await registry.execute('read_file', {
        args: {}, // Missing required 'path'
        fsManager: mockFsManager
      });
    } catch (error) {
      console.log('Expected error caught:', error.message);
    }
    
    // Test 5: Git Status Command
    console.log('\n5️⃣ Testing Git Status Command...');
    const gitStatusResult = await registry.execute('git_status', {
      args: {},
      fsManager: mockFsManager
    });
    console.log('Result:', gitStatusResult.content[0].text);
    
    // Test 6: Git Commit Command
    console.log('\n6️⃣ Testing Git Commit Command...');
    const gitCommitResult = await registry.execute('git_commit', {
      args: { message: 'feat: add new feature', files: ['src/feature.ts', 'test/feature.test.ts'] },
      fsManager: mockFsManager
    });
    console.log('Result:', gitCommitResult.content[0].text);
    
    // Test 7: Analyze Code Command
    console.log('\n7️⃣ Testing Analyze Code Command...');
    const analyzeResult = await registry.execute('analyze_code', {
      args: { path: 'src/feature.ts' },
      fsManager: mockFsManager
    });
    console.log('Result:', analyzeResult.content[0].text);
    
    // Test 8: Modify Code Command
    console.log('\n8️⃣ Testing Modify Code Command...');
    const modifyResult = await registry.execute('modify_code', {
      args: {
        path: 'src/feature.ts',
        modifications: [
          { type: 'rename', target: 'oldFunction', newName: 'newFunction' },
          { type: 'addImport', importPath: 'lodash', importName: '_' }
        ]
      },
      fsManager: mockFsManager
    });
    console.log('Result:', modifyResult.content[0].text);
    
    // Test 9: Create Transaction Command
    console.log('\n9️⃣ Testing Create Transaction Command...');
    const transactionResult = await registry.execute('create_transaction', {
      args: {
        operations: [
          { type: 'write', path: 'new-file.txt', content: 'Hello' },
          { type: 'update', path: 'existing.txt', updates: [{ oldText: 'old', newText: 'new' }] },
          { type: 'remove', path: 'delete-me.txt' }
        ]
      },
      fsManager: mockFsManager
    });
    console.log('Result:', transactionResult.content[0].text);
    
    // Test 10: Unknown command
    console.log('\n🔟 Testing Unknown Command...');
    try {
      await registry.execute('unknown_command', {
        args: {},
        fsManager: mockFsManager
      });
    } catch (error) {
      console.log('Expected error caught:', error.message);
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testRefactoredCommands().catch(console.error);
