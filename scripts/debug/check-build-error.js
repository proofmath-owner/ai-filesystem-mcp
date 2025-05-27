#!/usr/bin/env node
// 빌드 에러 확인 스크립트

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkBuildError() {
  console.log('🔍 Checking build errors...\n');
  
  try {
    const { stdout, stderr } = await execAsync('npm run build', {
      cwd: '/Users/Sangbinna/mcp/ai-filesystem-mcp'
    });
    
    console.log('✅ Build successful!');
    console.log(stdout);
  } catch (error) {
    console.log('❌ Build failed with errors:\n');
    console.log('STDOUT:', error.stdout);
    console.log('\nSTDERR:', error.stderr);
    console.log('\nError details:', error.message);
    
    // TypeScript 에러 파싱
    const tsErrors = error.stdout.match(/error TS\d+:.*/g);
    if (tsErrors) {
      console.log('\n📋 TypeScript Errors Summary:');
      tsErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }
  }
}

checkBuildError();