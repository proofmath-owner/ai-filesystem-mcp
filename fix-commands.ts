import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

async function fixCommandFiles() {
  console.log('🔧 Fixing command files...\n');
  
  // Find all command files
  const files = await glob('src/commands/implementations/**/*.ts');
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    let modified = content;
    
    // Skip index files
    if (file.endsWith('index.ts')) continue;
    
    // Check if it's a command file
    if (!content.includes('extends BaseCommand')) continue;
    
    console.log(`Fixing: ${file}`);
    
    // 1. Remove generic from BaseCommand
    modified = modified.replace(/extends BaseCommand<[^>]*>/g, 'extends BaseCommand');
    
    // 2. Replace execute method signature
    modified = modified.replace(
      /async execute\(args: [^)]*\): Promise<CommandResult>/g,
      'async executeCommand(context: CommandContext): Promise<CommandResult>'
    );
    
    // 3. Replace this.context.container with context.container
    modified = modified.replace(/this\.context\.container/g, 'context.container');
    
    // 4. Replace args. with context.args. (but not in type definitions)
    // Be careful not to replace in interfaces or type definitions
    modified = modified.replace(/(\s+)args\./g, '$1context.args.');
    modified = modified.replace(/\(args\./g, '(context.args.');
    modified = modified.replace(/\{args\./g, '{context.args.');
    
    // 5. Add CommandContext import if missing
    if (!modified.includes('CommandContext') && modified.includes('executeCommand')) {
      modified = modified.replace(
        "import { CommandResult } from '../../../types/command.types.js';",
        "import { CommandResult, CommandContext } from '../../../types/command.types.js';"
      );
    }
    
    // Write back
    if (modified !== content) {
      fs.writeFileSync(file, modified);
      console.log(`✅ Fixed: ${file}`);
    }
  }
  
  console.log('\n✅ All command files fixed!');
}

// Run the fix
fixCommandFiles().catch(console.error);
