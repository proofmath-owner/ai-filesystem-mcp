# AI FileSystem MCP 개선 계획

## 📋 현재 상태 분석

### 프로젝트 정보
- **버전**: v2.0.0 (package.json) / v3.0 마이그레이션 진행 중
- **아키텍처**: Command Pattern + Service Container + 의존성 주입
- **언어**: TypeScript (ES2022, NodeNext 모듈)
- **주요 기능**: 파일시스템, 코드 분석, Git 통합, 보안, 검색

### 현재 문제점

1. **불완전한 마이그레이션**
   - CommandLoader에서 일부 명령어만 로드 (file, directory, security)
   - Git, Search, Code 관련 명령어 미구현
   - 전체 39개 명령어 중 일부만 활성화

2. **모듈 호환성 문제**
   - @babel/traverse의 ES 모듈/CommonJS 호환성 문제
   - 일부 import 구문에서 특별한 처리 필요

3. **버전 불일치**
   - package.json: v2.0.0
   - MIGRATION_COMPLETE.md: v3.0
   - 일관성 있는 버전 관리 필요

4. **테스트 환경**
   - Jest 설정이 ES 모듈에 최적화되지 않음
   - 통합 테스트와 단위 테스트 분리 필요

## 🎯 개선 목표

### 1단계: 마이그레이션 완료 (우선순위: 높음)
- [ ] 누락된 명령어 구현 완료
- [ ] 모든 39개 명령어 활성화
- [ ] 버전 정보 통일

### 2단계: 코드 품질 개선 (우선순위: 중간)
- [ ] TypeScript 설정 최적화
- [ ] ES 모듈 호환성 문제 해결
- [ ] 에러 처리 강화

### 3단계: 성능 최적화 (우선순위: 중간)
- [ ] 캐싱 전략 개선
- [ ] 병렬 처리 최적화
- [ ] 메모리 사용 최적화

### 4단계: 테스트 환경 개선 (우선순위: 높음)
- [ ] Jest 설정 ES 모듈 지원
- [ ] 테스트 커버리지 향상
- [ ] E2E 테스트 추가

## 🚀 구체적인 개선 방안

### 1. 누락된 명령어 구현

#### Git 명령어
```typescript
// src/commands/implementations/git/index.ts
export { GitInitCommand } from './GitInitCommand.js';
export { GitAddCommand } from './GitAddCommand.js';
export { GitCommitCommand } from './GitCommitCommand.js';
export { GitPushCommand } from './GitPushCommand.js';
export { GitPullCommand } from './GitPullCommand.js';
export { GitBranchCommand } from './GitBranchCommand.js';
export { GitCheckoutCommand } from './GitCheckoutCommand.js';
export { GitLogCommand } from './GitLogCommand.js';
export { GitStatusCommand } from './GitStatusCommand.js';
export { GitCloneCommand } from './GitCloneCommand.js';
export { GitHubCreatePRCommand } from './GitHubCreatePRCommand.js';
```

#### Search 명령어
```typescript
// src/commands/implementations/search/index.ts
export { SearchFilesCommand } from './SearchFilesCommand.js';
export { SearchContentCommand } from './SearchContentCommand.js';
export { FuzzySearchCommand } from './FuzzySearchCommand.js';
export { SemanticSearchCommand } from './SemanticSearchCommand.js';
```

#### Code 명령어
```typescript
// src/commands/implementations/code/index.ts
export { AnalyzeCodeCommand } from './AnalyzeCodeCommand.js';
export { ModifyCodeCommand } from './ModifyCodeCommand.js';
export { SuggestRefactoringCommand } from './SuggestRefactoringCommand.js';
export { FormatCodeCommand } from './FormatCodeCommand.js';
```

### 2. 모듈 호환성 해결

#### @babel/traverse 문제 해결
```typescript
// src/core/utils/moduleCompat.ts
export function requireDefault<T>(module: any): T {
  return module.default || module;
}

// 사용 예
import traversePkg from '@babel/traverse';
import { requireDefault } from '../utils/moduleCompat.js';
const traverse = requireDefault<typeof traversePkg>(traversePkg);
```

### 3. TypeScript 설정 최적화

```json
// tsconfig.json 개선
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### 4. Jest 설정 개선

```javascript
// jest.config.mjs
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
        },
      },
    ],
  },
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
```

### 5. 의존성 주입 패턴 개선

```typescript
// src/core/interfaces/ServiceLocator.ts
export interface ServiceLocator {
  get<T>(token: ServiceToken<T>): T;
  register<T>(token: ServiceToken<T>, instance: T): void;
}

// src/core/ServiceToken.ts
export class ServiceToken<T> {
  constructor(public readonly name: string) {}
}

// 사용 예
export const FILE_SERVICE = new ServiceToken<FileService>('FileService');
export const GIT_SERVICE = new ServiceToken<GitService>('GitService');
```

### 6. 에러 처리 강화

```typescript
// src/core/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// src/core/errors/errorCodes.ts
export const ErrorCodes = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const;
```

### 7. 성능 모니터링 개선

```typescript
// src/core/monitoring/PerformanceMonitor.ts
export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();

  startOperation(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    };
  }

  private recordMetric(name: string, duration: number): void {
    const metric = this.metrics.get(name) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: -Infinity,
    };

    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);

    this.metrics.set(name, metric);
  }

  getReport(): PerformanceReport {
    const report: PerformanceReport = {};
    for (const [name, metric] of this.metrics) {
      report[name] = {
        ...metric,
        avgTime: metric.totalTime / metric.count,
      };
    }
    return report;
  }
}
```

## 📈 구현 우선순위

### Phase 1 (1주차)
1. 누락된 명령어 구현 완료
2. CommandLoader 업데이트
3. 버전 정보 통일
4. 기본 테스트 작성

### Phase 2 (2주차)
1. TypeScript 설정 최적화
2. 모듈 호환성 문제 해결
3. Jest 설정 개선
4. 테스트 커버리지 70% 달성

### Phase 3 (3주차)
1. 의존성 주입 패턴 개선
2. 에러 처리 시스템 구축
3. 성능 모니터링 구현
4. 문서화 완료

### Phase 4 (4주차)
1. 성능 최적화
2. 보안 강화
3. E2E 테스트 구축
4. 프로덕션 준비

## 🎯 성공 지표

- [ ] 모든 39개 명령어 정상 작동
- [ ] TypeScript 컴파일 오류 0개
- [ ] 테스트 커버리지 80% 이상
- [ ] 평균 응답 시간 100ms 이하
- [ ] 메모리 사용량 200MB 이하
- [ ] 문서화 완료율 100%

## 📝 다음 단계

1. 이 계획에 따라 단계별 구현 시작
2. 각 단계별 진행 상황 추적
3. 주간 리뷰 및 계획 조정
4. 완료 후 성능 벤치마크 실행
