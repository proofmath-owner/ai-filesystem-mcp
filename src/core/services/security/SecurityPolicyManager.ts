import { SecurityPolicy } from '../../interfaces/IShellService.js';

export enum SecurityLevel {
  STRICT = 'strict',      // 현재 수준 - 매우 제한적
  MODERATE = 'moderate',  // 개발 도구 허용
  PERMISSIVE = 'permissive', // 대부분 허용
  CUSTOM = 'custom'       // 사용자 정의
}

export class SecurityPolicyManager {
  private static policies: Record<SecurityLevel, SecurityPolicy> = {
    [SecurityLevel.STRICT]: {
      blockedCommands: [
        // 파일 시스템 파괴
        'rm', 'rmdir', 'del', 'rd', 'format', 'mkfs', 'fdisk',
        // 시스템 제어
        'shutdown', 'reboot', 'halt', 'poweroff',
        // 권한 상승
        'sudo', 'su', 'doas',
        // 위험한 명령어
        'dd', 'shred', 'wipe'
      ],
      blockedPatterns: [
        /rm\s+-rf\s+\//,
        />\s*\/dev\//,
        />\s*\/etc\//,
        /\/etc\/passwd/,
        /\/etc\/shadow/
      ],
      maxCommandLength: 1000,
      allowShell: false
    },
    
    [SecurityLevel.MODERATE]: {
      blockedCommands: [
        // 시스템 파괴만 차단
        'format', 'mkfs', 'fdisk',
        'shutdown', 'reboot', 'halt',
        'dd', 'shred'
      ],
      blockedPatterns: [
        /rm\s+-rf\s+\/$/,  // rm -rf / 만 차단
        />\s*\/etc\/passwd/,
        />\s*\/etc\/shadow/
      ],
      maxCommandLength: 5000,
      allowShell: true,
      // 개발 도구 명시적 허용
      allowedCommands: [
        'npm', 'npx', 'node', 'yarn', 'pnpm',
        'git', 'tsc', 'webpack', 'vite',
        'chmod', 'chown', 'mkdir', 'rm', 'cp', 'mv',
        'ls', 'cat', 'grep', 'find', 'which'
      ]
    },
    
    [SecurityLevel.PERMISSIVE]: {
      blockedCommands: [
        // 최소한의 제한
        'shutdown', 'reboot', 'halt'
      ],
      blockedPatterns: [
        /rm\s+-rf\s+\/$/  // rm -rf / 만 차단
      ],
      maxCommandLength: 10000,
      allowShell: true
    },
    
    [SecurityLevel.CUSTOM]: {
      blockedCommands: [],
      blockedPatterns: [],
      maxCommandLength: 10000,
      allowShell: true
    }
  };

  static getPolicy(level: SecurityLevel): SecurityPolicy {
    return { ...this.policies[level] };
  }

  static createCustomPolicy(base: SecurityLevel, modifications: Partial<SecurityPolicy>): SecurityPolicy {
    const basePolicy = this.getPolicy(base);
    return {
      ...basePolicy,
      ...modifications,
      blockedCommands: [
        ...(basePolicy.blockedCommands || []),
        ...(modifications.blockedCommands || [])
      ],
      blockedPatterns: [
        ...(basePolicy.blockedPatterns || []),
        ...(modifications.blockedPatterns || [])
      ]
    };
  }
}

// Export both
export { SecurityLevel as SecurityLevelType };
