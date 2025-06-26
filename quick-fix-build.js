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

async function main() {
  console.log(`${colors.magenta}=== Quick Build Fix ===${colors.reset}\n`);
  
  // Option 1: Install zod (fastest solution)
  console.log(`${colors.blue}Option 1: Install zod package${colors.reset}`);
  console.log('This is the fastest way to fix the build.\n');
  
  console.log('Run: npm install zod\n');
  
  // Option 2: Quick fixes without zod
  console.log(`${colors.blue}Option 2: Quick fixes without zod${colors.reset}`);
  console.log('1. Fix export type in BaseCommand.ts');
  console.log('2. Fix basic type errors');
  console.log('3. Run the detailed fix script\n');
  
  console.log(`${colors.yellow}Which option do you prefer?${colors.reset}`);
  console.log('1. Install zod and continue (recommended)');
  console.log('2. Remove zod and fix manually\n');
  
  // Let's do the minimum fixes first
  console.log(`${colors.green}Applying minimal fixes...${colors.reset}\n`);
  
  // Fix 1: BaseCommand export type
  try {
    const baseCommandPath = path.join(__dirname, 'src/commands/base/BaseCommand.ts');
    let content = await fs.readFile(baseCommandPath, 'utf-8');
    content = content.replace(
      'export { CommandContext, CommandResult }',
      'export type { CommandContext, CommandResult }'
    );
    await fs.writeFile(baseCommandPath, content, 'utf-8');
    console.log('✓ Fixed BaseCommand.ts export types');
  } catch (err) {
    console.error('✗ Could not fix BaseCommand.ts:', err.message);
  }
  
  // Fix 2: Create a temporary zod mock
  console.log('\n' + colors.yellow + 'Creating temporary zod mock...' + colors.reset);
  
  const zodMockContent = `// Temporary mock for zod
export const z = {
  object: (schema) => ({
    parse: (data) => data,
    shape: schema
  }),
  string: () => ({ parse: (v) => v }),
  number: () => ({ parse: (v) => v }),
  boolean: () => ({ parse: (v) => v }),
  array: (schema) => ({ parse: (v) => v }),
  optional: (schema) => schema,
  default: (schema, defaultValue) => schema,
  enum: (values) => ({ parse: (v) => v }),
  record: (key, value) => ({ parse: (v) => v }),
  union: (schemas) => ({ parse: (v) => v }),
  effects: (schema, fn) => schema,
  infer: (schema) => ({})
};

export type infer<T> = any;
`;
  
  try {
    const zodPath = path.join(__dirname, 'src/types/zod-mock.ts');
    await fs.writeFile(zodPath, zodMockContent, 'utf-8');
    console.log('✓ Created temporary zod mock');
    
    // Update imports to use the mock
    console.log('\nUpdating imports to use zod mock...');
    
    const updateImports = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !['node_modules', 'dist'].includes(entry.name)) {
          await updateImports(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          try {
            let content = await fs.readFile(fullPath, 'utf-8');
            if (content.includes("from 'zod'")) {
              content = content.replace(
                /from 'zod'/g,
                "from '../../types/zod-mock.js'"
              );
              await fs.writeFile(fullPath, content, 'utf-8');
              console.log(`  Updated ${path.relative(__dirname, fullPath)}`);
            }
          } catch (err) {
            // Ignore
          }
        }
      }
    };
    
    // Don't update imports for now - too complex
    // await updateImports(path.join(__dirname, 'src'));
    
  } catch (err) {
    console.error('✗ Could not create zod mock:', err.message);
  }
  
  console.log(`\n${colors.green}Recommendation:${colors.reset}`);
  console.log('The easiest solution is to install zod:\n');
  console.log('  npm install zod');
  console.log('\nThen run:');
  console.log('  node fix-commands-detailed.js');
  console.log('  npm run build');
  
  console.log(`\n${colors.yellow}Alternative:${colors.reset}`);
  console.log('If you want to remove zod completely:');
  console.log('  node fix-commands-detailed.js');
  console.log('  npm run build');
  console.log('\nThis will require more manual fixes.');
}

main().catch(console.error);
