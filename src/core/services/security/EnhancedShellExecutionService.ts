import { SecurityLevel, SecurityPolicyManager } from './SecurityPolicyManager.js';import { execa, ExecaError } from 'execa';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import {
  IShellService,
  ShellExecutionOptions,
  ShellExecutionResult,
  SecurityPolicy
} from '../../interfaces/IShellService.js';
import { CommandValidator } from './CommandValidator.js';
// Export SecurityLevel from this file too
export { SecurityLevel } from './SecurityPolicyManager.js';

export interface EnhancedShellOptions extends ShellExecutionOptions {
  securityLevel?: SecurityLevel;
  sudo?: boolean;
  interactive?: boolean;
}

export class EnhancedShellExecutionService implements IShellService {
  private securityPolicy: SecurityPolicy;
  private nodeModulesPath: string;
  private customPaths: string[] = [];

  constructor(
    securityLevel: SecurityLevel = SecurityLevel.MODERATE,
    customPolicy?: Partial<SecurityPolicy>
  ) {
    this.securityPolicy = customPolicy 
      ? SecurityPolicyManager.createCustomPolicy(securityLevel, customPolicy)
      : SecurityPolicyManager.getPolicy(securityLevel);
    
    // Node.js 도구 경로 자동 탐지
    this.nodeModulesPath = this.findNodeModulesPath();
    this.setupEnvironmentPaths();
  }

