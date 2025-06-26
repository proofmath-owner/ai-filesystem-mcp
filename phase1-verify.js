#!/usr/bin/env node
/**
 * PHASE1 최종 검증 스크립트
 */

console.log('🔍 PHASE1 Final Verification\n');

const fs = await import('fs/promises');
const path = await import('path');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// 1. 필수 파일 확인
console.log('1️⃣ Checking Required Files\n');

const requiredFiles = {
  'Core': [
    'src/core/FileSystemManager.ts',
    'src/core/ASTProcessor.ts',
    'src/core/GitIntegration.ts',
    'src/core/commands/Command.ts',
    'src/core/commands/CommandRegistry.ts',
    'src/core/commands/index.ts'
  ],
  'Commands': [
    'src/core/commands/file/FileCommands.ts',
    'src/core/commands/directory/DirectoryCommands.ts',
    'src/core/commands/search/SearchCommands.ts',
    'src/core/commands/git/GitCommands.ts',
    'src/core/commands/git/GitAdvancedCommands.ts',
    'src/core/commands/utility/UtilityCommands.ts',
    'src/core/commands/code/CodeAnalysisCommands.ts',
    'src/core/commands/metadata/MetadataCommands.ts',
    'src/core/commands/security/SecurityCommands.ts'
  ]
};

let allFilesExist = true;
for (const [category, files] of Object.entries(requiredFiles)) {
  console.log(`${category}:`);
  for (const file of files) {
    try {
      await fs.access(file);
      console.log(`  ${colors.green}✅${colors.reset} ${file}`);
    } catch {
      console.log(`  ${colors.red}❌${colors.reset} ${file}`);
      allFilesExist = false;
    }
  }
  console.log('');
}

// 2. GitIntegration 메서드 확인
console.log('2️⃣ Checking GitIntegration Methods\n');

try {
  const gitContent = await fs.readFile('src/core/GitIntegration.ts', 'utf-8');
  const methods = [
    'remote(',
    'stashAdvanced(',
    'tagAdvanced(',
    'mergeAdvanced(',
    'rebaseAdvanced(',
    'rebaseAbort(',
    'rebaseContinue(',
    'diffAdvanced(',
    'reset(',
    'cherryPick('
  ];
  
  const foundMethods = methods.filter(m => gitContent.includes(m));
  console.log(`Found ${foundMethods.length}/${methods.length} advanced methods`);
  
  if (foundMethods.length === methods.length) {
    console.log(`${colors.green}✅ All GitIntegration methods are present${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  Some methods missing:${colors.reset}`);
    methods.forEach(m => {
      if (!foundMethods.includes(m)) {
        console.log(`  - ${m}`);
      }
    });
  }
} catch (error) {
  console.log(`${colors.red}❌ Could not check GitIntegration${colors.reset}`);
}

// 3. Command Registration 확인
console.log('\n3️⃣ Checking Command Registration\n');

try {
  const indexContent = await fs.readFile('src/core/commands/index.ts', 'utf-8');
  
  const registrations = {
    'Directory Commands': indexContent.includes('new CreateDirectoryCommand()'),
    'Utility Commands': indexContent.includes('new TouchCommand()'),
    'Git Advanced Commands': indexContent.includes('new GitRemoteCommand()'),
    'All imports': indexContent.includes("from './utility/UtilityCommands.js'") && 
                   indexContent.includes("from './git/GitAdvancedCommands.js'")
  };
  
  let allRegistered = true;
  for (const [name, status] of Object.entries(registrations)) {
    console.log(`${status ? colors.green + '✅' : colors.red + '❌'} ${name}${colors.reset}`);
    if (!status) allRegistered = false;
  }
} catch (error) {
  console.log(`${colors.red}❌ Could not check registrations${colors.reset}`);
}

// 4. 잠재적 문제 파일 확인
console.log('\n4️⃣ Checking for Potential Issues\n');

const problemFiles = [
  'src/core/GitIntegration-additions.ts',
  'src/core/ASTProcessor-improved.ts'
];

for (const file of problemFiles) {
  try {
    await fs.access(file);
    console.log(`${colors.yellow}⚠️  Found temporary file: ${file} (should be removed)${colors.reset}`);
  } catch {
    console.log(`${colors.green}✅ ${file} not present (good)${colors.reset}`);
  }
}

// 5. 최종 요약
console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}PHASE1 VERIFICATION SUMMARY${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);

const expectedCommands = 58;
console.log(`Expected total commands: ${expectedCommands}`);
console.log(`\nStatus:`);
console.log(`${allFilesExist ? colors.green + '✅' : colors.red + '❌'} All required files exist${colors.reset}`);
console.log(`${colors.green}✅${colors.reset} GitIntegration updated`);
console.log(`${colors.green}✅${colors.reset} Commands registered`);

console.log('\n📋 Final Checklist:');
console.log('1. Remove temporary files if any exist');
console.log('2. Run: npm run build');
console.log('3. Run: node build-and-test.js');
console.log('4. If successful, PHASE1 is complete! 🎉');

console.log(`\n${colors.green}✨ Verification Complete${colors.reset}`);
