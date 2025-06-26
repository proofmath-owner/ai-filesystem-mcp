# Phase 1 개선 사항

## 🎯 현재 상태
- ✅ 39개 명령어 모두 Command Pattern으로 마이그레이션 완료
- ✅ CommandRegistry를 통한 통합 관리
- ✅ 각 명령어별 입력 검증 구현

## 🚀 개선이 필요한 부분들

### 1. **타입 안전성 강화**
```typescript
// 현재: any 타입 사용
export interface CommandContext {
  args: Record<string, any>;
  fsManager: any; // 👈 이게 문제
}

// 개선안: 제네릭 사용
export interface CommandContext<TArgs = any> {
  args: TArgs;
  fsManager: FileSystemManager;
}

export abstract class Command<TArgs = any> {
  protected abstract executeCommand(
    context: CommandContext<TArgs>
  ): Promise<CommandResult>;
}
```

### 2. **에러 처리 개선**
```typescript
// 현재: 단순 문자열 에러
protected validateArgs(args: Record<string, any>): void {
  this.assertString(args.path, 'path');
}

// 개선안: 구체적인 에러 타입
export class ValidationError extends Error {
  constructor(
    public field: string,
    public expectedType: string,
    public actualValue: any
  ) {
    super(`Validation failed for '${field}': expected ${expectedType}, got ${typeof actualValue}`);
  }
}
```

### 3. **테스트 커버리지**
- 각 Command별 단위 테스트 작성
- 통합 테스트 스위트 구축
- 엣지 케이스 테스트 (큰 파일, 권한 없는 파일, 심볼릭 링크 등)

### 4. **성능 모니터링**
```typescript
export abstract class Command {
  async execute(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      this.validateArgs(context.args);
      const result = await this.executeCommand(context);
      
      // 성능 로깅
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`Command '${this.name}' took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      // 에러 로깅
      console.error(`Command '${this.name}' failed:`, error);
      throw error;
    }
  }
}
```

### 5. **Command 메타데이터 확장**
```typescript
export abstract class Command {
  // 현재 있는 것들
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: Tool['inputSchema'];
  
  // 추가하면 좋을 것들
  abstract readonly category: CommandCategory;
  abstract readonly permissions?: string[];
  abstract readonly timeout?: number;
  abstract readonly retryable?: boolean;
}
```

### 6. **의존성 주입 개선**
```typescript
// 현재: FileSystemManager를 직접 전달
const result = await registry.execute(name, {
  args,
  fsManager
});

// 개선안: ServiceContainer 사용
interface ServiceContainer {
  fileSystemManager: FileSystemManager;
  cacheManager: CacheManager;
  logger: Logger;
  config: Config;
}

const result = await registry.execute(name, {
  args,
  services: container
});
```

### 7. **Command 파이프라인**
```typescript
// 여러 명령어를 연결해서 실행
const pipeline = registry.createPipeline()
  .add('read_file', { path: 'input.txt' })
  .add('update_file', { updates: [...] })
  .add('write_file', { path: 'output.txt' });

const results = await pipeline.execute(services);
```

### 8. **실시간 진행 상황 리포팅**
```typescript
export interface ProgressCallback {
  (progress: {
    current: number;
    total: number;
    message: string;
  }): void;
}

export abstract class Command {
  protected onProgress?: ProgressCallback;
  
  // 사용 예
  protected async executeCommand(context) {
    this.onProgress?.({ current: 0, total: 100, message: 'Starting...' });
    // ... 작업 진행
    this.onProgress?.({ current: 50, total: 100, message: 'Processing...' });
  }
}
```

### 9. **Command 히스토리 & Undo**
```typescript
class CommandHistory {
  private history: ExecutedCommand[] = [];
  
  async undo(): Promise<void> {
    const last = this.history.pop();
    if (last?.undoable) {
      await last.undo();
    }
  }
}
```

### 10. **병렬 실행 지원**
```typescript
// 여러 파일을 동시에 읽기
const results = await registry.executeParallel([
  { command: 'read_file', args: { path: 'file1.txt' } },
  { command: 'read_file', args: { path: 'file2.txt' } },
  { command: 'read_file', args: { path: 'file3.txt' } }
]);
```

## 📋 우선순위 추천

1. **높음**: 타입 안전성, 에러 처리, 테스트
2. **중간**: 성능 모니터링, 의존성 주입
3. **낮음**: 파이프라인, 히스토리, 병렬 실행

## 🎯 다음 단계

Phase 1을 "탄탄히" 하려면:
1. 먼저 모든 Command에 대한 단위 테스트 작성
2. 타입 안전성 개선 (Generic Command 클래스)
3. 에러 처리 통일
4. 통합 테스트 스위트 구축

이렇게 하면 Phase 2로 넘어가기 전에 정말 견고한 기반을 만들 수 있을 거야!