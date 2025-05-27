#!/usr/bin/env node
// 간단한 빌드 에러 체크

import { execSync } from 'child_process';
import path from 'path';

const projectDir = '/Users/Sangbinna/mcp/ai-filesystem-mcp';

console.log('🔍 Quick Build Diagnostics\n');

// 1. TypeScript 버전 확인
try {
  const tsVersion = execSync('npx tsc --version', { cwd: projectDir }).toString().trim();
  console.log(`✅ TypeScript: ${tsVersion}`);
} catch (e) {
  console.log('❌ TypeScript not found');
}

// 2. 컴파일 에러 확인
console.log('\n📋 Checking TypeScript compilation...\n');
try {
  execSync('npx tsc --noEmit', { 
    cwd: projectDir,
    stdio: 'inherit'
  });
  console.log('\n✅ No TypeScript errors!');
} catch (e) {
  console.log('\n❌ TypeScript compilation failed (see errors above)');
}

// 3. 주요 파일 존재 확인
console.log('\n📁 Checking key files:');
const keyFiles = [
  'src/index.ts',
  'src/index-refactored.ts',
  'src/core/FileSystemManager.ts',
  'src/core/commands/Command.ts',
  'src/core/commands/CommandRegistry.ts',
  'src/core/commands/index.ts'
];

for (const file of keyFiles) {
  try {
    const fs = await import('fs');
    fs.accessSync(path.join(projectDir, file));
    console.log(`  ✅ ${file}`);
  } catch (e) {
    console.log(`  ❌ ${file} - MISSING!`);
  }
}