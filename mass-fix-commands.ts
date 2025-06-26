// Mass fix all command files
import { promises as fs } from 'fs';
import * as path from 'path';

async function getAllCommandFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getAllCommandFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('index.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function fixFile(filePath: string) {
  let content = await fs.readFile(filePath, 'utf-8');
  
  // Skip if not a command file
  if (!content.includes('extends BaseCommand')) return false;
  
  console.log(`Fixing: ${filePath}`);
  
  // 1. Fix imports
  content = content.replace(
    "import { CommandResult } from '../../../types/command.types.js';",
    "import { CommandResult, CommandContext } from '../../../types/command.types.js';"
  );
  
  // 2. Remove generic from BaseCommand
  content = content.replace(/extends BaseCommand<[^>]*>/g, 'extends BaseCommand');
  
  // 3. Replace execute method
  const executeMatch = content.match(/async execute\(args: ([^)]+)\): Promise<CommandResult>/);
  if (executeMatch) {
    // Replace method signature
    content = content.replace(
      /async execute\(args: [^)]*\): Promise<CommandResult>/,
      'async executeCommand(context: CommandContext): Promise<CommandResult>'
    );
    
    // Replace this.context.container with context.container
    content = content.replace(/this\.context\.container/g, 'context.container');
    
    // Replace args. with context.args.
    // But be careful with the replacement
    content = content.replace(/(\s+)args\./g, '$1context.args.');
    content = content.replace(/\(args\./g, '(context.args.');
    content = content.replace(/\{args\./g, '{context.args.');
    content = content.replace(/,\s*args\./g, ', context.args.');
    content = content.replace(/`([^`]*)\$\{args\./g, '`$1${context.args.');
  }
  
  await fs.writeFile(filePath, content);
  return true;
}

async function main() {
  console.log('🔧 Mass fixing command files...\n');
  
  const baseDir = 'src/commands/implementations';
  const files = await getAllCommandFiles(baseDir);
  
  let fixed = 0;
  for (const file of files) {
    if (await fixFile(file)) {
      fixed++;
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} command files!`);
}

main().catch(console.error);
