#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 추가 정리 작업 시작!${NC}"

# 1. scripts/build 디렉토리 생성
echo -e "\n${YELLOW}📁 Step 1: 빌드 디렉토리 생성 중...${NC}"
mkdir -p scripts/build

# 2. 백업에서 빌드 스크립트 복구
echo -e "\n${YELLOW}📥 Step 2: 빌드 스크립트 복구 중...${NC}"
BACKUP_DIR=$(ls -d ../ai-filesystem-mcp-backup-* | head -1)

if [ -d "$BACKUP_DIR" ]; then
    cp "$BACKUP_DIR/build.sh" scripts/build/ 2>/dev/null && echo "✅ build.sh 복구"
    cp "$BACKUP_DIR/build-project.sh" scripts/build/ 2>/dev/null && echo "✅ build-project.sh 복구"
    cp "$BACKUP_DIR/quick-build.sh" scripts/build/ 2>/dev/null && echo "✅ quick-build.sh 복구"
    cp "$BACKUP_DIR/diagnose-build.sh" scripts/build/ 2>/dev/null && echo "✅ diagnose-build.sh 복구"
else
    echo -e "${RED}❌ 백업 폴더를 찾을 수 없습니다${NC}"
fi

# 3. 루트에 남은 파일들 정리
echo -e "\n${YELLOW}🧹 Step 3: 루트 파일 정리 중...${NC}"

# check-build 관련 파일들을 scripts/build로 이동
mv check-build.sh scripts/build/ 2>/dev/null && echo "✅ check-build.sh 이동"
mv check-build-error.js scripts/debug/ 2>/dev/null && echo "✅ check-build-error.js 이동"

# test.js는 tests/integration으로 이동
mv test.js tests/integration/ 2>/dev/null && echo "✅ test.js 이동"

# 4. package.json 업데이트를 위한 sed 스크립트 생성
echo -e "\n${YELLOW}📝 Step 4: package.json 업데이트 스크립트 생성 중...${NC}"

cat > update-package-json.js << 'EOF'
const fs = require('fs');

// package.json 읽기
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// scripts 업데이트
const updatedScripts = {
    ...packageJson.scripts,
    "test": "npm run build && node tests/integration/test.js",
    "test:refactored": "npm run build && node tests/integration/test-refactored.js",
    "test:phase1": "npm run build && node tests/integration/test-phase1.js",
    "validate:phase1": "npm run build && node scripts/debug/debug-phase1.js"
};

packageJson.scripts = updatedScripts;

// 업데이트된 package.json 저장
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');

console.log('✅ package.json 업데이트 완료!');
EOF

# 5. 정리 완료 보고서 생성
echo -e "\n${YELLOW}📊 Step 5: 정리 보고서 생성 중...${NC}"

cat > docs/CLEANUP_REPORT.md << 'EOF'
# 프로젝트 정리 보고서

## 정리 완료 항목

### 📁 디렉토리 구조
- `docs/` - 모든 문서 파일 정리
  - `phases/` - PHASE 관련 문서들
- `scripts/` - 스크립트 파일 카테고리별 정리
  - `build/` - 빌드 관련 스크립트
  - `test/` - 테스트 실행 스크립트
  - `debug/` - 디버그 도구
  - `setup/` - 설치 및 설정 스크립트
- `tests/` - 테스트 파일 정리
  - `integration/` - 통합 테스트
- `legacy/` - 리팩토링 이전 코드

### 🔄 주요 변경사항
1. `src/index.ts` - 리팩토링된 버전으로 교체
2. 모든 테스트 파일을 `tests/integration/`으로 이동
3. 스크립트 파일들을 목적별로 분류

### ⚠️ 필요한 후속 작업
1. `package.json`의 스크립트 경로 업데이트 (update-package-json.js 실행)
2. 각 스크립트 파일 내부의 상대 경로 확인 및 수정
3. CI/CD 설정 파일 경로 업데이트 (있는 경우)
4. README.md의 파일 경로 업데이트

### 🗑️ 삭제 가능 항목 (확인 후)
- `legacy/` 폴더 (모든 기능이 정상 작동 확인 후)
- 백업 폴더 (충분한 테스트 후)
EOF

echo -e "\n${GREEN}🎉 추가 정리 작업 완료!${NC}"
echo -e "\n${YELLOW}다음 단계:${NC}"
echo -e "1. node update-package-json.js 실행하여 package.json 업데이트"
echo -e "2. npm test로 테스트 실행 확인"
echo -e "3. 각 스크립트 파일의 경로 확인"
