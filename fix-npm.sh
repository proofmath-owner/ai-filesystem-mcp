#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Node modules 재설치 시작...${NC}"

# 1. node_modules 삭제
echo -e "\n${YELLOW}1. 기존 node_modules 삭제 중...${NC}"
rm -rf node_modules
rm -f package-lock.json

echo -e "${GREEN}✅ 정리 완료${NC}"

# 2. npm 캐시 정리
echo -e "\n${YELLOW}2. npm 캐시 정리 중...${NC}"
npm cache clean --force

echo -e "${GREEN}✅ 캐시 정리 완료${NC}"

# 3. 의존성 재설치
echo -e "\n${YELLOW}3. 의존성 설치 중...${NC}"
npm install

echo -e "${GREEN}✅ 설치 완료${NC}"

# 4. TypeScript 버전 확인
echo -e "\n${YELLOW}4. TypeScript 버전 확인...${NC}"
npx tsc --version

# 5. 빌드 시도
echo -e "\n${YELLOW}5. 빌드 테스트...${NC}"
npm run build

echo -e "\n${GREEN}🎉 완료!${NC}"
