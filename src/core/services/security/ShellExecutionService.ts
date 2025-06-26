import { execa, ExecaError } from 'execa';
import pkg from 'command-exists';
const { commandExists } = pkg;
import {
  IShellService,
  ShellExecutionOptions,
  ShellExecutionResult,
  SecurityPolicy
} from '../../interfaces/IShellService.js';
import { CommandValidator } from './CommandValidator.js';

import * as path from 'path';

export class ShellExecutionService implements IShellService {
  private securityPolicy: SecurityPolicy = {
    blockedCommands: [],
    blockedPatterns: [],
    maxCommandLength: 1000,
    allowShell: false
  };

  constructor(customPolicy?: Partial<SecurityPolicy>) {
    if (customPolicy) {
      this.setSecurityPolicy(customPolicy);
    }
  }

  async executeCommand(
    command: string,
    options: ShellExecutionOptions = {}
  ): Promise<ShellExecutionResult> {
    const startTime = Date.now();
    
    // 입력 sanitization
    const sanitizedCommand = CommandValidator.sanitizeInput(command);
    const sanitizedArgs = CommandValidator.sanitizeArgs(options.args || []);
    
    // Shell 모드에서는 특별한 처리 필요
    if (options.shell) {
      // shell 모드에서는 전체 명령어를 하나의 문자열로 검증
      const fullCommand = sanitizedCommand + (sanitizedArgs.length > 0 ? ' ' + sanitizedArgs.join(' ') : '');
      const shellValidation = CommandValidator.validate(
        fullCommand,
        [], // shell 모드에서는 args를 비워서 전달
        this.securityPolicy
      );
      
      if (!shellValidation.valid) {
        throw new Error(`🚫 Security validation failed: ${shellValidation.reason}`);
      }
    } else {
      // 일반 모드에서는 기존 방식대로
      const validation = CommandValidator.validate(
        sanitizedCommand,
        sanitizedArgs,
        this.securityPolicy
      );
      
      if (!validation.valid) {
        throw new Error(`🚫 Security validation failed: ${validation.reason}`);
      }
      
      // 명령어 존재 확인
      if (!await this.commandExists(sanitizedCommand)) {
        throw new Error(`Command not found: ${sanitizedCommand}`);
      }
    }
    
    // 실행 옵션 준비
    const execOptions: any = {
      cwd: options.cwd ? path.resolve(options.cwd) : process.cwd(),
      env: { ...process.env, ...options.env },
      timeout: options.timeout || 30000,
      shell: options.shell || false,
      encoding: options.encoding || 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      // 추가 보안 옵션
      windowsHide: true, // Windows에서 콘솔 창 숨기기
      cleanup: true,     // 자동 프로세스 정리
    };
    
    try {
      let result;
      
      if (options.shell) {
        // shell 모드에서는 전체 명령어를 하나의 문자열로 전달
        const fullCommand = sanitizedCommand + (sanitizedArgs.length > 0 ? ' ' + sanitizedArgs.join(' ') : '');
        result = await execa(fullCommand, [], execOptions);
      } else {
        // 일반 모드
        result = await execa(sanitizedCommand, sanitizedArgs, execOptions);
      }
      
      return {
        stdout: result.stdout as string,
        stderr: result.stderr as string,
        exitCode: result.exitCode || 0,
        signal: result.signal,
        timedOut: result.timedOut,
        executionTime: Date.now() - startTime,
        command: options.shell 
          ? sanitizedCommand + (sanitizedArgs.length > 0 ? ' ' + sanitizedArgs.join(' ') : '')
          : `${sanitizedCommand} ${sanitizedArgs.join(' ')}`
      };
    } catch (error) {
      const execError = error as ExecaError;
      
      // 타임아웃 에러 처리
      if (execError.timedOut) {
        throw new Error(
          `Command timed out after ${options.timeout || 30000}ms: ${sanitizedCommand}`
        );
      }
      
      // 명령어 실행 에러
      return {
        stdout: execError.stdout as string || '',
        stderr: execError.stderr as string || execError.message,
        exitCode: execError.exitCode || 1,
        signal: execError.signal,
        timedOut: execError.timedOut || false,
        executionTime: Date.now() - startTime,
        command: options.shell 
          ? sanitizedCommand + (sanitizedArgs.length > 0 ? ' ' + sanitizedArgs.join(' ') : '')
          : `${sanitizedCommand} ${sanitizedArgs.join(' ')}`
      };
    }
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

  private async commandExists(command: string): Promise<boolean> {
    try {
      await commandExists(command);
      return true;
    } catch {
      return false;
    }
  }
}

// 싱글톤 인스턴스
let shellServiceInstance: ShellExecutionService | null = null;

export function getShellService(customPolicy?: Partial<SecurityPolicy>): ShellExecutionService {
  if (!shellServiceInstance) {
    shellServiceInstance = new ShellExecutionService(customPolicy);
  }
  return shellServiceInstance;
}
