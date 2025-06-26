import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

async function fixAllTypeScriptErrors() {
  const baseDir = '/Users/sangbinna/mcp/ai-filesystem-mcp';
  
  // 1. Fix validateArgs methods
  console.log('Fixing validateArgs methods...');
  const commandFiles = await glob('src/commands/implementations/**/*.ts', { cwd: baseDir });
  
  for (const file of commandFiles) {
    const filePath = path.join(baseDir, file);
    let content = await fs.readFile(filePath, 'utf8');
    let modified = false;
    
    // Fix validateArgs method
    const validateArgsRegex = /(protected validateArgs\(args: Record<string, any>\): void \{[\s\S]*?)context\.args\./g;
    if (validateArgsRegex.test(content)) {
      content = content.replace(validateArgsRegex, '$1args.');
      modified = true;
    }
    
    if (modified) {
      await fs.writeFile(filePath, content);
      console.log(`  Fixed: ${path.basename(filePath)}`);
    }
  }
  
  // 2. Fix CommandResult data property issues
  console.log('\nFixing CommandResult type issues...');
  
  // Fix BatchOperationsCommand
  const batchCmdPath = path.join(baseDir, 'src/commands/implementations/batch/BatchOperationsCommand.ts');
  let batchContent = await fs.readFile(batchCmdPath, 'utf8');
  batchContent = batchContent.replace(
    /return \{\s*data: \{/g,
    'return this.formatResult({'
  );
  await fs.writeFile(batchCmdPath, batchContent);
  
  // Fix ExecuteShellCommand
  const shellCmdPath = path.join(baseDir, 'src/commands/implementations/security/ExecuteShellCommand.ts');
  let shellContent = await fs.readFile(shellCmdPath, 'utf8');
  shellContent = shellContent.replace(
    /return \{\s*data: formattedResult,/g,
    'return this.formatResult(formattedResult);'
  );
  await fs.writeFile(shellCmdPath, shellContent);
  
  // 3. Fix BatchManager
  console.log('\nFixing BatchManager...');
  const batchMgrPath = path.join(baseDir, 'src/core/BatchManager.ts');
  let batchMgrContent = await fs.readFile(batchMgrPath, 'utf8');
  
  // Fix BatchResult initialization
  batchMgrContent = batchMgrContent.replace(
    /const (?:overallResult|result): BatchResult = \{\s*processed: 0,/g,
    'const result: BatchResult = {\n      success: true,\n      processed: 0,'
  );
  
  // Fix result.results.push with error
  batchMgrContent = batchMgrContent.replace(
    /result\.results\.push\(\{\s*file: ([^,]+),\s*error: ([^}]+)\s*\}\)/g,
    'result.results.push({\n        file: $1,\n        success: false,\n        error: $2\n      })'
  );
  
  // Fix result.results.push with newPath
  batchMgrContent = batchMgrContent.replace(
    /result\.results\.push\(\{\s*file: ([^,]+),\s*newPath: ([^}]+)\s*\}\)/g,
    'result.results.push({\n        file: $1,\n        success: true,\n        newPath: $2\n      })'
  );
  
  await fs.writeFile(batchMgrPath, batchMgrContent);
  
  // 4. Fix undefined variables
  console.log('\nFixing undefined variables...');
  
  // Fix GitHubCreatePRCommand
  const ghPrPath = path.join(baseDir, 'src/commands/implementations/git/GitHubCreatePRCommand.ts');
  let ghPrContent = await fs.readFile(ghPrPath, 'utf8');
  ghPrContent = ghPrContent.replace(
    /await gitService\.createPullRequest\(args\)/g,
    'await gitService.createPullRequest(context.args)'
  );
  await fs.writeFile(ghPrPath, ghPrContent);
  
  // Fix GitLogCommand
  const gitLogPath = path.join(baseDir, 'src/commands/implementations/git/GitLogCommand.ts');
  let gitLogContent = await fs.readFile(gitLogPath, 'utf8');
  gitLogContent = gitLogContent.replace(
    /await gitService\.gitLog\(args\)/g,
    'await gitService.gitLog(context.args)'
  );
  await fs.writeFile(gitLogPath, gitLogContent);
  
  // 5. Add missing z import
  console.log('\nAdding missing imports...');
  const changePermsPath = path.join(baseDir, 'src/commands/implementations/utils/ChangePermissionsCommand.ts');
  let changePermsContent = await fs.readFile(changePermsPath, 'utf8');
  if (!changePermsContent.includes("import { z }")) {
    changePermsContent = `import { z } from 'zod';\n${changePermsContent}`;
    await fs.writeFile(changePermsPath, changePermsContent);
  }
  
  console.log('\nDone! All TypeScript errors should be fixed.');
}

fixAllTypeScriptErrors().catch(console.error);
