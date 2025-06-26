import { SecurityPolicy } from '../../interfaces/IShellService.js';

export class CommandValidator {
  private static readonly DEFAULT_BLOCKED_COMMANDS = [
    // 파일 시스템 파괴
    'rm', 'rmdir', 'del', 'rd', 'format', 'mkfs', 'fdisk', 'parted',
    // 권한 관련
    'chmod', 'chown', 'chgrp', 'sudo', 'su', 'doas', 'runas',
    // 시스템 제어
    'shutdown', 'reboot', 'halt', 'poweroff', 'init', 'systemctl',
    // 위험한 실행
    'exec', 'eval', 'source', '.',
    // 네트워크
    'nc', 'netcat', 'ncat', 'socat',
    // 프로세스 제어
    'kill', 'killall', 'pkill',
    // 기타 위험 명령어
    'dd', 'shred', 'wipe'
  ];

  private static readonly DANGEROUS_PATTERNS = [
    // 명령어 체이닝 - 모든 위험 명령어 포함
    /;\s*(rm|rmdir|del|dd|format|mkfs|shutdown|reboot|kill|sudo|su)\s+/i,
    /\|\s*(rm|rmdir|del|dd|format|mkfs|shutdown|reboot|kill|sudo|su)\s+/i,
    /&&\s*(rm|rmdir|del|dd|format|mkfs|shutdown|reboot|kill|sudo|su)\s+/i,
    /\|\|\s*(rm|rmdir|del|dd|format|mkfs|shutdown|reboot|kill|sudo|su)\s+/i,
    // 명령어 치환
    /`[^`]*`/,             // 백틱
    /\$\([^)]*\)/,         // $()
    /\$\{[^}]*\}/,         // ${}
    // 리다이렉션
    />\s*\/dev\/[^\/\s]+/, // > /dev/...
    />\s*\/etc\//,         // > /etc/...
    />\s*\/sys\//,         // > /sys/...
    />\s*\/proc\//,        // > /proc/...
    />\s*\/boot\//,        // > /boot/...
    // 위험한 경로
    /\/\.\./,              // 경로 탐색
    /~\/\.\./,             // 홈 디렉토리 탐색
    // 위험한 파일 삭제 패턴
    /rm\s+-rf\s+\//,       // rm -rf /
    /rm\s+-fr\s+\//,       // rm -fr /
    /rm\s+.*\*\.\*/,      // rm 와일드카드
    // 시스템 파일 접근
    /\/etc\/passwd/,        // 비밀번호 파일
    /\/etc\/shadow/,        // 암호화된 비밀번호
    /\/etc\/sudoers/,       // sudo 설정
  ];

  static validate(
    command: string,
    args: string[] = [],
    policy: SecurityPolicy
  ): { valid: boolean; reason?: string } {
    // 전체 명령어 문자열 생성
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
    
    // 1. 명령어 길이 검증
    if (fullCommand.length > policy.maxCommandLength) {
      return {
        valid: false,
        reason: `Command exceeds maximum length of ${policy.maxCommandLength} characters`
      };
    }

    // 2. 명령어에서 실제 실행될 프로그램 추출
    // 공백, 세미콜론, 파이프 등으로 분리된 첫 번째 토큰
    const commandTokens = command.split(/[\s;|&><]+/);
    const baseCommand = commandTokens[0];
    
    // 전체 명령어에서도 위험한 명령어 검색
    const allTokens = fullCommand.split(/[\s;|&><]+/);
    
    // 3. 화이트리스트 우선 검증
    const hasWhitelist = policy.allowedCommands && policy.allowedCommands.length > 0;
    
    if (hasWhitelist) {
      // 화이트리스트가 있는 경우: 명령어가 화이트리스트에 있으면 통과
      const isCommandAllowed = policy.allowedCommands!.includes(baseCommand);
      const hasAllowedToken = allTokens.some(token => policy.allowedCommands!.includes(token));
      
      if (!isCommandAllowed && !hasAllowedToken) {
        return {
          valid: false,
          reason: `Command '${baseCommand}' is not in the allowed commands list`
        };
      }
      // 화이트리스트에 있다면 블랙리스트 검사 건너뜀
    } else {
      // 4. 화이트리스트가 없는 경우만 블랙리스트 검증
      const allBlockedCommands = [
        ...this.DEFAULT_BLOCKED_COMMANDS,
        ...policy.blockedCommands
      ];

      for (const token of allTokens) {
        if (allBlockedCommands.includes(token)) {
          return {
            valid: false,
            reason: `Command '${token}' is blocked for security reasons`
          };
        }
      }
    }

    // 5. 위험한 패턴 검증
    const allPatterns = [...this.DANGEROUS_PATTERNS, ...policy.blockedPatterns];

    for (const pattern of allPatterns) {
      if (pattern.test(fullCommand)) {
        return {
          valid: false,
          reason: `Command contains dangerous pattern: ${pattern.source}`
        };
      }
    }

    // 6. Shell 사용 검증
    if (!policy.allowShell && this.requiresShell(command, args)) {
      return {
        valid: false,
        reason: 'Command requires shell execution which is not allowed'
      };
    }

    return { valid: true };
  }

  private static requiresShell(command: string, args: string[]): boolean {
    const shellIndicators = ['|', '>', '<', '&', ';', '$', '`', '*', '?', '[', ']'];
    const fullCommand = `${command} ${args.join(' ')}`;
    
    return shellIndicators.some(indicator => fullCommand.includes(indicator));
  }

  static sanitizeInput(input: string): string {
    // 제어 문자 제거
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
    
    // NULL 바이트 제거
    sanitized = sanitized.replace(/\0/g, '');
    
    // 선행/후행 공백 제거
    sanitized = sanitized.trim();
    
    return sanitized;
  }

  static sanitizeArgs(args: string[]): string[] {
    return args.map(arg => this.sanitizeInput(arg));
  }
}
