# Shell Execution Command - 구현 명세서

## 명령어 구조

### 명령어 이름
`execute_shell`

### 클래스 구조
```typescript
export class ExecuteShellCommand extends BaseCommand {
  readonly name = 'execute_shell';
  readonly description = 'Execute shell commands with security controls';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      command: {
        type: 'string' as const,
        description: 'Command to execute'
      },
      args: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Command arguments (optional)'
      },
      cwd: {
        type: 'string' as const,
        description: 'Working directory (optional)'
      },
      env: {
        type: 'object' as const,
        description: 'Environment variables (optional)'
      },
      timeout: {
        type: 'number' as const,
        description: 'Timeout in milliseconds (default: 30000)'
      },
      shell: {
        type: 'boolean' as const,
        description: 'Use shell to execute command (default: false)'
      },
      encoding: {
        type: 'string' as const,
        description: 'Output encoding (default: utf8)'
      }
    },
    required: ['command']
  };
}
```

## 보안 구현

### 1. 명령어 검증 시스템

```typescript
interface SecurityPolicy {
  allowedCommands?: string[];  // 화이트리스트
  blockedCommands: string[];   // 블랙리스트
  blockedPatterns: RegExp[];   // 위험 패턴
  maxCommandLength: number;    // 명령어 길이 제한
  allowShell: boolean;         // shell 사용 허용 여부
}

const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  blockedCommands: [
    // 파일 시스템 파괴
    'rm', 'rmdir', 'del', 'rd', 'format', 'mkfs',
    // 권한 관련
    'chmod', 'chown', 'sudo', 'su', 'doas',
    // 시스템 제어
    'shutdown', 'reboot', 'init', 'systemctl',
    // 위험한 실행
    'exec', 'eval', 'source',
    // 네트워크
    'nc', 'netcat', 'ncat',
    // 기타 위험 명령어
    'dd', 'fdisk', 'parted'
  ],
  blockedPatterns: [
    /;\s*rm\s+/,           // 세미콜론 뒤 rm
    /\|\s*rm\s+/,          // 파이프 뒤 rm
    /`[^`]*`/,             // 백틱
    /\$\([^)]*\)/,         // 명령어 치환
    />\s*\/dev\/[^\/]+/,   // 디바이스 파일 리다이렉션
  ],
  maxCommandLength: 1000,
  allowShell: false
};
```

### 2. 입력 Sanitization

```typescript
class CommandSanitizer {
  static sanitize(input: string): string {
    // 제어 문자 제거
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
    
    // 위험한 문자 이스케이프
    const dangerousChars = ['&', '|', ';', '$', '`', '\\', '!', '{', '}'];
    dangerousChars.forEach(char => {
      sanitized = sanitized.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
    });
    
    return sanitized;
  }
  
