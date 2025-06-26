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

async function installZod() {
  console.log(`${colors.blue}Installing zod...${colors.reset}`);
  
  return new Promise((resolve) => {
    const proc = spawn('npm', ['install', 'zod'], {
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`${colors.green}✓ Zod installed${colors.reset}`);
      }
      resolve(code);
    });
  });
}

async function fixAllIssues() {
  console.log(`\n${colors.blue}Fixing all TypeScript errors...${colors.reset}`);
  
  // 1. Fix BaseCommand.ts
  try {
    const baseCommandPath = path.join(__dirname, 'src/commands/base/BaseCommand.ts');
    let content = await fs.readFile(baseCommandPath, 'utf-8');
    content = content.replace(
      'export { CommandContext, CommandResult }',
      'export type { CommandContext, CommandResult }'
    );
    await fs.writeFile(baseCommandPath, content, 'utf-8');
    console.log('✓ Fixed BaseCommand.ts');
  } catch (err) {
    console.error('✗ BaseCommand.ts:', err.message);
  }
  
  // 2. Fix command.types.ts
  try {
    const typesPath = path.join(__dirname, 'src/types/command.types.ts');
    let content = await fs.readFile(typesPath, 'utf-8');
    content = content.replace(
      "export { CommandResult, CommandContext }",
      "export type { CommandResult, CommandContext }"
    );
    await fs.writeFile(typesPath, content, 'utf-8');
    console.log('✓ Fixed command.types.ts');
  } catch (err) {
    console.error('✗ command.types.ts:', err.message);
  }
  
  // 3. Fix all validateArgs methods
  console.log('\nFixing validateArgs in all command files...');
  const implDir = path.join(__dirname, 'src/commands/implementations');
  
  async function fixValidateArgs(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await fixValidateArgs(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('Command.ts')) {
        try {
          let content = await fs.readFile(fullPath, 'utf-8');
          
          // Fix validateArgs method parameters
          content = content.replace(
            /validateArgs\(args: any\) {/g,
            'validateArgs(args: any) {'
          );
          
          // Inside validateArgs, replace context.args with just args
          const validateArgsRegex = /validateArgs\(args: any\) {[\s\S]*?^  }/gm;
          content = content.replace(validateArgsRegex, (match) => {
            return match
              .replace(/context\.args\./g, 'args.')
              .replace(/this\.assert(\w+)\(context\.args\./g, 'this.assert$1(args.');
          });
          
          await fs.writeFile(fullPath, content, 'utf-8');
          console.log(`  ✓ ${entry.name}`);
        } catch (err) {
          console.error(`  ✗ ${entry.name}:`, err.message);
        }
      }
    }
  }
  
  await fixValidateArgs(implDir);
  
  // 4. Fix core/commands files
  console.log('\nFixing core command files...');
  const coreCommandsDir = path.join(__dirname, 'src/core/commands');
  
  async function fixCoreCommands(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await fixCoreCommands(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        try {
          let content = await fs.readFile(fullPath, 'utf-8');
          
          // Replace fsManager references with this
          content = content
            .replace(/fsManager\./g, 'this.')
            .replace(/return fsManager/g, 'return this')
            .replace(/await fsManager/g, 'await this')
            .replace(/const (\w+) = fsManager/g, 'const $1 = this');
          
          await fs.writeFile(fullPath, content, 'utf-8');
          console.log(`  ✓ ${path.relative(coreCommandsDir, fullPath)}`);
        } catch (err) {
          console.error(`  ✗ ${entry.name}:`, err.message);
        }
      }
    }
  }
  
  await fixCoreCommands(coreCommandsDir);
  
  // 5. Fix GitIntegration.ts
  try {
    const gitPath = path.join(__dirname, 'src/core/GitIntegration.ts');
    let content = await fs.readFile(gitPath, 'utf-8');
    
    // Fix parameter name conflict
    content = content.replace(
      /async gitInit\(path: string = '\.', bare: boolean = false\)/g,
      "async gitInit(targetPath: string = '.', bare: boolean = false)"
    );
    content = content.replace(
      /cwd: path([,}])/g,
      'cwd: targetPath$1'
    );
    
    await fs.writeFile(gitPath, content, 'utf-8');
    console.log('\n✓ Fixed GitIntegration.ts');
  } catch (err) {
    console.error('✗ GitIntegration.ts:', err.message);
  }
  
  // 6. Fix BatchManager.ts
  try {
    const batchPath = path.join(__dirname, 'src/core/BatchManager.ts');
    let content = await fs.readFile(batchPath, 'utf-8');
    
    // Add interface definitions at the top
    const interfaces = `
export interface BatchOperation {
  op: string;
  files?: Array<{ from: string; to?: string; pattern?: string; replacement?: string }>;
  [key: string]: any;
}

export interface BatchResult {
  results: Array<{ success: boolean; operation: string; details?: any; error?: string }>;
  summary: { total: number; successful: number; failed: number };
}

export interface BatchManagerResult {
  success: boolean;
  results: any[];
  errors: string[];
}
`;
    
    if (!content.includes('interface BatchOperation')) {
      // Add after imports
      const importEnd = content.lastIndexOf('import');
      const lineEnd = content.indexOf('\n', importEnd);
      content = content.slice(0, lineEnd + 1) + interfaces + content.slice(lineEnd + 1);
    }
    
    await fs.writeFile(batchPath, content, 'utf-8');
    console.log('✓ Fixed BatchManager.ts');
  } catch (err) {
    console.error('✗ BatchManager.ts:', err.message);
  }
  
  // 7. Fix test files
  console.log('\nFixing test files...');
  const testFixes = [
    {
      file: 'src/tests/commands/FileCommands.test.ts',
      fixes: [
        { from: '../src/core/commands/file/FileCommands.js', to: '../../commands/implementations/file/index.js' },
        { from: '../src/core/commands/Command.js', to: '../../core/interfaces/ICommand.js' }
      ]
    },
    {
      file: 'src/tests/unit/CommandRegistry.test.ts',
      fixes: [
        { from: '../../src/core/commands/CommandRegistry.js', to: '../../commands/registry/CommandRegistry.js' }
      ]
    },
    {
      file: 'src/tests/unit/Transaction.test.ts',
      fixes: [
        { from: '../../src/core/transaction/Transaction.js', to: '../../core/Transaction.js' }
      ]
    }
  ];
  
  for (const test of testFixes) {
    try {
      const testPath = path.join(__dirname, test.file);
      let content = await fs.readFile(testPath, 'utf-8');
      
      for (const fix of test.fixes) {
        content = content.replace(fix.from, fix.to);
      }
      
      await fs.writeFile(testPath, content, 'utf-8');
      console.log(`  ✓ ${test.file}`);
    } catch (err) {
      // File might not exist
    }
  }
  
  // 8. Fix Transaction.ts
  try {
    const transPath = path.join(__dirname, 'src/core/Transaction.ts');
    let content = await fs.readFile(transPath, 'utf-8');
    
    // Add Operation interface if missing
    if (!content.includes('interface Operation')) {
      const opInterface = `
interface Operation {
  type: 'create' | 'write' | 'update' | 'delete' | 'move';
  path: string;
  data?: string;
  destination?: string;
  updates?: Array<{ oldText: string; newText: string }>;
}
`;
      content = opInterface + content;
    }
    
    await fs.writeFile(transPath, content, 'utf-8');
    console.log('\n✓ Fixed Transaction.ts');
  } catch (err) {
    console.error('✗ Transaction.ts:', err.message);
  }
}

async function runBuild() {
  console.log(`\n${colors.blue}Running build...${colors.reset}\n`);
  
  return new Promise((resolve) => {
    const proc = spawn('npm', ['run', 'build'], {
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    proc.on('close', (code) => {
      resolve(code);
    });
  });
}

async function main() {
  console.log(`${colors.magenta}=== Complete Build Fix ===${colors.reset}\n`);
  
  // Step 1: Install zod
  await installZod();
  
  // Step 2: Fix all issues
  await fixAllIssues();
  
  // Step 3: Run build
  const buildResult = await runBuild();
  
  if (buildResult === 0) {
    console.log(`\n${colors.green}✅ Build successful!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}Build still has errors.${colors.reset}`);
    console.log('\nCommon remaining issues:');
    console.log('1. Some command files might need manual schema fixes');
    console.log('2. Service interfaces might need updates');
    console.log('3. Test files might have additional import issues');
    console.log('\nRun "npx tsc" to see remaining errors.');
  }
}

main().catch(console.error);
