#!/usr/bin/env node

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function runCommand(command, args) {
  return new Promise((resolve) => {
    console.log(`${colors.blue}Running: ${command} ${args.join(' ')}${colors.reset}\n`);
    
    const proc = spawn(command, args, {
      cwd: __dirname,
      shell: true,
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });
    
    proc.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
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

async function analyzeTypeScriptErrors(output) {
  const errors = [];
  const lines = output.split('\n');
  
  const errorPattern = /^(.+\.ts)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(errorPattern);
    
    if (match) {
      const error = {
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        code: match[4],
        message: match[5],
        context: []
      };
      
      // Get context lines
      for (let j = i + 1; j < lines.length && j < i + 4; j++) {
        if (!lines[j].match(errorPattern)) {
          error.context.push(lines[j]);
        } else {
          break;
        }
      }
      
      errors.push(error);
    }
  }
  
  return errors;
}

async function suggestFixes(errors) {
  const suggestions = {
    imports: [],
    types: [],
    syntax: [],
    other: []
  };
  
  for (const error of errors) {
    if (error.code === 'TS2307') { // Cannot find module
      suggestions.imports.push({
        error,
        fix: 'Add .js extension or install missing package'
      });
    } else if (error.code === 'TS2304') { // Cannot find name
      suggestions.types.push({
        error,
        fix: 'Import the type or define it'
      });
    } else if (error.code === 'TS1005') { // Syntax error
      suggestions.syntax.push({
        error,
        fix: 'Check syntax'
      });
    } else {
      suggestions.other.push({
        error,
        fix: 'Check TypeScript documentation'
      });
    }
  }
  
  return suggestions;
}

async function main() {
  console.log(`${colors.magenta}=== TypeScript Build Diagnostics ===${colors.reset}\n`);
  
  // Clean dist directory
  console.log(`${colors.yellow}Cleaning dist directory...${colors.reset}`);
  try {
    await fs.rm(path.join(__dirname, 'dist'), { recursive: true, force: true });
  } catch {
    // Ignore if doesn't exist
  }
  
  // Run TypeScript compiler
  const result = await runCommand('npx', ['tsc', '--pretty']);
  
  if (result.code === 0) {
    console.log(`\n${colors.green}✅ Build successful!${colors.reset}`);
    
    // Check dist output
    try {
      const distFiles = await fs.readdir(path.join(__dirname, 'dist'), { recursive: true });
      console.log(`\nGenerated ${distFiles.length} files in dist/`);
    } catch {
      console.log('\nNo dist directory found');
    }
    
    return;
  }
  
  // Analyze errors
  console.log(`\n${colors.red}❌ Build failed${colors.reset}\n`);
  
  const errors = await analyzeTypeScriptErrors(result.fullOutput);
  console.log(`Found ${errors.length} errors\n`);
  
  // Group errors by type
  const errorsByCode = {};
  for (const error of errors) {
    if (!errorsByCode[error.code]) {
      errorsByCode[error.code] = [];
    }
    errorsByCode[error.code].push(error);
  }
  
  // Show error summary
  console.log(`${colors.yellow}Error Summary:${colors.reset}`);
  for (const [code, errs] of Object.entries(errorsByCode)) {
    console.log(`  ${code}: ${errs.length} errors`);
  }
  
  // Show first few errors of each type
  console.log(`\n${colors.yellow}Sample Errors:${colors.reset}\n`);
  
  for (const [code, errs] of Object.entries(errorsByCode)) {
    console.log(`${colors.blue}${code} errors:${colors.reset}`);
    
    for (const error of errs.slice(0, 2)) {
      console.log(`  ${error.file}:${error.line}:${error.column}`);
      console.log(`    ${error.message}`);
      
      if (error.context.length > 0) {
        for (const ctx of error.context.slice(0, 2)) {
          if (ctx.trim()) {
            console.log(`    ${ctx}`);
          }
        }
      }
      console.log('');
    }
    
    if (errs.length > 2) {
      console.log(`  ... and ${errs.length - 2} more\n`);
    }
  }
  
  // Save full error log
  const logPath = path.join(__dirname, 'build-errors.log');
  await fs.writeFile(logPath, result.fullOutput, 'utf-8');
  console.log(`${colors.blue}Full error log saved to: ${logPath}${colors.reset}\n`);
  
  // Provide action items
  console.log(`${colors.magenta}Suggested Actions:${colors.reset}\n`);
  
  if (errorsByCode['TS2307']) { // Cannot find module
    console.log('1. Fix missing imports:');
    console.log('   - Run: node fix-imports.js');
    console.log('   - Check if packages are installed: npm install');
  }
  
  if (errorsByCode['TS2304'] || errorsByCode['TS2339']) { // Cannot find name/property
    console.log('\n2. Fix missing types:');
    console.log('   - Import missing types');
    console.log('   - Define interfaces/types');
  }
  
  console.log('\n3. Quick fixes:');
  console.log('   - Run: node check-dependencies.js');
  console.log('   - Run: node fix-imports.js');
  console.log('   - Run: npm install');
}

main().catch(console.error);