  static validatePath(path: string, basePath: string): boolean {
    const resolved = path.resolve(path);
    const base = path.resolve(basePath);
    return resolved.startsWith(base);
  }
}
```

### 3. 실행 컨텍스트 격리

```typescript
interface ExecutionContext {
  user: string;
  permissions: string[];
  workingDirectory: string;
  allowedPaths: string[];
  resourceLimits: {
    maxCpuTime: number;
    maxMemory: number;
    maxFileSize: number;
  };
}
```

## 구현 세부사항

### 1. 기본 실행 로직

```typescript
protected async executeCommand(context: CommandContext): Promise<CommandResult> {
  const { command, args = [], cwd, env, timeout = 30000, shell = false, encoding = 'utf8' } = context.args;
  
  try {
    // 1. 보안 검증
    await this.validateSecurity(command, args);
    
    // 2. 명령어 존재 확인
    if (!shell && !await this.commandExists(command)) {
      throw new Error(`Command not found: ${command}`);
    }
    
    // 3. 실행 옵션 준비
    const options = {
      cwd: cwd ? path.resolve(cwd) : process.cwd(),
      env: { ...process.env, ...env },
      timeout,
      shell,
      encoding,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    };
    
    // 4. 명령어 실행
    const startTime = Date.now();
    const { stdout, stderr, exitCode } = await this.executeWithTimeout(
      command, 
      args, 
      options
    );
    
    // 5. 결과 반환
    return this.formatResult({
      stdout,
      stderr,
      exitCode,
      executionTime: Date.now() - startTime,
      command: shell ? command : `${command} ${args.join(' ')}`
    });
    
  } catch (error) {
    return this.formatError(error);
  }
}
```

### 2. 타임아웃 처리

```typescript
private async executeWithTimeout(
  command: string,
  args: string[],
  options: any
): Promise<ExecutionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout);
  
  try {
    const result = await execa(command, args, {
      ...options,
      signal: controller.signal
    });
    
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode || 0
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Command timed out after ${options.timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
```

### 3. 스트리밍 지원 (향후 확장)

```typescript
interface StreamingOptions {
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
  onProgress?: (progress: number) => void;
}

async streamCommand(
  command: string,
  args: string[],
  streamingOptions: StreamingOptions
): Promise<void> {
  const subprocess = execa(command, args);
  
  subprocess.stdout?.on('data', (chunk) => {
    streamingOptions.onStdout?.(chunk.toString());
  });
  
  subprocess.stderr?.on('data', (chunk) => {
    streamingOptions.onStderr?.(chunk.toString());
  });
  
  await subprocess;
}
```

## 에러 처리

### 에러 타입 정의

```typescript
enum ShellExecutionError {
  COMMAND_NOT_FOUND = 'COMMAND_NOT_FOUND',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  TIMEOUT = 'TIMEOUT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_ARGUMENTS = 'INVALID_ARGUMENTS',
  EXECUTION_FAILED = 'EXECUTION_FAILED'
}

class ShellError extends Error {
  constructor(
    public type: ShellExecutionError,
    message: string,
    public details?: any
  ) {
    super(message);
  }
}
```

## 로깅 및 모니터링

```typescript
interface CommandLog {
  timestamp: Date;
  command: string;
  args: string[];
  user: string;
  exitCode: number;
  executionTime: number;
  error?: string;
}

class CommandLogger {
  async log(entry: CommandLog): Promise<void> {
    // 로그 저장 로직
    // 민감한 정보 마스킹
    const maskedEntry = this.maskSensitiveData(entry);
    await this.writeLog(maskedEntry);
  }
  
  private maskSensitiveData(entry: CommandLog): CommandLog {
    // 패스워드, 토큰 등 민감한 정보 마스킹
    return {
      ...entry,
      args: entry.args.map(arg => 
        arg.match(/password|token|secret/i) ? '***' : arg
      )
    };
  }
}
```

## 테스트 계획

### 단위 테스트

```typescript
describe('ExecuteShellCommand', () => {
  it('should execute simple commands', async () => {
    const result = await command.execute({
      args: { command: 'echo', args: ['hello'] },
      container
    });
    expect(result.data.stdout).toBe('hello\n');
  });
  
  it('should block dangerous commands', async () => {
    const result = await command.execute({
      args: { command: 'rm', args: ['-rf', '/'] },
      container
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('blocked');
  });
  
  it('should handle timeouts', async () => {
    const result = await command.execute({
      args: { command: 'sleep', args: ['10'], timeout: 100 },
      container
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });
});
```

## 배포 고려사항

### 1. 설정 파일
```json
{
  "shell_execution": {
    "enabled": true,
    "security": {
      "mode": "strict",  // strict, moderate, permissive
      "allowedCommands": ["ls", "cat", "grep", "find"],
      "maxTimeout": 60000,
      "logCommands": true
    }
  }
}
```

### 2. 권한 설정
- 최소 권한 원칙 적용
- 별도의 제한된 사용자로 실행
- 시스템 리소스 제한 설정

### 3. 모니터링
- 실행 명령어 감사 로그
- 이상 패턴 감지
- 성능 메트릭 수집
