#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

async function removeZodImports() {
  console.log(`${colors.blue}Removing zod imports and replacing with plain schemas...${colors.reset}\n`);
  
  const filesToFix = [
    'src/commands/implementations/git/GitInitCommand.ts',
    'src/commands/implementations/git/GitAddCommand.ts',
    'src/commands/implementations/git/GitCommitCommand.ts',
    'src/commands/implementations/git/GitPushCommand.ts',
    'src/commands/implementations/git/GitPullCommand.ts',
    'src/commands/implementations/git/GitBranchCommand.ts',
    'src/commands/implementations/git/GitCheckoutCommand.ts',
    'src/commands/implementations/git/GitLogCommand.ts',
    'src/commands/implementations/git/GitCloneCommand.ts',
    'src/commands/implementations/git/GitStatusCommand.ts',
    'src/commands/implementations/git/GitHubCreatePRCommand.ts'
  ];
  
  let fixedCount = 0;
  
  for (const file of filesToFix) {
    const filePath = path.join(__dirname, file);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      if (content.includes("from 'zod'") || content.includes('from "zod"')) {
        // Remove zod import and schema
        let newContent = content
          .replace(/import\s*{\s*z\s*}\s*from\s*['"]zod['"];?\n?/g, '')
          .replace(/const\s+\w+Schema\s*=\s*z\.object\([^)]+\);?\n?/g, '')
          .replace(/type\s+\w+Args\s*=\s*z\.infer<typeof\s+\w+Schema>;?\n?/g, '');
        
        // Fix the inputSchema to use plain object
        if (!newContent.includes('inputSchema = {')) {
          newContent = newContent.replace(
            /inputSchema\s*=\s*\w+Schema;?/,
            `inputSchema = {
    type: 'object',
    properties: {
      // Add properties based on command
    }
  };`
          );
        }
        
        await fs.writeFile(filePath, newContent, 'utf-8');
        console.log(`${colors.green}✓ Fixed ${file}${colors.reset}`);
        fixedCount++;
      }
    } catch (err) {
      console.log(`${colors.yellow}⚠ Could not process ${file}: ${err.message}${colors.reset}`);
    }
  }
  
  return fixedCount;
}

async function runBuild() {
  return new Promise((resolve) => {
    const proc = spawn('npm', ['run', 'build'], {
      cwd: __dirname,
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    proc.on('close', (code) => {
      resolve({
        code,
        output,
        errorOutput,
        fullOutput: output + errorOutput
      });
    });
  });
}

async function main() {
  console.log(`${colors.magenta}=== Quick Fix for AI FileSystem MCP ===${colors.reset}\n`);
  
  // Step 1: Check for problematic imports
  console.log(`${colors.blue}Step 1: Checking for import issues${colors.reset}`);
  const { spawn: nodeSpawn } = await import('child_process');
  const checkProc = nodeSpawn('node', ['check-real-imports.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  await new Promise(resolve => checkProc.on('close', resolve));
  
  // Step 2: Fix zod imports
  console.log(`\n${colors.blue}Step 2: Fixing zod imports${colors.reset}`);
  const fixedCount = await removeZodImports();
  
  if (fixedCount > 0) {
    console.log(`\nFixed ${fixedCount} files`);
  }
  
  // Step 3: Fix imports
  console.log(`\n${colors.blue}Step 3: Fixing import paths${colors.reset}`);
  const fixImportsProc = nodeSpawn('node', ['fix-imports.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  await new Promise(resolve => fixImportsProc.on('close', resolve));
  
  // Step 4: Clean and build
  console.log(`\n${colors.blue}Step 4: Building project${colors.reset}`);
  console.log('Cleaning dist directory...');
  
  try {
    await fs.rm(path.join(__dirname, 'dist'), { recursive: true, force: true });
  } catch {
    // Ignore
  }
  
  console.log('Running TypeScript build...\n');
  const buildResult = await runBuild();
  
  if (buildResult.code === 0) {
    console.log(`\n${colors.green}✅ Build successful!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ Build failed${colors.reset}`);
    
    // Save error log
    await fs.writeFile(
      path.join(__dirname, 'build-errors.log'),
      buildResult.fullOutput,
      'utf-8'
    );
    
    console.log('\nError log saved to build-errors.log');
    console.log('\nShowing first few errors:');
    
    const lines = buildResult.fullOutput.split('\n');
    const errorLines = lines.filter(line => line.includes('error TS'));
    
    errorLines.slice(0, 5).forEach(line => {
      console.log(`  ${line}`);
    });
    
    if (errorLines.length > 5) {
      console.log(`  ... and ${errorLines.length - 5} more errors`);
    }
  }
}

main().catch(console.error);
