# 📚 AI FileSystem MCP - Documentation Overview

## 프로젝트 문서 구조

### 📋 주요 문서들

#### 1. **[README.md](./README.md)**
- 프로젝트 소개 및 개요
- v2.0 기능 소개
- 설치 및 사용 방법
- 로드맵 및 진행 상황

#### 2. **[REFACTORING.md](./REFACTORING.md)**
- 리팩토링 전체 개요
- Phase별 진행 상황
- 개선 사항 및 이슈
- 사용 방법 (기존 vs 리팩토링 버전)

#### 3. **[PHASE2-PLAN.md](./PHASE2-PLAN.md)** 🆕
- FileSystemManager 분리 계획
- Service Architecture 설계
- 타입 안전성 강화 방안
- 통일된 에러 처리 시스템
- 구현 일정 및 체크리스트

#### 4. **[PHASE3-PLAN.md](./PHASE3-PLAN.md)** 🆕
- 성능 최적화 계획
- 이벤트 기반 파일 감시
- 스트리밍 처리
- Worker Thread 병렬 처리
- 벤치마크 및 성능 목표

#### 5. **[CHANGELOG.md](./CHANGELOG.md)**
- v2.0.0: 주요 기능 업데이트
- v2.1.0: Command Pattern 완료

#### 6. **[CONTRIBUTING.md](./CONTRIBUTING.md)**
- 기여 가이드라인
- 코드 스타일
- PR 프로세스

#### 7. **[LICENSE](./LICENSE)**
- MIT 라이선스

## 📊 리팩토링 진행 현황

### ✅ Phase 1: Command Pattern (100% 완료)
- 39/39 명령어 마이그레이션 완료
- 700줄 switch문 → 모듈화된 Command 클래스
- 카테고리별 폴더 구조 정리

### 🔄 Phase 2: Service Architecture (계획 중)
- FileSystemManager 분리 (31KB → 10개 서비스)
- 의존성 주입 구현
- Zod 런타임 검증
- 에러 처리 통일

### 🚀 Phase 3: Performance (미래)
- 파일 감시: 100x 개선
- 메모리 효율: 20x 개선
- 처리 속도: 6x 개선

## 📁 코드 구조

```
ai-filesystem-mcp/
├── src/
│   ├── index.ts              # 기존 진입점
│   ├── index-refactored.ts   # 리팩토링된 진입점
│   ├── core/
│   │   ├── commands/         # Command Pattern 구현
│   │   │   ├── Command.ts
│   │   │   ├── CommandRegistry.ts
│   │   │   ├── file/
│   │   │   ├── search/
│   │   │   ├── git/
│   │   │   ├── security/
│   │   │   ├── metadata/     # 새로 추가 (7개 명령어)
│   │   │   └── ...
│   │   ├── FileSystemManager.ts  # 분리 예정
│   │   └── ...
│   └── legacy/
│       └── LegacyCommands.ts # 점진적 마이그레이션 지원
├── docs/                     # 추가 문서 (계획)
│   ├── api/
│   ├── guides/
│   └── examples/
└── tests/
    ├── test.js
    ├── test-refactored.js
    └── test-metadata.js      # 새로 추가
```

## 🧪 테스트 방법

### 기존 버전
```bash
npm run build
npm test
```

### 리팩토링 버전
```bash
npm run build
npm run test:refactored
```

### Metadata Commands 테스트
```bash
npm run build
node test-metadata.js
```

## 📝 문서 작성 가이드

### 새로운 기능 추가 시
1. Command 클래스 구현
2. 해당 카테고리 폴더에 추가
3. CommandRegistry에 등록
4. 테스트 작성
5. README.md 업데이트

### 문서 업데이트 우선순위
1. **CHANGELOG.md** - 모든 변경사항 기록
2. **README.md** - 사용자 대면 문서
3. **REFACTORING.md** - 개발자용 진행 상황
4. **Phase 계획 문서** - 상세 구현 계획

## 🔗 유용한 링크들

- [MCP SDK Documentation](https://modelcontextprotocol.io)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Node.js Performance Guide](https://nodejs.org/en/docs/guides/simple-profiling/)

## 💡 다음 단계

1. **즉시 할 일**
   - Phase 2 구현 시작 (FileService 먼저)
   - 단위 테스트 커버리지 확대
   - CI/CD 파이프라인 구축

2. **중기 목표**
   - 모든 Service 분리 완료
   - 통합 테스트 Suite 구축
   - 성능 벤치마크 자동화

3. **장기 목표**
   - Phase 3 성능 최적화
   - 플러그인 시스템 구현
   - 다국어 지원

---

📅 마지막 업데이트: 2025-01-28
