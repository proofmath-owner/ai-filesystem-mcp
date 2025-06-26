#!/usr/bin/env node

/**
 * 쉘 명령어 빠른 테스트
 */

import { ServiceContainer } from '../src/core/ServiceContainer.js';

async function testShellCommands() {
  console.log('🧪 Shell Commands Test\n');
  
  const container = new ServiceContainer();
  await container.initialize();
  
  const registry = container.getCommandRegistry();
  
  // 1. execute_shell 테스트 (moderate 보안)
  console.log('1️⃣ execute_shell (moderate security):');
  try {
    const result1 = await registry.execute('execute_shell', {
      args: {
        command: 'echo',
        args: ['Hello from MCP!'],
        securityLevel: 'moderate'
      },
      container
    });
    console.log('✅ Result:', JSON.parse(result1.content[0].text).stdout.trim());
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n2️⃣ shell (quick command):');
  try {
    const result2 = await registry.execute('shell', {
      args: {
        cmd: 'ls -la | head -5'
      },
      container
    });
    console.log('✅ Result:\n', result2.content[0].text);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n3️⃣ execute_shell (npm command):');
  try {
    const result3 = await registry.execute('execute_shell', {
      args: {
        command: 'npm',
        args: ['--version'],
        securityLevel: 'moderate'
      },
      container
    });
    console.log('✅ npm version:', JSON.parse(result3.content[0].text).stdout.trim());
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n4️⃣ shell (git status):');
  try {
    const result4 = await registry.execute('shell', {
      args: {
        cmd: 'git status --short'
      },
      container
    });
    console.log('✅ Git status:\n', result4.content[0].text);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n5️⃣ execute_shell (with timeout):');
  try {
    const result5 = await registry.execute('execute_shell', {
      args: {
        command: 'sleep',
        args: ['2'],
        timeout: 1000,
        securityLevel: 'permissive'
      },
      container
    });
    console.log('Result:', result5.content[0].text);
  } catch (error) {
    console.log('✅ Expected timeout error:', error.message);
  }
  
  console.log('\n📊 Summary:');
  console.log('Available commands:', registry.getAllCommands().map(c => c.name).filter(n => n.includes('shell')).join(', '));
  
  await container.cleanup();
}

// 실행
testShellCommands().catch(console.error);
