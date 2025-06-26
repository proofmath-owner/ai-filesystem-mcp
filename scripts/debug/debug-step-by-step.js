#!/usr/bin/env node
// Step by step debugging

console.log('🔍 Debugging import chain...\n');

console.log('1. Testing CommandRegistry import:');
try {
  const { CommandRegistry } = await import('./dist/core/commands/CommandRegistry.js');
  console.log('✅ CommandRegistry imported successfully');
  const registry = new CommandRegistry();
  console.log('✅ CommandRegistry instance created');
} catch (e) {
  console.log('❌ Error:', e.message);
}

console.log('\n2. Testing Command base class:');
try {
  const { Command } = await import('./dist/core/commands/Command.js');
  console.log('✅ Command imported successfully');
} catch (e) {
  console.log('❌ Error:', e.message);
}

console.log('\n3. Testing FileCommands:');
try {
  const module = await import('./dist/core/commands/file/FileCommands.js');
  console.log('✅ FileCommands module imported');
  console.log('   Exports:', Object.keys(module));
} catch (e) {
  console.log('❌ Error:', e.message);
  console.log('   Stack:', e.stack);
}

console.log('\n4. Testing createCommandRegistry:');
try {
  const { createCommandRegistry } = await import('./dist/core/commands/index.js');
  console.log('✅ createCommandRegistry imported');
  const registry = createCommandRegistry();
  console.log('✅ Registry created with', registry.size, 'commands');
} catch (e) {
  console.log('❌ Error:', e.message);
  console.log('   At:', e.stack.split('\n')[1]);
}