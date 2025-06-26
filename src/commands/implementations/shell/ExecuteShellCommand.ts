import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { EnhancedShellExecutionService, SecurityLevel } from '../../../core/services/security/EnhancedShellExecutionService.js';

export class ExecuteShellCommand extends BaseCommand {
  readonly name = 'execute_shell';
  readonly description = 'Execute shell commands with multi-level security';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      command: {
        type: 'string',
        description: 'The command to execute'
      },
      args: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Command arguments'
      },
      cwd: {
        type: 'string',
        description: 'Working directory'
      },
      env: {
        type: 'object',
        description: 'Environment variables'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds'
      },
      shell: {
        type: 'boolean',
        description: 'Run command in shell'
      },
      securityLevel: {
        type: 'string',
        enum: ['strict', 'moderate', 'permissive'],
        description: 'Security level (default: moderate)'
      },
      sudo: {
        type: 'boolean',
        description: 'Run with sudo (requires system permissions)'
      },
      interactive: {
        type: 'boolean',
        description: 'Run in interactive mode'
      }
    },
    required: ['command']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.command, 'command');
    
    if (args.args !== undefined) {
      this.assertArray(args.args, 'args');
    }
    
    if (args.cwd !== undefined) {
      this.assertString(args.cwd, 'cwd');
    }
    
    if (args.env !== undefined) {
      this.assertObject(args.env, 'env');
    }
    
    if (args.timeout !== undefined) {
      this.assertNumber(args.timeout, 'timeout');
    }
    
    if (args.shell !== undefined) {
      this.assertBoolean(args.shell, 'shell');
    }
    
    if (args.securityLevel !== undefined) {
      if (!['strict', 'moderate', 'permissive'].includes(args.securityLevel)) {
        throw new Error('securityLevel must be one of: strict, moderate, permissive');
      }
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const {
      command,
      args = [],
      cwd,
      env,
      timeout,
      shell,
      securityLevel = 'moderate',
      sudo = false,
      interactive = false
    } = context.args;

    // 보안 레벨 매핑
    const securityLevelMap: Record<string, SecurityLevel> = {
      'strict': SecurityLevel.STRICT,
      'moderate': SecurityLevel.MODERATE,
      'permissive': SecurityLevel.PERMISSIVE
    };

    // ShellService 가져오기
    const shellService = context.container.getService<EnhancedShellExecutionService>('shellService');
    
    // 보안 레벨 설정
    shellService.setSecurityLevel(securityLevelMap[securityLevel]);

    try {
      const result = await shellService.executeCommand(command, {
        args,
        cwd,
        env,
        timeout,
        shell,
        sudo,
        interactive
      });

      const success = result.exitCode === 0;
      
      return this.formatResult(
        JSON.stringify({
          success,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          signal: result.signal,
          timedOut: result.timedOut,
          executionTime: result.executionTime,
          command: result.command
        }, null, 2)
      );
    } catch (error: any) {
      // 보안 검증 실패 시 더 친근한 메시지
      if (error.message.includes('Security validation failed')) {
        return this.formatError(
          `${error.message}\n\n` +
          `💡 Tip: Try using a different security level:\n` +
          `- 'permissive': For trusted scripts\n` +
          `- 'moderate': For development tools (default)\n` +
          `- 'strict': For maximum security\n\n` +
          `Example: Use securityLevel: 'permissive' for system maintenance scripts.`
        );
      }
      
      throw error;
    }
  }
}

// 간단한 쉘 실행을 위한 추가 명령어 (보안 신경 안 씀)
export class QuickShellCommand extends BaseCommand {
  readonly name = 'shell';
  readonly description = 'Quick shell command execution (permissive mode)';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      cmd: {
        type: 'string',
        description: 'Command to execute (can include arguments)'
      },
      cwd: {
        type: 'string',
        description: 'Working directory'
      }
    },
    required: ['cmd']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.cmd, 'cmd');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { cmd, cwd } = context.args;
    
    // 명령어와 인자 분리
    const parts = cmd.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    const shellService = context.container.getService<EnhancedShellExecutionService>('shellService');
    
    // 항상 permissive 모드로 실행
    shellService.setSecurityLevel(SecurityLevel.PERMISSIVE);

    try {
      const result = await shellService.executeCommand(command, {
        args,
        cwd,
        shell: true,
        timeout: 60000 // 1분 타임아웃
      });

      if (result.exitCode === 0) {
        return this.formatResult(result.stdout || 'Command executed successfully');
      } else {
        return this.formatResult(
          `Exit code: ${result.exitCode}\n` +
          `Output: ${result.stdout}\n` +
          `Error: ${result.stderr}`
        );
      }
    } catch (error: any) {
      return this.formatError(`Failed to execute: ${error.message}`);
    }
  }
}
