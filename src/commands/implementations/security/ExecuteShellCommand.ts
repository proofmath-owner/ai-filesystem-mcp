import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { IShellService } from '../../../core/interfaces/IShellService.js';

export class ExecuteShellCommand extends BaseCommand {
  readonly name = 'execute_shell';
  readonly description = '⚠️ Execute shell commands with security validation. Use with caution - only for trusted operations';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      command: {
        type: 'string' as const,
        description: 'Shell command to execute. Examples: "ls -la", "git status", "npm test". Avoid: rm, sudo, system modifications'
      },
      args: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Command arguments as separate array items. Examples: ["status", "--porcelain"] for git. Safer than embedding in command string'
      },
      cwd: {
        type: 'string' as const,
        description: 'Working directory for command execution (absolute or relative path). Defaults to current directory'
      },
      env: {
        type: 'object' as const,
        description: 'Environment variables (optional)',
        additionalProperties: { type: 'string' as const }
      },
      timeout: {
        type: 'number' as const,
        description: 'Command timeout in milliseconds. Default: 30000 (30s). Max: 300000 (5min). Use shorter timeouts for safety',
        default: 30000,
        maximum: 300000
      },
      shell: {
        type: 'boolean' as const,
        description: 'Execute via shell (enables pipes, redirects). Default: false for security. Only enable if needed for shell features',
        default: false
      },
      encoding: {
        type: 'string' as const,
        description: 'Output encoding (default: utf8)',
        enum: ['utf8', 'utf16le', 'latin1', 'base64', 'hex', 'ascii']
      }
    },
    required: ['command']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.command, 'command');
    
    if (args.args !== undefined) {
      this.assertArray(args.args, 'args');
      args.args.forEach((arg: any, index: number) => {
        if (typeof arg !== 'string') {
          throw new Error(`args[${index}] must be a string`);
        }
      });
    }
    
    if (args.cwd !== undefined) {
      this.assertString(args.cwd, 'cwd');
    }
    
    if (args.env !== undefined) {
      this.assertObject(args.env, 'env');
    }
    
    if (args.timeout !== undefined) {
      this.assertNumber(args.timeout, 'timeout');
      if (args.timeout <= 0) {
        throw new Error('timeout must be a positive number');
      }
    }
    
    if (args.shell !== undefined) {
      this.assertBoolean(args.shell, 'shell');
    }
    
    if (args.encoding !== undefined) {
      this.assertString(args.encoding, 'encoding');
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const shellService = context.container.getService<IShellService>('shellService');
      
      if (!shellService) {
        throw new Error('Shell service is not available');
      }
      
      // 실행 옵션 준비
      const options = {
        args: context.args.args,
        cwd: context.args.cwd,
        env: context.args.env,
        timeout: context.args.timeout,
        shell: context.args.shell,
        encoding: context.args.encoding as BufferEncoding
      };
      
      // 명령어 실행
      const result = await shellService.executeCommand(
        context.args.command,
        options
      );
      
      // 실행 결과 포맷
      const formattedResult = {
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        signal: result.signal,
        timedOut: result.timedOut,
        executionTime: result.executionTime,
        command: result.command
      };
      
      // 에러가 있지만 출력이 있는 경우 (예: grep의 no match)
      if (result.exitCode !== 0 && result.stdout) {
        return this.formatResult(JSON.stringify(formattedResult, null, 2));
      }
      
      // 정상 실행
      if (result.exitCode === 0) {
        return this.formatResult(JSON.stringify(formattedResult, null, 2));
      }
      
      // 실행 실패
      return this.formatError(new Error(result.stderr || `Command failed with exit code ${result.exitCode}`));
      
    } catch (error) {
      // 보안 에러나 검증 실패는 명확히 표시
      if (error instanceof Error && error.message.includes('Security validation failed')) {
        return this.formatError(new Error(`🚫 ${error.message}`));
      }
      
      return this.formatError(error);
    }
  }
}
