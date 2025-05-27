# Phase 2: FileSystemManager 분리 및 구조 개선 계획

## 📋 개요
Phase 1에서 Command Pattern 마이그레이션을 100% 완료했습니다. 이제 Phase 2에서는 31KB의 거대한 FileSystemManager를 분리하고, 타입 안전성을 강화하며, 에러 처리를 통일할 계획입니다.

## 🎯 목표
1. **FileSystemManager 분해**: 단일 책임 원칙(SRP) 적용
2. **타입 안전성 강화**: 컴파일 타임과 런타임 검증 개선
3. **에러 처리 통일**: 일관된 에러 처리 시스템 구축

## 📊 현재 상태 분석

### FileSystemManager 메서드 분류 (총 39개)
```typescript
// File Operations (11개)
- readFile, readFiles, writeFile, updateFile, moveFile
- getFileMetadata, getDirectoryTree, createSymlink
- compareFiles, findDuplicateFiles, diffFiles

// Search Operations (6개)
- searchFiles, searchContent, searchByDate, searchBySize
- fuzzySearch, semanticSearch

// Git Operations (2개)
- gitStatus, gitCommit

// Security Operations (5개)
- changePermissions, encryptFile, decryptFile
- scanSecrets, securityAudit

// Code Analysis (3개)
- analyzeCode, modifyCode, analyzeProject

// Archive Operations (2개)
- compressFiles, extractArchive

// Batch/Transaction (2개)
- batchOperations, createTransaction

// Monitoring (4개)
- startWatching, stopWatching, getWatcherStats
- getFileSystemStats

// Refactoring (3개)
- suggestRefactoring, autoFormatProject, analyzeCodeQuality

// Cloud (1개)
- syncWithCloud
```

## 🏗️ Phase 2-1: FileSystemManager 분리

### 1. Service 인터페이스 정의
```typescript
// src/core/services/interfaces/IFileService.ts
interface IFileService {
  readFile(path: string): Promise<CommandResult>
  readFiles(paths: string[]): Promise<CommandResult>
  writeFile(path: string, content: string): Promise<CommandResult>
  updateFile(path: string, updates: UpdateOperation[]): Promise<CommandResult>
  moveFile(source: string, destination: string): Promise<CommandResult>
}
```

### 2. Service 구현 계획
```
src/core/services/
├── interfaces/
│   ├── IFileService.ts
│   ├── ISearchService.ts
│   ├── IGitService.ts
│   ├── ISecurityService.ts
│   ├── ICodeAnalysisService.ts
│   └── IMonitoringService.ts
├── impl/
│   ├── FileService.ts (11 methods)
│   ├── SearchService.ts (6 methods)
│   ├── GitService.ts (2 methods)
│   ├── SecurityService.ts (5 methods)
│   ├── CodeAnalysisService.ts (3 methods)
│   ├── ArchiveService.ts (2 methods)
│   ├── TransactionService.ts (2 methods)
│   ├── MonitoringService.ts (4 methods)
│   ├── RefactoringService.ts (3 methods)
│   └── CloudService.ts (1 method)
└── ServiceManager.ts (DI Container)
```

### 3. 마이그레이션 순서
1. **Week 1**: FileService (가장 기본적인 서비스)
2. **Week 2**: SearchService, MonitoringService
3. **Week 3**: GitService, SecurityService
4. **Week 4**: 나머지 서비스들

### 4. 구현 예시
```typescript
// src/core/services/impl/FileService.ts
export class FileService implements IFileService {
  constructor(
    private cacheManager: CacheManager,
    private errorHandler: ErrorHandler,
    private logger: Logger
  ) {}

  async readFile(path: string): Promise<CommandResult> {
    try {
      // 캐시 확인
      const cached = await this.cacheManager.get(path);
      if (cached) return cached;

      // 파일 읽기
      const content = await fs.readFile(path, 'utf-8');
      
      // 캐시 저장
      const result = this.createResult(content);
      await this.cacheManager.set(path, result);
      
      return result;
    } catch (error) {
      throw this.errorHandler.handle(error, 'FILE_READ_ERROR', { path });
    }
  }
}
```

## 🔒 Phase 2-2: 타입 안전성 강화

### 1. Zod 스키마 도입
```typescript
// src/core/schemas/commandSchemas.ts
import { z } from 'zod';

export const ReadFileArgsSchema = z.object({
  path: z.string().min(1, "Path cannot be empty")
});

export const WriteFileArgsSchema = z.object({
  path: z.string().min(1),
  content: z.string()
});

// Command에서 사용
class ReadFileCommand extends Command<z.infer<typeof ReadFileArgsSchema>> {
  protected validateArgs(args: unknown): z.infer<typeof ReadFileArgsSchema> {
    return ReadFileArgsSchema.parse(args);
  }
}
```

### 2. Generic Command 클래스
```typescript
// src/core/commands/Command.ts
export abstract class Command<TArgs = any, TResult = CommandResult> {
  abstract readonly schema: z.ZodSchema<TArgs>;
  
  async execute(context: CommandContext): Promise<TResult> {
    const validatedArgs = this.schema.parse(context.args);
    return this.executeCommand({
      ...context,
      args: validatedArgs
    });
  }
  
  protected abstract executeCommand(
    context: CommandContext<TArgs>
  ): Promise<TResult>;
}
```

### 3. 타입 추론 개선
```typescript
// 자동 타입 추론
const registry = createCommandRegistry();
const result = await registry.execute('read_file', {
  args: { path: './test.txt' }, // 타입 체크됨
  fsManager
});
```

