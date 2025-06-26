#!/usr/bin/env node

/**
 * Debug script to check which commands are loaded
 */

import { ServiceContainer } from '../../dist/core/ServiceContainer.js';

async function checkCommands() {
  console.log('🔍 Checking loaded commands...\n');
  
  try {
    const container = new ServiceContainer();
    await container.initialize();
    
    const registry = container.getCommandRegistry();
    const commands = registry.getAllCommands();
    
    console.log(`Total commands loaded: ${commands.length}`);
    console.log('\nCommands:');
    
    commands.forEach((cmd, index) => {
      console.log(`${index + 1}. ${cmd.name} - ${cmd.description}`);
    });
    
    // Check specifically for execute_shell
    const shellCommand = commands.find(cmd => cmd.name === 'execute_shell');
    if (shellCommand) {
      console.log('\n✅ execute_shell command is loaded!');
      console.log('Input schema:', JSON.stringify(shellCommand.inputSchema, null, 2));
    } else {
      console.log('\n❌ execute_shell command is NOT loaded!');
    }
    
    await container.cleanup();
  } catch (error) {
    console.error('Error checking commands:', error);
  }
}

checkCommands();
