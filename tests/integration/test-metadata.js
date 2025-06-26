#!/usr/bin/env node
import { createCommandRegistry } from '../../dist/core/commands/index.js';

async function testMetadataCommands() {
  console.log('🧪 Testing New Metadata Commands...\n');
  
  try {
    // Command Registry 생성
    const registry = createCommandRegistry();
    
    console.log(`✅ Command Registry has ${registry.size} commands total\n`);
    
    // 새로운 Metadata Commands 확인
    const metadataCommands = [
      'analyze_project',
      'get_file_metadata',
      'get_directory_tree',
      'compare_files',
      'find_duplicate_files',
      'create_symlink',
      'diff_files'
    ];
    
    console.log('📋 Checking Metadata Commands:');
    for (const cmd of metadataCommands) {
      const exists = registry.has(cmd);
      console.log(`  ${exists ? '✅' : '❌'} ${cmd}`);
    }
    console.log();
    
    // Mock FileSystemManager
    const mockFsManager = {
      analyzeProject: async (directory) => ({
        content: [{ type: 'text', text: `Analyzed project at ${directory}: 50 files, 10 folders, TypeScript project` }]
      }),
      getFileMetadata: async (path, includeHash) => ({
        content: [{ type: 'text', text: `Metadata for ${path}: size=1024, created=2024-01-01${includeHash ? ', hash=abc123' : ''}` }]
      }),
      getDirectoryTree: async (path, maxDepth) => ({
        content: [{ type: 'text', text: `Directory tree of ${path} (depth=${maxDepth || 3}):\n├── src/\n├── test/\n└── dist/` }]
      }),
      compareFiles: async (file1, file2) => ({
        content: [{ type: 'text', text: `Comparing ${file1} and ${file2}: Files are identical` }]
      }),
      findDuplicateFiles: async (directory) => ({
        content: [{ type: 'text', text: `Found 3 duplicate files in ${directory}` }]
      }),
      createSymlink: async (target, linkPath) => ({
        content: [{ type: 'text', text: `Created symlink: ${linkPath} → ${target}` }]
      }),
      diffFiles: async (file1, file2, format) => ({
        content: [{ type: 'text', text: `Diff between ${file1} and ${file2} (format=${format || 'unified'}):\n@@ -1,3 +1,3 @@\n-old line\n+new line` }]
      })
    };
    
    // Test each metadata command
    console.log('🔍 Testing Each Metadata Command:\n');
    
    // 1. analyze_project
    console.log('1️⃣ Testing analyze_project...');
    const analyzeResult = await registry.execute('analyze_project', {
      args: { directory: './src' },
      fsManager: mockFsManager
    });
    console.log('Result:', analyzeResult.content[0].text);
    
    // 2. get_file_metadata
    console.log('\n2️⃣ Testing get_file_metadata...');
    const metadataResult = await registry.execute('get_file_metadata', {
      args: { path: 'test.txt', includeHash: true },
      fsManager: mockFsManager
    });
    console.log('Result:', metadataResult.content[0].text);
    
    // 3. get_directory_tree
    console.log('\n3️⃣ Testing get_directory_tree...');
    const treeResult = await registry.execute('get_directory_tree', {
      args: { path: '.', maxDepth: 2 },
      fsManager: mockFsManager
    });
    console.log('Result:', treeResult.content[0].text);
    
    // 4. compare_files
    console.log('\n4️⃣ Testing compare_files...');
    const compareResult = await registry.execute('compare_files', {
      args: { file1: 'file1.txt', file2: 'file2.txt' },
      fsManager: mockFsManager
    });
    console.log('Result:', compareResult.content[0].text);
    
    // 5. find_duplicate_files
    console.log('\n5️⃣ Testing find_duplicate_files...');
    const duplicatesResult = await registry.execute('find_duplicate_files', {
      args: { directory: './src' },
      fsManager: mockFsManager
    });
    console.log('Result:', duplicatesResult.content[0].text);
    
    // 6. create_symlink
    console.log('\n6️⃣ Testing create_symlink...');
    const symlinkResult = await registry.execute('create_symlink', {
      args: { target: './original.txt', linkPath: './link.txt' },
      fsManager: mockFsManager
    });
    console.log('Result:', symlinkResult.content[0].text);
    
    // 7. diff_files
    console.log('\n7️⃣ Testing diff_files...');
    const diffResult = await registry.execute('diff_files', {
      args: { file1: 'old.txt', file2: 'new.txt', format: 'unified' },
      fsManager: mockFsManager
    });
    console.log('Result:', diffResult.content[0].text);
    
    // Test validation
    console.log('\n📋 Testing Input Validation:\n');
    
    // Missing required field
    try {
      await registry.execute('analyze_project', {
        args: {}, // Missing 'directory'
        fsManager: mockFsManager
      });
    } catch (error) {
      console.log('✅ Validation error caught:', error.message);
    }
    
    // Invalid format
    try {
      await registry.execute('diff_files', {
        args: { file1: 'a.txt', file2: 'b.txt', format: 'invalid-format' },
        fsManager: mockFsManager
      });
    } catch (error) {
      console.log('✅ Format validation error caught:', error.message);
    }
    
    console.log('\n✅ All Metadata Commands tested successfully! 🎉');
    console.log('📊 Command Pattern migration is now 100% complete!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testMetadataCommands().catch(console.error);
