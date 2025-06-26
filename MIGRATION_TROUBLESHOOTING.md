# AI FileSystem MCP - 마이그레이션 문제 해결 가이드

## 현재 상황

마이그레이션 테스트가 실패했습니다. 주요 문제점:

1. **TypeScript 컴파일 실패**
   - 일부 import 경로 문제
   - 타입 정의 누락

2. **테스트 환경 설정 필요**
   - Jest 설정 업데이트 필요
   - 테스트 파일 경로 수정 필요

## 해결 방법

### 1단계: 환경 설정
```bash
# 디렉토리로 이동
cd /Users/Sangbinna/mcp/ai-filesystem-mcp

# 의존성 설치
npm install

# 빠른 검증 실행
./quick-validate.sh
```

### 2단계: 누락된 구현 추가

다음 파일들이 구현되어야 합니다:

1. **서비스 구현**
   - `FileOperations.ts`
   - `DirectoryOperations.ts`
   - `ContentSearcher.ts`
   - `FuzzySearcher.ts`
   - `SemanticSearcher.ts`
   - `GitOperations.ts`
   - `GitHubIntegration.ts`
   - `ASTProcessor.ts`
   - `RefactoringEngine.ts`

2. **명령어 구현**
   - 각 카테고리별 명령어 클래스들

### 3단계: 점진적 마이그레이션

1. **기존 코드 재사용**
   ```typescript
   // 기존 FileSystemManager의 메서드를 서비스로 분리
   // 예: FileSystemManager.readFile() -> FileService.readFile()
   ```

2. **래퍼 패턴 사용**
   ```typescript
   export class FileOperations {
     constructor(private fsManager: FileSystemManager) {}
     
     async readFile(path: string): Promise<string> {
       return this.fsManager.readFile(path);
     }
   }
   ```

3. **단계별 전환**
   - Phase 1: 기존 코드를 래핑
   - Phase 2: 내부 구현 리팩토링
   - Phase 3: 완전한 분리

### 4단계: 테스트 수정

1. **Jest 설정 업데이트**
   ```javascript
   // jest.config.js
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'node',
     moduleNameMapper: {
       '^(\\.{1,2}/.*)\\.js$': '$1'
     }
   };
   ```

2. **테스트 경로 수정**
   - 테스트 파일을 올바른 위치로 이동
   - import 경로 업데이트

### 5단계: 빌드 및 검증

```bash
# TypeScript 빌드
npm run build

# 테스트 실행
npm test

# 마이그레이션 테스트
./scripts/test-migration.sh
```

## 권장 사항

1. **점진적 접근**
   - 한 번에 모든 것을 변경하지 말고 단계별로 진행
   - 각 단계마다 테스트 확인

2. **기존 코드 활용**
   - FileSystemManager의 메서드들을 서비스로 이동
   - 검증된 로직 재사용

3. **문서화**
   - 각 서비스와 명령어에 대한 문서 작성
   - API 변경사항 기록

## 다음 단계

1. 누락된 구현체 작성
2. 테스트 환경 정비
3. 점진적 마이그레이션 실행
4. 성능 테스트 및 최적화

이 가이드를 따라 진행하면 안정적으로 마이그레이션을 완료할 수 있습니다.