## 🚨 Phase 2-3: 에러 처리 통일

### 1. 에러 클래스 계층 구조
```typescript
// src/core/errors/BaseError.ts
export abstract class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// src/core/errors/FileSystemError.ts
export class FileNotFoundError extends BaseError {
  constructor(path: string) {
    super(
      `File not found: ${path}`,
      'FILE_NOT_FOUND',
      404,
      { path }
    );
  }
}

export class PermissionDeniedError extends BaseError {
  constructor(path: string, operation: string) {
    super(
      `Permission denied: Cannot ${operation} ${path}`,
      'PERMISSION_DENIED',
      403,
      { path, operation }
    );
  }
}
```

### 2. 에러 핸들러
```typescript
// src/core/errors/ErrorHandler.ts
export class ErrorHandler {
  handle(error: unknown, defaultCode: string, context?: any): BaseError {
    // 이미 우리 에러인 경우
    if (error instanceof BaseError) {
      return error;
    }
    
    // Node.js 에러 변환
    if (error instanceof Error) {
      if (error.code === 'ENOENT') {
        return new FileNotFoundError(context?.path || 'unknown');
      }
      if (error.code === 'EACCES') {
        return new PermissionDeniedError(
          context?.path || 'unknown',
          context?.operation || 'access'
        );
      }
    }
    
    // 기본 에러
    return new BaseError(
      error?.message || 'Unknown error',
      defaultCode,
      500,
      context
    );
  }
}
```

### 3. 에러 응답 포맷
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// Command에서 사용
catch (error) {
  const handled = this.errorHandler.handle(error);
  return {
    content: [{
      type: 'error',
      text: handled.message,
      error: {
        code: handled.code,
        details: handled.context
      }
    }]
  };
}
```

## 📅 구현 일정

### Week 1-2: FileSystemManager 분리 준비
- [ ] Service 인터페이스 정의
- [ ] ServiceManager (DI Container) 구현
- [ ] FileService 구현 및 테스트
- [ ] 기존 Command들이 Service 사용하도록 수정

### Week 3: 타입 안전성
- [ ] Zod 스키마 정의
- [ ] Generic Command 클래스 구현
- [ ] 모든 Command에 스키마 적용
- [ ] 타입 테스트 작성

### Week 4: 에러 처리
- [ ] 에러 클래스 계층 구조 구현
- [ ] ErrorHandler 구현
- [ ] 모든 Service에 에러 처리 적용
- [ ] 에러 처리 테스트

### Week 5-8: 나머지 Service 구현
- [ ] SearchService
- [ ] GitService
- [ ] SecurityService
- [ ] 기타 Service들

## 🧪 테스트 전략

### 1. Unit Tests
```typescript
// src/tests/services/FileService.test.ts
describe('FileService', () => {
  let service: FileService;
  let mockCache: jest.Mocked<CacheManager>;
  
  beforeEach(() => {
    mockCache = createMockCacheManager();
    service = new FileService(mockCache, errorHandler, logger);
  });
  
  test('should read file from cache if exists', async () => {
    mockCache.get.mockResolvedValue(cachedContent);
    
    const result = await service.readFile('test.txt');
    
    expect(mockCache.get).toHaveBeenCalledWith('test.txt');
    expect(result).toEqual(cachedContent);
  });
});
```

### 2. Integration Tests
```typescript
// src/tests/integration/commands.test.ts
describe('Command Integration', () => {
  test('ReadFileCommand with FileService', async () => {
    const registry = createCommandRegistry();
    const result = await registry.execute('read_file', {
      args: { path: './test-file.txt' },
      serviceManager
    });
    
    expect(result.content[0].type).toBe('text');
  });
});
```

## 📋 체크리스트

### Phase 2 완료 기준
- [ ] FileSystemManager가 10개의 독립적인 Service로 분리됨
- [ ] 모든 Command가 Zod 스키마를 사용함
- [ ] 통일된 에러 처리 시스템 구축
- [ ] 90% 이상의 테스트 커버리지
- [ ] 성능 저하 없음 (벤치마크 통과)

## 🔄 마이그레이션 전략

### 1. 점진적 마이그레이션
- 기존 FileSystemManager는 유지
- Service를 하나씩 추출
- Command들을 점진적으로 Service 사용하도록 변경

### 2. Feature Flag 사용
```typescript
const USE_NEW_FILE_SERVICE = process.env.USE_NEW_FILE_SERVICE === 'true';

if (USE_NEW_FILE_SERVICE) {
  return await this.fileService.readFile(path);
} else {
  return await this.fsManager.readFile(path);
}
```

### 3. 롤백 계획
- 각 Service는 독립적으로 롤백 가능
- 문제 발생 시 즉시 이전 버전으로 전환

## 🎯 성공 지표

1. **코드 품질**
   - FileSystemManager 크기: 31KB → 각 Service 3-5KB
   - 순환 복잡도 감소: 평균 10 → 5 이하
   - 테스트 커버리지: 90% 이상

2. **개발 효율성**
   - 새 기능 추가 시간: 50% 감소
   - 버그 수정 시간: 40% 감소
   - 코드 리뷰 시간: 30% 감소

3. **런타임 성능**
   - 메모리 사용량: 동일하거나 개선
   - 응답 시간: 동일하거나 개선
   - 에러율: 50% 감소

## 📚 참고 자료
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Dependency Injection in TypeScript](https://www.typescriptlang.org/docs/handbook/decorators.html)
- [Zod Documentation](https://zod.dev/)
- [Error Handling Best Practices](https://www.toptal.com/nodejs/node-js-error-handling)
