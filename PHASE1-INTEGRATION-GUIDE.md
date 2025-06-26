# PHASE1 통합 가이드

## 🔧 새로운 명령어 통합 방법

### 1. ASTProcessor 개선 버전 적용

```bash
# 기존 파일 백업
mv src/core/ASTProcessor.ts src/core/ASTProcessor.original.ts

# 개선된 버전 적용
mv src/core/ASTProcessor-improved.ts src/core/ASTProcessor.ts
```

### 2. GitIntegration 메서드 추가

`src/core/GitIntegration.ts` 파일 끝에 추가:

```typescript
// GitIntegration-additions.ts의 내용을 복사하여 붙여넣기
```

### 3. 명령어 등록 업데이트

`src/core/commands/index.ts` 파일 수정:

```typescript
// 1. Import 추가
import {
  TouchCommand,
  CopyFileCommand,
  DeleteFilesCommand,
  GetWorkingDirectoryCommand,
  DiskUsageCommand,
  WatchDirectoryCommand
} from './utility/UtilityCommands.js';

import {
  GitRemoteCommand,
  GitStashCommand,
  GitTagCommand,
  GitMergeCommand,
  GitRebaseCommand,
  GitDiffCommand,
  GitResetCommand,
  GitCherryPickCommand
} from './git/GitAdvancedCommands.js';

// 2. Registry에 추가 (createCommandRegistry 함수 내)
// Utility commands
registry.registerMany([
  new TouchCommand(),
  new CopyFileCommand(),
  new DeleteFilesCommand(),
  new GetWorkingDirectoryCommand(),
  new DiskUsageCommand(),
  new WatchDirectoryCommand()
]);

// Git Advanced commands
registry.registerMany([
  new GitRemoteCommand(),
  new GitStashCommand(),
  new GitTagCommand(),
  new GitMergeCommand(),
  new GitRebaseCommand(),
  new GitDiffCommand(),
  new GitResetCommand(),
  new GitCherryPickCommand()
]);
```

### 4. 빌드 및 테스트

```bash
# 빌드
npm run build

# 전체 테스트
npm run test:all

# 새 명령어만 테스트
node test-new-commands.js

# PHASE1 전체 확인
node phase1-complete-check.js
```

## 📊 현재 상태

### 기존 명령어 (39개)
- File: 5개
- Search: 6개
- Git: 10개
- Code Analysis: 2개
- Transaction: 1개
- Watcher: 3개
- Archive: 2개
- System: 1개
- Batch: 1개
- Refactoring: 3개
- Cloud: 1개
- Security: 5개
- Metadata: 7개

### 새로 추가된 명령어 (19개)
- Directory: 5개 (이미 등록됨)
- Utility: 6개 (통합 필요)
- Git Advanced: 8개 (통합 필요)

### 총 명령어: 58개

## ⚠️ 주의사항

1. **Directory Commands**는 이미 index.ts에 import되어 있지만, 실제 파일이 없어서 빌드 오류가 날 수 있습니다.

2. **Utility와 Git Advanced Commands**는 아직 index.ts에 등록되지 않았습니다.

3. **GitIntegration**에 새로운 메서드들을 추가해야 합니다.

## 🚀 빠른 통합 스크립트

```bash
#!/bin/bash
# integrate-phase1.sh

echo "🔧 Integrating PHASE1 enhancements..."

# 1. ASTProcessor 교체
if [ -f "src/core/ASTProcessor-improved.ts" ]; then
  mv src/core/ASTProcessor.ts src/core/ASTProcessor.original.ts
  mv src/core/ASTProcessor-improved.ts src/core/ASTProcessor.ts
  echo "✅ ASTProcessor updated"
fi

# 2. GitIntegration 업데이트
if [ -f "src/core/GitIntegration-additions.ts" ]; then
  cat src/core/GitIntegration-additions.ts >> src/core/GitIntegration.ts
  echo "✅ GitIntegration methods added"
fi

# 3. 빌드
npm run build

echo "✨ Integration complete! Run tests to verify."
```

## 📝 테스트 체크리스트

- [ ] `analyze_code` 명령어가 JS/TS 파일에서 작동하는지 확인
- [ ] Directory 명령어들이 모두 작동하는지 확인
- [ ] Utility 명령어들이 등록되고 작동하는지 확인
- [ ] Git Advanced 명령어들이 등록되고 작동하는지 확인
- [ ] 전체 39개 → 58개 명령어로 증가했는지 확인

## 🎯 완료 기준

1. 모든 58개 명령어가 registry에 등록됨
2. `npm run test:all` 성공률 80% 이상
3. `analyze_code` 명령어가 정상 작동
4. 새로운 디렉토리/유틸리티/Git 명령어 작동 확인

이 가이드를 따라 PHASE1 개선사항을 완전히 통합하면, 더욱 강력한 AI FileSystem MCP가 완성됩니다!
