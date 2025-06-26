#!/usr/bin/env node
/**
 * PHASE1 최종 빌드 스크립트
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { 
      stdio: 'inherit',
      shell: true 
    });
    
    proc.on('close', (code) => {
      resolve(code);
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  console.log(`${colors.blue}╔═══════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║           PHASE1 Final Build Script               ║${colors.reset}`);
  console.log(`${colors.blue}╚═══════════════════════════════════════════════════╝${colors.reset}\n`);
  
  // 1. Clean up
  console.log('1️⃣ Cleaning up...');
  
  // Remove problematic files
  const filesToRemove = [
    'src/core/GitIntegration-additions.ts',
    'src/core/ASTProcessor-improved.ts'
  ];
  
  for (const file of filesToRemove) {
    if (await fileExists(file)) {
      await fs.unlink(file);
      console.log(`   ${colors.yellow}Removed: ${file}${colors.reset}`);
    }
  }
  
  // Clean dist directory
  if (await fileExists('dist')) {
    await fs.rm('dist', { recursive: true, force: true });
    console.log(`   ${colors.yellow}Cleaned: dist directory${colors.reset}`);
  }
  
  console.log(`   ${colors.green}✅ Cleanup complete${colors.reset}\n`);
  
  // 2. Build
  console.log('2️⃣ Building project...');
  const buildResult = await runCommand('npm', ['run', 'build']);
  
  if (buildResult !== 0) {
    console.log(`\n${colors.red}❌ Build failed${colors.reset}`);
    console.log('Please check the error messages above.');
    process.exit(1);
  }
  
  console.log(`   ${colors.green}✅ Build successful${colors.reset}\n`);
  
  // 3. Verify build output
  console.log('3️⃣ Verifying build output...');
  
  const criticalFiles = [
    'dist/index.js',
    'dist/core/FileSystemManager.js',
    'dist/core/commands/index.js',
    'dist/core/GitIntegration.js'
  ];
  
  let allBuilt = true;
  for (const file of criticalFiles) {
    if (await fileExists(file)) {
      console.log(`   ${colors.green}✅ ${file}${colors.reset}`);
    } else {
      console.log(`   ${colors.red}❌ ${file}${colors.reset}`);
      allBuilt = false;
    }
  }
  
  if (!allBuilt) {
    console.log(`\n${colors.red}Some files were not built${colors.reset}`);
    process.exit(1);
  }
  
  // 4. Test command registry
  console.log('\n4️⃣ Testing command registry...');
  
  try {
    const { createCommandRegistry } = await import('./dist/core/commands/index.js');
    const registry = createCommandRegistry();
    
    console.log(`   ${colors.green}✅ Registry loaded${colors.reset}`);
    console.log(`   ${colors.blue}Total commands: ${registry.size}${colors.reset}`);
    
    // Count by category
    const categories = {
      file: 0,
      directory: 0,
      search: 0,
      git: 0,
      utility: 0,
      code: 0,
      security: 0,
      metadata: 0,
      other: 0
    };
    
    const commands = Array.from(registry.commands.keys());
    commands.forEach(cmd => {
      if (cmd.includes('file') || ['read_file', 'write_file', 'update_file', 'move_file'].includes(cmd)) {
        categories.file++;
      } else if (cmd.includes('directory')) {
        categories.directory++;
      } else if (cmd.includes('search')) {
        categories.search++;
      } else if (cmd.includes('git')) {
        categories.git++;
      } else if (['touch', 'copy_file', 'delete_files', 'pwd', 'disk_usage', 'watch_directory'].includes(cmd)) {
        categories.utility++;
      } else if (cmd.includes('code') || cmd.includes('analyze')) {
        categories.code++;
      } else if (cmd.includes('security') || cmd.includes('encrypt') || cmd.includes('permission')) {
        categories.security++;
      } else if (cmd.includes('metadata') || cmd.includes('project') || cmd.includes('compare') || cmd.includes('diff')) {
        categories.metadata++;
      } else {
        categories.other++;
      }
    });
    
    console.log('\n   Command breakdown:');
    Object.entries(categories).forEach(([cat, count]) => {
      if (count > 0) {
        console.log(`   - ${cat}: ${count}`);
      }
    });
    
    if (registry.size === 58) {
      console.log(`\n   ${colors.green}✨ Perfect! All 58 commands registered${colors.reset}`);
    } else if (registry.size > 50) {
      console.log(`\n   ${colors.yellow}⚠️  Expected 58 commands, found ${registry.size}${colors.reset}`);
    } else {
      console.log(`\n   ${colors.red}❌ Only ${registry.size} commands registered (expected 58)${colors.reset}`);
    }
    
  } catch (error) {
    console.log(`   ${colors.red}❌ Failed to load registry: ${error.message}${colors.reset}`);
    process.exit(1);
  }
  
  // 5. Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✅ PHASE1 Build Complete!${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);
  
  console.log('Next steps:');
  console.log('1. Run tests: npm run test:all');
  console.log('2. Test new commands: node test-new-commands.js');
  console.log('3. Full validation: node phase1-final-check.js');
}

main().catch(error => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