  private findNodeModulesPath(): string {
    const possiblePaths = [
      path.join(process.cwd(), 'node_modules', '.bin'),
      path.join(os.homedir(), '.npm', 'bin'),
      path.join(os.homedir(), '.yarn', 'bin'),
      path.join(os.homedir(), '.pnpm', 'bin'),
      '/usr/local/bin',
      '/opt/homebrew/bin', // macOS with Homebrew
      'C:\\Program Files\\nodejs', // Windows
    ];

    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          this.customPaths.push(p);
        }
      } catch {}
    }

    return possiblePaths[0];
  }

  private setupEnvironmentPaths(): void {
    // 환경 변수에 커스텀 경로 추가
    const currentPath = process.env.PATH || '';
    const pathSeparator = os.platform() === 'win32' ? ';' : ':';
    const newPaths = this.customPaths.filter(p => !currentPath.includes(p));
    
    if (newPaths.length > 0) {
      process.env.PATH = `${currentPath}${pathSeparator}${newPaths.join(pathSeparator)}`;
    }
  }

  async executeCommand(
    command: string,
    options: EnhancedShellOptions = {}
  ): Promise<ShellExecutionResult> {
    const startTime = Date.now();
    
    // 보안 레벨 오버라이드
    if (options.securityLevel) {
      const tempPolicy = SecurityPolicyManager.getPolicy(options.securityLevel);
      const validation = CommandValidator.validate(command, options.args || [], tempPolicy);
      if (!validation.valid) {
        throw new Error(`🚫 Security validation failed: ${validation.reason}`);
      }
    } else {
      // 기본 보안 정책 사용
      const validation = CommandValidator.validate(command, options.args || [], this.securityPolicy);
      if (!validation.valid) {
        throw new Error(`🚫 Security validation failed: ${validation.reason}`);
      }
    }

    // Node.js 도구 특별 처리
    const nodeTools = ['npm', 'npx', 'yarn', 'pnpm', 'node', 'tsc'];
    if (nodeTools.includes(command)) {
      command = await this.resolveNodeTool(command);
    }

    // 명령어 존재 확인 (개선된 버전)
    if (!await this.commandExists(command)) {
      // 대체 명령어 제안
      const suggestion = this.suggestAlternative(command);
      throw new Error(
        `Command not found: ${command}${suggestion ? `. Did you mean: ${suggestion}?` : ''}`
      );
    }

    // 실행 옵션 준비
    const execOptions: any = {
      cwd: options.cwd ? path.resolve(options.cwd) : process.cwd(),
      env: { 
        ...process.env, 
        ...options.env,
        // Node.js 관련 환경 변수 추가
        NODE_ENV: process.env.NODE_ENV || 'development',
        PATH: process.env.PATH
      },
      timeout: options.timeout || 30000,
      shell: options.shell || false,
      encoding: options.encoding || 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
      cleanup: true,
    };

    // 대화형 모드 지원
    if (options.interactive) {
      execOptions.stdin = 'inherit';
      execOptions.stdout = 'inherit';
      execOptions.stderr = 'inherit';
    }

    try {
      const result = await execa(command, options.args || [], execOptions);
      
      return {
        stdout: result.stdout as string || '',
        stderr: result.stderr as string || '',
        exitCode: result.exitCode || 0,
        signal: result.signal,
        timedOut: result.timedOut || false,
        executionTime: Date.now() - startTime,
        command: `${command} ${(options.args || []).join(' ')}`
      };
    } catch (error) {
      const execError = error as ExecaError;
      
      // 더 친숙한 에러 메시지
      let friendlyError = execError.message;
      if (execError.exitCode === 127) {
        friendlyError = `Command not found: ${command}. Make sure it's installed and in PATH.`;
      } else if (execError.timedOut) {
        friendlyError = `Command timed out after ${options.timeout || 30000}ms`;
      }
      
      return {
        stdout: execError.stdout as string || '',
        stderr: execError.stderr as string || friendlyError,
        exitCode: execError.exitCode || 1,
        signal: execError.signal,
        timedOut: execError.timedOut || false,
        executionTime: Date.now() - startTime,
        command: `${command} ${(options.args || []).join(' ')}`
      };
    }
  }

  private async resolveNodeTool(tool: string): Promise<string> {
    // 로컬 node_modules/.bin에서 먼저 찾기
    const localPath = path.join(process.cwd(), 'node_modules', '.bin', tool);
    if (require('fs').existsSync(localPath)) {
      return localPath;
    }

    // 글로벌 설치 위치에서 찾기
    for (const customPath of this.customPaths) {
      const toolPath = path.join(customPath, tool);
      if (require('fs').existsSync(toolPath)) {
        return toolPath;
      }
    }

    return tool; // 못 찾으면 원래 이름 반환
  }

  private async commandExists(command: string): Promise<boolean> {
    try {
      // 절대 경로인 경우
      if (path.isAbsolute(command)) {
        return fs.existsSync(command);
      }
      
      // which 명령어 대신 직접 PATH 검색
      const paths = (process.env.PATH || '').split(path.delimiter);
      for (const dir of paths) {
        const fullPath = path.join(dir, command);
        if (fs.existsSync(fullPath)) {
          try {
            fs.accessSync(fullPath, fs.constants.X_OK);
            return true;
          } catch {
            // 실행 권한이 없음
          }
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }

  private suggestAlternative(command: string): string | null {
    const alternatives: Record<string, string> = {
      'node': 'nvm install node',
      'npm': 'install Node.js from nodejs.org',
      'npx': 'npm install -g npx',
      'tsc': 'npm install -g typescript',
      'git': 'install Git from git-scm.com',
      'python': 'python3',
      'pip': 'pip3'
    };

    return alternatives[command] || null;
  }

  async validateCommand(command: string, args?: string[]): Promise<boolean> {
    const validation = CommandValidator.validate(
      command,
      args || [],
      this.securityPolicy
    );
    return validation.valid;
  }

  setSecurityPolicy(policy: Partial<SecurityPolicy>): void {
    this.securityPolicy = {
      ...this.securityPolicy,
      ...policy
    };
  }

  getSecurityPolicy(): SecurityPolicy {
    return { ...this.securityPolicy };
  }

  // 보안 레벨 변경
  setSecurityLevel(level: SecurityLevel): void {
    this.securityPolicy = SecurityPolicyManager.getPolicy(level);
  }

  // 임시로 보안 레벨을 낮춰서 실행
  async executeWithElevatedPermissions(
    command: string,
    args: string[] = [],
    options: ShellExecutionOptions = {}
  ): Promise<ShellExecutionResult> {
    const originalPolicy = this.securityPolicy;
    try {
      // 임시로 PERMISSIVE 레벨로 변경
      this.securityPolicy = SecurityPolicyManager.getPolicy(SecurityLevel.PERMISSIVE);
      return await this.executeCommand(command, { ...options, args });
    } finally {
      // 원래 정책으로 복원
      this.securityPolicy = originalPolicy;
    }
  }
}

// 기본 인스턴스는 MODERATE 레벨
export function getEnhancedShellService(
  level: SecurityLevel = SecurityLevel.MODERATE
): EnhancedShellExecutionService {
  return new EnhancedShellExecutionService(level);
}
