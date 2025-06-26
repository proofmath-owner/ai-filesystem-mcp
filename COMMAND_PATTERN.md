# 명령어 작성 표준 패턴

## 1. 기본 구조

```typescript
import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandResult, CommandContext } from '../../../types/command.types.js';

export class MyCommand extends BaseCommand {
  // 1. 명령어 기본 정보
  readonly name = 'my_command';
  readonly description = 'Description of my command';
  
  // 2. 스키마 정의 (Zod 사용하지 않음)
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      param1: {
        type: 'string' as const,
        description: 'First parameter'
      },
      param2: {
        type: 'number' as const,
        description: 'Second parameter',
        default: 10
      }
    },
    required: ['param1']
  };

  // 3. 매개변수 검증 (선택사항)
  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.param1, 'param1');
    if (args.param2 !== undefined) {
      this.assertNumber(args.param2, 'param2');
    }
  }

  // 4. 명령어 실행
  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      // 서비스 가져오기
      const service = context.container.getService<MyService>('myService');
      
      // 비즈니스 로직 실행
      const result = await service.doSomething(
        context.args.param1,
        context.args.param2 || 10
      );
      
      // 성공 응답
      return {
        success: true,
        data: result
      };
    } catch (error) {
      // 에러 응답
      return this.formatError(error);
    }
  }
}
```

## 2. 주의사항

### ❌ 사용하지 말 것
- Zod 스키마
- `execute(args)` 메서드
- `content: [{type: 'text', text: ...}]` 형식
- `this.context.container`

### ✅ 사용할 것
- 일반 객체로 스키마 정의
- `executeCommand(context)` 메서드
- `{success: true, data: ...}` 형식
- `context.container`
- `context.args`

## 3. 타입 정의

```typescript
// CommandResult 타입
interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
}

// inputSchema 타입
interface InputSchema {
  type: string;
  properties: Record<string, any>;
  required?: string[];
}
```

## 4. 예시: 파일 읽기 명령어

```typescript
export class ReadFileCommand extends BaseCommand {
  readonly name = 'read_file';
  readonly description = 'Read contents of a file';
  
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string' as const,
        description: 'Path to the file'
      }
    },
    required: ['path']
  };

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    try {
      const fileService = context.container.getService<FileService>('fileService');
      const content = await fileService.readFile(context.args.path);
      
      return {
        success: true,
        data: content
      };
    } catch (error) {
      return this.formatError(error);
    }
  }
}
```
