// Debug script to check Phase 1 functionality
import { createCommandRegistry } from './src/core/commands/index.js';

console.log('🔍 Phase 1 Debug Check\n');

try {
  // Create registry
  const registry = createCommandRegistry();
  
  console.log(`✅ Registry created successfully`);
  console.log(`📊 Total commands registered: ${registry.size}`);
  
  // Expected 39 commands
  const expectedCount = 39;
  if (registry.size === expectedCount) {
    console.log(`✅ Command count matches expected: ${expectedCount}`);
  } else {
    console.log(`⚠️  Command count mismatch! Expected: ${expectedCount}, Got: ${registry.size}`);
  }
  
  // List all commands by category
  const categories = {
    'File Commands (5)': ['read_file', 'read_files', 'write_file', 'update_file', 'move_file'],
    'Search Commands (6)': ['search_files', 'search_content', 'search_by_date', 'search_by_size', 'fuzzy_search', 'semantic_search'],
    'Git Commands (2)': ['git_status', 'git_commit'],
    'Code Analysis (2)': ['analyze_code', 'modify_code'],
    'Transaction (1)': ['create_transaction'],
    'File Watcher (3)': ['start_watching', 'stop_watching', 'get_watcher_stats'],
    'Archive (2)': ['compress_files', 'extract_archive'],
    'System (1)': ['get_filesystem_stats'],
    'Batch (1)': ['batch_operations'],
    'Refactoring (3)': ['suggest_refactoring', 'auto_format_project', 'analyze_code_quality'],
    'Cloud (1)': ['sync_with_cloud'],
    'Security (5)': ['change_permissions', 'encrypt_file', 'decrypt_file', 'scan_secrets', 'security_audit'],
    'Metadata (7)': ['analyze_project', 'get_file_metadata', 'get_directory_tree', 'compare_files', 'find_duplicate_files', 'create_symlink', 'diff_files']
  };
  
  console.log('\n📋 Command Registration Check:');
  let totalFound = 0;
  let totalMissing = 0;
  
  for (const [category, commands] of Object.entries(categories)) {
    console.log(`\n${category}:`);
    for (const cmd of commands) {
      if (registry.has(cmd)) {
        console.log(`  ✅ ${cmd}`);
        totalFound++;
      } else {
        console.log(`  ❌ ${cmd} - NOT REGISTERED!`);
        totalMissing++;
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Found: ${totalFound}`);
  console.log(`  ❌ Missing: ${totalMissing}`);
  console.log(`  📝 Total Expected: ${expectedCount}`);
  
  // Show all registered commands
  console.log('\n📜 All Registered Commands:');
  const allCommands = registry.getCommandNames().sort();
  allCommands.forEach((cmd, i) => {
    console.log(`  ${i + 1}. ${cmd}`);
  });
  
  // Test one command to see if it works
  console.log('\n🧪 Testing basic functionality...');
  const testCommand = registry.get('read_file');
  if (testCommand) {
    console.log(`✅ Can retrieve 'read_file' command`);
    console.log(`   Name: ${testCommand.name}`);
    console.log(`   Description: ${testCommand.description}`);
  } else {
    console.log(`❌ Cannot retrieve 'read_file' command`);
  }
  
} catch (error) {
  console.error('\n❌ Error:', error);
  console.error('Stack:', error.stack);
}