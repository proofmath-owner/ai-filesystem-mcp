#!/usr/bin/env node
/**
 * Test analyze_code command
 */

import { createCommandRegistry } from './dist/core/commands/index.js';
import { FileSystemManager } from './dist/core/FileSystemManager.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_DIR = './test-analyze';

async function setup() {
  await fs.mkdir(TEST_DIR, { recursive: true });
  
  // Create test files
  await fs.writeFile(path.join(TEST_DIR, 'test.js'), `
// Test JavaScript file
import { readFile } from 'fs';
import path from 'path';

function hello() {
  console.log('Hello, world!');
}

async function asyncFunc(param1, param2) {
  return param1 + param2;
}

class TestClass {
  constructor() {
    this.name = 'Test';
  }
  
  method1() {
    return this.name;
  }
  
  method2() {
    return 42;
  }
}

const myVar = 'test';
let counter = 0;

export { hello, TestClass };
export default asyncFunc;
`);

  await fs.writeFile(path.join(TEST_DIR, 'test.ts'), `
// Test TypeScript file
import { Component } from '@angular/core';
import * as React from 'react';

interface Person {
  name: string;
  age: number;
}

type Status = 'active' | 'inactive';

async function processData(data: string[]): Promise<number> {
  return data.length;
}

class UserService {
  private users: Person[] = [];
  
  addUser(user: Person): void {
    this.users.push(user);
  }
  
  getUsers(): Person[] {
    return this.users;
  }
}

const config: { debug: boolean } = { debug: true };

export { UserService, processData };
export type { Person, Status };
`);
}

async function testAnalyzeCode() {
  const registry = createCommandRegistry();
  const fsManager = new FileSystemManager();
  
  console.log('🔍 Testing analyze_code command\n');
  
  const testFiles = ['test.js', 'test.ts'];
  
  for (const file of testFiles) {
    const filePath = path.join(TEST_DIR, file);
    console.log(`\n📄 Analyzing ${file}:`);
    console.log('─'.repeat(50));
    
    try {
      const result = await registry.execute('analyze_code', {
        args: { path: filePath },
        fsManager
      });
      
      console.log(result.content[0].text);
    } catch (error) {
      console.error(`❌ Error analyzing ${file}:`, error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

async function cleanup() {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch (e) {
    // Ignore
  }
}

async function main() {
  try {
    await setup();
    await testAnalyzeCode();
    await cleanup();
    
    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
