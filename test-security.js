// 보안 레벨 테스트 스크립트
import { CommandValidator } from './dist/core/services/security/CommandValidator.js';
import { SecurityPolicyManager, SecurityLevel } from './dist/core/services/security/SecurityPolicyManager.js';

console.log('🔒 Security Policy Test\n');

// 각 보안 레벨에서 테스트
const testCommands = [
  'chmod +x script.sh',
  'rm -rf test',
  'npm install',
  'git status',
  'sudo rm -rf /',
  'ls -la'
];

for (const level of [SecurityLevel.STRICT, SecurityLevel.MODERATE, SecurityLevel.PERMISSIVE]) {
  console.log(`\n📊 Security Level: ${level.toUpperCase()}`);
  console.log('─'.repeat(50));
  
  const policy = SecurityPolicyManager.getPolicy(level);
  
  for (const cmdStr of testCommands) {
    const [command, ...args] = cmdStr.split(' ');
    const result = CommandValidator.validate(command, args, policy);
    
    const icon = result.valid ? '✅' : '❌';
    console.log(`${icon} ${cmdStr.padEnd(25)} ${result.valid ? 'ALLOWED' : `BLOCKED: ${result.reason}`}`);
  }
}

console.log('\n\n💡 Key Insights:');
console.log('- STRICT: 대부분 차단 (기본 명령어만 허용)');
console.log('- MODERATE: 개발 도구 허용 (권장)');
console.log('- PERMISSIVE: 최소 제한');
