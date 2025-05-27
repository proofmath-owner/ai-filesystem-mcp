#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 AI Filesystem MCP 프로젝트 정리 시작!${NC}"

# 1. 백업 생성
echo -e "\n${YELLOW}📦 Step 1: 백업 생성 중...${NC}"
BACKUP_DIR="../ai-filesystem-mcp-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
echo -e "${GREEN}✅ 백업 완료: $BACKUP_DIR${NC}"

# 2. 디렉토리 구조 생성
echo -e "\n${YELLOW}📁 Step 2: 새 디렉토리 구조 생성 중...${NC}"

# docs 디렉토리
mkdir -p docs/phases
mkdir -p docs/guides

# scripts 디렉토리
mkdir -p scripts/build
mkdir -p scripts/test
mkdir -p scripts/debug
mkdir -p scripts/setup

# tests 디렉토리
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p tests/debug

# legacy 디렉토리
mkdir -p legacy

echo -e "${GREEN}✅ 디렉토리 구조 생성 완료${NC}"

# 3. 문서 파일 이동
echo -e "\n${YELLOW}📄 Step 3: 문서 파일 정리 중...${NC}"

# Phase 관련 문서
mv PHASE*.md docs/phases/ 2>/dev/null || true

# 기타 문서
mv CHANGELOG.md docs/ 2>/dev/null || true
mv CONTRIBUTING.md docs/ 2>/dev/null || true
mv DOCUMENTATION.md docs/ 2>/dev/null || true
mv REFACTORING.md docs/ 2>/dev/null || true

# README는 루트에 유지
echo -e "${GREEN}✅ 문서 파일 정리 완료${NC}"

# 4. 스크립트 파일 이동
echo -e "\n${YELLOW}🔧 Step 4: 스크립트 파일 정리 중...${NC}"

# 빌드 관련
mv build*.sh scripts/build/ 2>/dev/null || true
mv quick-build.sh scripts/build/ 2>/dev/null || true
mv diagnose-build.sh scripts/build/ 2>/dev/null || true

# 테스트 관련
mv test*.sh scripts/test/ 2>/dev/null || true
mv run-phase1-test.sh scripts/test/ 2>/dev/null || true
mv phase1-final-test.sh scripts/test/ 2>/dev/null || true
mv rebuild-and-test.sh scripts/test/ 2>/dev/null || true

# 디버그 관련
mv debug*.js scripts/debug/ 2>/dev/null || true
mv quick-diagnose.js scripts/debug/ 2>/dev/null || true

# 설치/설정 관련
mv install.sh scripts/setup/ 2>/dev/null || true
mv clean-install.sh scripts/setup/ 2>/dev/null || true
mv setup-and-validate.sh scripts/setup/ 2>/dev/null || true
mv check-path.sh scripts/setup/ 2>/dev/null || true

# GitHub 관련
mv create-github-repo.sh scripts/ 2>/dev/null || true

echo -e "${GREEN}✅ 스크립트 파일 정리 완료${NC}"

# 5. 테스트 파일 이동
echo -e "\n${YELLOW}🧪 Step 5: 테스트 파일 정리 중...${NC}"

# 루트의 테스트 파일들
mv test-*.js tests/integration/ 2>/dev/null || true
mv validate-phase1.js tests/integration/ 2>/dev/null || true
mv integration-test.js tests/integration/ 2>/dev/null || true
mv quick-test.js tests/integration/ 2>/dev/null || true

echo -e "${GREEN}✅ 테스트 파일 정리 완료${NC}"

# 6. 레거시 코드 처리
echo -e "\n${YELLOW}🗄️ Step 6: 레거시 코드 처리 중...${NC}"

# 기존 index.ts를 legacy로 이동 (refactored 버전이 있다면)
if [ -f "src/index-refactored.ts" ]; then
    mv src/index.ts legacy/index-legacy.ts 2>/dev/null || true
    mv src/index-refactored.ts src/index.ts
    echo -e "${GREEN}✅ index.ts 리팩토링 버전으로 교체${NC}"
fi

echo -e "${GREEN}✅ 레거시 코드 처리 완료${NC}"

# 7. Jest 설정 정리
echo -e "\n${YELLOW}⚙️ Step 7: Jest 설정 정리 중...${NC}"

# 중복된 jest 설정 파일 정리
if [ -f "jest.config.ts" ]; then
    mv jest.config.js.backup legacy/ 2>/dev/null || true
    mv jest.config.mjs legacy/ 2>/dev/null || true
    echo -e "${GREEN}✅ Jest 설정 통합 완료${NC}"
fi

# 8. 빈 디렉토리 제거
echo -e "\n${YELLOW}🧹 Step 8: 빈 디렉토리 정리 중...${NC}"
find . -type d -empty -delete 2>/dev/null || true

echo -e "\n${GREEN}🎉 프로젝트 정리 완료!${NC}"
echo -e "\n${YELLOW}📋 다음 단계:${NC}"
echo -e "1. ${BACKUP_DIR}에 백업이 생성되었습니다"
echo -e "2. 정리된 구조를 확인하고 문제가 있으면 백업에서 복원하세요"
echo -e "3. 모든 것이 정상이면 legacy/ 폴더를 나중에 삭제하세요"
echo -e "4. scripts/ 폴더의 스크립트들 경로를 업데이트해야 할 수 있습니다"
