import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const BASE_DIR = '/Users/sangbinna/mcp/ai-filesystem-mcp';

async function fixAllValidateArgs() {
  console.log('Fixing all validateArgs methods...');
  
  const files = glob.sync('src/commands/implementations/**/*.ts', { 
    cwd: BASE_DIR,
    absolute: true 
  });
  
  let fixedCount = 0;
  
  for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix validateArgs method - replace context.args with args
    if (content.includes('protected validateArgs(args: Record<string, any>): void {')) {
      const lines = content.split('\n');
      let inValidateArgs = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes('protected validateArgs(args: Record<string, any>): void {')) {
          inValidateArgs = true;
        } else if (inValidateArgs && line === '  }') {
          inValidateArgs = false;
        } else if (inValidateArgs) {
          lines[i] = line.replace(/context\.args\./g, 'args.');
        }
      }
      
      content = lines.join('\n');
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`  Fixed: ${path.basename(filePath)}`);
      fixedCount++;
    }
  }
  
  console.log(`Fixed ${fixedCount} files with validateArgs issues\n`);
}

async function fixAllErrors() {
  // 1. Fix validateArgs
  await fixAllValidateArgs();
  
  // 2. Fix specific files
  console.log('Fixing specific file issues...');
  
  // Fix GitHubCreatePRCommand
  const ghPrPath = path.join(BASE_DIR, 'src/commands/implementations/git/GitHubCreatePRCommand.ts');
  if (fs.existsSync(ghPrPath)) {
    let content = fs.readFileSync(ghPrPath, 'utf8');
    content = content.replace(
      'const pr = await gitService.createPullRequest(args);',
      'const pr = await gitService.createPullRequest(context.args);'
    );
    fs.writeFileSync(ghPrPath, content);
    console.log('  Fixed GitHubCreatePRCommand');
  }
  
  // Fix GitLogCommand
  const gitLogPath = path.join(BASE_DIR, 'src/commands/implementations/git/GitLogCommand.ts');
  if (fs.existsSync(gitLogPath)) {
    let content = fs.readFileSync(gitLogPath, 'utf8');
    content = content.replace(
      'const commits = await gitService.gitLog(args);',
      'const commits = await gitService.gitLog(context.args);'
    );
    fs.writeFileSync(gitLogPath, content);
    console.log('  Fixed GitLogCommand');
  }
  
  // 3. Fix BatchManager
  console.log('\nFixing BatchManager...');
  const batchMgrPath = path.join(BASE_DIR, 'src/core/BatchManager.ts');
  if (fs.existsSync(batchMgrPath)) {
    let content = fs.readFileSync(batchMgrPath, 'utf8');
    
    // Already fixed in previous steps
    console.log('  BatchManager already fixed');
  }
  
  // 4. Fix CommandResult data issues
  console.log('\nFixing CommandResult data issues...');
  
  // BatchOperationsCommand already fixed
  // ExecuteShellCommand already fixed
  
  console.log('\nAll fixes completed!');
}

fixAllErrors().catch(console.error);
