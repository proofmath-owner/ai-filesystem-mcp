#!/usr/bin/env node

import { execSync } from 'child_process';
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
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

async function main() {
  console.log(`${colors.cyan}Running TypeScript build...${colors.reset}\n`);
  
  try {
    execSync('npx tsc', {
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    console.log(`\n${colors.green}Build successful!${colors.reset}`);
  } catch (err) {
    console.log(`\n${colors.red}Build failed. Check the errors above.${colors.reset}`);
    
    console.log(`\n${colors.yellow}Common fixes:${colors.reset}`);
    console.log('1. Add .js extensions to imports: node fix-imports.js');
    console.log('2. Check for missing files');
    console.log('3. Run: npm install');
    
    process.exit(1);
  }
}

main();
