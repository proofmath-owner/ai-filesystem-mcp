#!/usr/bin/env node
// 간단한 디버그 테스트

import { createCommandRegistry } from './dist/core/commands/index.js';

console.log('Testing createCommandRegistry...');
try {
  const registry = createCommandRegistry();
  console.log('✅ Success! Registry created with', registry.size, 'commands');
} catch (error) {
  console.error('❌ Error:', error);
  console.error('Stack:', error.stack);
}