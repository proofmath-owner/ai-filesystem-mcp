#!/usr/bin/env node

/**
 * Integration test for execute_shell command
 * Tests the complete flow through the MCP server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ServiceContainer } from '../../src/core/ServiceContainer.js';

// Test cases
const testCases = [
  {
    name: 'Simple echo command',
    args: {
      command: 'echo',
      args: ['Hello from shell execution!']
    },
    expectSuccess: true,
    validate: (result) => {
      return result.stdout && result.stdout.includes('Hello from shell execution!');
    }
  },
  {
    name: 'Command with exit code',
    args: {
      command: 'ls',
      args: ['/nonexistent/path/that/should/not/exist']
    },
    expectSuccess: false,
    validate: (result) => {
      return result.exitCode !== 0;
    }
  },
  {
    name: 'Blocked dangerous command',
    args: {
      command: 'rm',
      args: ['-rf', '/tmp/test']
    },
    expectSuccess: false,
    expectError: true,
    validate: (error) => {
      return error.includes('Security validation failed') || error.includes('blocked');
    }
  },
  {
    name: 'Command with timeout',
    args: {
      command: 'sleep',
      args: ['10'],
      timeout: 100
    },
    expectSuccess: false,
    expectError: true,
    validate: (error) => {
      return error.includes('timed out');
    }
  },
  {
    name: 'Command with environment variable',
    args: {
      command: process.platform === 'win32' ? 'echo' : 'printenv',
      args: process.platform === 'win32' ? ['%MY_TEST_VAR%'] : ['MY_TEST_VAR'],
      env: { MY_TEST_VAR: 'integration_test_value' },
      shell: process.platform === 'win32'
    },
    expectSuccess: true,
    validate: (result) => {
      return result.stdout && result.stdout.includes('integration_test_value');
    }
  },
  {
    name: 'Command injection attempt',
    args: {
      command: 'echo test; rm -rf /'
    },
    expectSuccess: false,
    expectError: true,
    validate: (error) => {
      return error.includes('Security validation failed');
    }
  },
  {
    name: 'Non-existent command',
    args: {
      command: 'this_command_should_not_exist_12345'
    },
    expectSuccess: false,
    expectError: true,
    validate: (error) => {
      return error.includes('Command not found');
    }
  }
];

async function runTests() {
  console.log('🧪 Running execute_shell integration tests...\n');
  
  const container = new ServiceContainer();
  await container.initialize();
  
  const registry = container.getCommandRegistry();
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      console.log(`📋 Test: ${testCase.name}`);
      console.log(`   Command: ${testCase.args.command} ${testCase.args.args?.join(' ') || ''}`);
      
      const result = await registry.execute('execute_shell', {
        args: testCase.args,
        container
      });
      
      if (testCase.expectError) {
        // We expected an error
        if (result.content[0].text.includes('Error')) {
          const errorText = result.content[0].text;
          if (testCase.validate(errorText)) {
            console.log(`   ✅ Passed: Got expected error\n`);
            passed++;
          } else {
            console.log(`   ❌ Failed: Error doesn't match expectation`);
            console.log(`   Got: ${errorText}\n`);
            failed++;
          }
        } else {
          console.log(`   ❌ Failed: Expected error but got success`);
          console.log(`   Got: ${JSON.stringify(result, null, 2)}\n`);
          failed++;
        }
      } else {
        // We expected success (though the command itself might fail)
        const resultData = JSON.parse(result.content[0].text);
        
        if (testCase.expectSuccess && !resultData.success) {
          console.log(`   ❌ Failed: Expected success but got failure`);
          console.log(`   Error: ${resultData.error}\n`);
          failed++;
        } else if (testCase.validate(resultData)) {
          console.log(`   ✅ Passed\n`);
          passed++;
        } else {
          console.log(`   ❌ Failed: Validation failed`);
          console.log(`   Result: ${JSON.stringify(resultData, null, 2)}\n`);
          failed++;
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed with unexpected error: ${error.message}\n`);
      failed++;
    }
  }
  
  console.log('\n📊 Test Summary:');
  console.log(`   Total: ${testCases.length}`);
  console.log(`   Passed: ${passed} ✅`);
  console.log(`   Failed: ${failed} ❌`);
  
  await container.cleanup();
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
