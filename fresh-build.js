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
  blue: '\x1b[34m'
};

async function main() {
  console.log(`${colors.blue}Starting fresh build...${colors.reset}\n`);
  
  // Clean dist
  try {
    await fs.rm(path.join(__dirname, 'dist'), { recursive: true, force: true });
    console.log('✓ Cleaned dist directory');
  } catch {}
  
  // Fix imports first
  console.log('\nFixing import paths...');
  await new Promise((resolve) => {
    const proc = spawn('node', ['fix-imports.js'], {
      cwd: __dirname,
      stdio: 'inherit'
    });
    proc.on('close', resolve);
  });
  
  // Run build
  console.log('\nRunning TypeScript build...\n');
  
  const buildProc = spawn('npx', ['tsc'], {
    cwd: __dirname,
    shell: true
  });
  
  let output = '';
  let hasErrors = false;
  
  buildProc.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(text);
  });
  
  buildProc.stderr.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stderr.write(text);
    if (text.includes('error TS')) {
      hasErrors = true;
    }
  });
  
  buildProc.on('close', async (code) => {
    if (code === 0) {
      console.log(`\n${colors.green}✅ Build successful!${colors.reset}`);
      
      // Check what was built
      try {
        const distFiles = await fs.readdir(path.join(__dirname, 'dist'), { recursive: true });
        console.log(`\nBuilt ${distFiles.length} files`);
      } catch {}
      
    } else {
      console.log(`\n${colors.red}❌ Build failed with code ${code}${colors.reset}`);
      
      // Save full output
      await fs.writeFile(
        path.join(__dirname, 'build-output.log'),
        output,
        'utf-8'
      );
      
      console.log('\nFull output saved to build-output.log');
      
      // Parse and show specific errors
      const lines = output.split('\n');
      const errors = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('error TS')) {
          errors.push({
            line: line,
            context: lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 3))
          });
        }
      }
      
      if (errors.length > 0) {
        console.log(`\n${colors.yellow}First few errors:${colors.reset}\n`);
        
        errors.slice(0, 3).forEach((error, idx) => {
          console.log(`Error ${idx + 1}:`);
          error.context.forEach(line => console.log(`  ${line}`));
          console.log('');
        });
        
        if (errors.length > 3) {
          console.log(`... and ${errors.length - 3} more errors\n`);
        }
      }
      
      console.log(`${colors.yellow}Next steps:${colors.reset}`);
      console.log('1. Check build-output.log for all errors');
      console.log('2. Fix missing imports or type errors');
      console.log('3. Run this script again');
    }
  });
}

main().catch(console.error);
