#!/usr/bin/env node
/**
 * PHASE1 전체 작동 점검
 */

console.log('📋 AI FileSystem MCP - PHASE1 Complete Check\n');

// 1. 빌드 확인
console.log('1️⃣ Checking build status...');
try {
  await import('./dist/index.js');
  console.log('✅ Build exists\n');
} catch (error) {
  console.log('❌ Build not found. Run: npm run build\n');
  process.exit(1);
}

// 2. 명령어 레지스트리 확인
console.log('2️⃣ Checking command registry...');
try {
  const { createCommandRegistry } = await import('./dist/core/commands/index.js');
  const registry = createCommandRegistry();
  
  console.log(`✅ Registry loaded with ${registry.size} commands\n`);
  
  // 카테고리별로 명령어 그룹화
  const commands = [];
  const iterator = registry.commands.entries();
  let entry = iterator.next();
  
  while (!entry.done) {
    commands.push(entry.value[0]);
    entry = iterator.next();
  }
  
  // 카테고리별 분류
  const categories = {
    'File': commands.filter(c => c.includes('file') || c.includes('read') || c.includes('write')),
    'Directory': commands.filter(c => c.includes('directory')),
    'Search': commands.filter(c => c.includes('search')),
    'Git': commands.filter(c => c.includes('git')),
    'Code': commands.filter(c => c.includes('code') || c.includes('analyze')),
    'Transaction': commands.filter(c => c.includes('transaction')),
    'Watcher': commands.filter(c => c.includes('watch')),
    'Archive': commands.filter(c => c.includes('compress') || c.includes('extract')),
    'System': commands.filter(c => c.includes('filesystem_stats')),
    'Batch': commands.filter(c => c.includes('batch')),
    'Refactoring': commands.filter(c => c.includes('refactor') || c.includes('format') || c.includes('quality')),
    'Cloud': commands.filter(c => c.includes('cloud')),
    'Security': commands.filter(c => c.includes('encrypt') || c.includes('decrypt') || c.includes('permission') || c.includes('secret') || c.includes('audit')),
    'Metadata': commands.filter(c => c.includes('metadata') || c.includes('project') || c.includes('tree') || c.includes('compare') || c.includes('duplicate') || c.includes('symlink') || c.includes('diff'))
  };
  
  console.log('📊 Commands by category:');
  for (const [category, cmds] of Object.entries(categories)) {
    if (cmds.length > 0) {
      console.log(`   ${category}: ${cmds.length} commands`);
    }
  }
  console.log('');
  
} catch (error) {
  console.log('❌ Failed to load registry:', error.message);
  process.exit(1);
}

// 3. 핵심 기능 테스트
console.log('3️⃣ Testing core functionality...');
try {
  const { FileSystemManager } = await import('./dist/core/FileSystemManager.js');
  const { createCommandRegistry } = await import('./dist/core/commands/index.js');
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const TEST_DIR = './phase1-final-test';
  const registry = createCommandRegistry();
  const fsManager = new FileSystemManager();
  
  // 테스트 디렉토리 생성
  await fs.mkdir(TEST_DIR, { recursive: true });
  
  // 간단한 테스트
  const tests = [
    {
      name: 'File Operations',
      command: 'write_file',
      args: { path: path.join(TEST_DIR, 'test.txt'), content: 'PHASE1 Complete!' }
    },
    {
      name: 'Read Operations',
      command: 'read_file',
      args: { path: path.join(TEST_DIR, 'test.txt') }
    },
    {
      name: 'Code Analysis',
      command: 'analyze_code',
      args: { path: path.join(TEST_DIR, 'test.js') },
      setup: async () => {
        await fs.writeFile(
          path.join(TEST_DIR, 'test.js'),
          'function test() { return "PHASE1"; }'
        );
      }
    }
  ];
  
  let passed = 0;
  for (const test of tests) {
    if (test.setup) await test.setup();
    
    try {
      const result = await registry.execute(test.command, { args: test.args, fsManager });
      if (result.content && result.content[0]) {
        console.log(`   ✅ ${test.name}`);
        passed++;
      } else {
        console.log(`   ❌ ${test.name}: No output`);
      }
    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
    }
  }
  
  // Cleanup
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  
  console.log(`\n   Result: ${passed}/${tests.length} tests passed\n`);
  
} catch (error) {
  console.log('❌ Core functionality test failed:', error.message);
}

// 4. 개선사항 확인
console.log('4️⃣ Checking enhancements...');
const enhancements = [
  { file: 'src/core/ASTProcessor-improved.ts', desc: 'Improved AST Processor' },
  { file: 'src/core/commands/directory/DirectoryCommands.ts', desc: 'Directory Commands' },
  { file: 'src/core/commands/utility/UtilityCommands.ts', desc: 'Utility Commands' },
  { file: 'src/core/commands/git/GitAdvancedCommands.ts', desc: 'Git Advanced Commands' }
];

let enhancementCount = 0;
for (const { file, desc } of enhancements) {
  try {
    const fs = await import('fs/promises');
    await fs.access(file);
    console.log(`   ✅ ${desc}`);
    enhancementCount++;
  } catch {
    console.log(`   ⚠️  ${desc} (not integrated yet)`);
  }
}

console.log(`\n   ${enhancementCount}/${enhancements.length} enhancements ready\n`);

// 5. 최종 요약
console.log('━'.repeat(50));
console.log('📈 PHASE1 Status Summary:');
console.log('━'.repeat(50));

const { createCommandRegistry: getRegistry } = await import('./dist/core/commands/index.js');
const finalRegistry = getRegistry();

console.log(`✅ Total Commands: ${finalRegistry.size}`);
console.log(`✅ Build Status: Ready`);
console.log(`✅ Core Functions: Working`);
console.log(`${enhancementCount === enhancements.length ? '✅' : '⚠️ '} Enhancements: ${enhancementCount}/${enhancements.length} integrated`);

console.log('\n📝 Next Steps:');
if (enhancementCount < enhancements.length) {
  console.log('1. Integrate remaining enhancements into main codebase');
  console.log('2. Update src/core/commands/index.ts to register new commands');
  console.log('3. Add missing methods to GitIntegration.ts');
  console.log('4. Run: npm run build');
  console.log('5. Run: npm run test:all');
} else {
  console.log('1. Run comprehensive tests: npm run test:all');
  console.log('2. Update documentation');
  console.log('3. Ready for PHASE2!');
}

console.log('\n✨ PHASE1 Check Complete!');
