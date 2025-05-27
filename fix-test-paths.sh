#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 테스트 파일 경로 수정 시작!${NC}"

# tests/integration 디렉토리로 이동
cd tests/integration

# 모든 .js 파일의 import 경로 수정
echo -e "\n${YELLOW}📝 import 경로 수정 중...${NC}"

# macOS와 Linux 모두에서 작동하도록 sed 명령 조정
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|'./dist/|'../../dist/|g" *.js
    sed -i '' 's|"./dist/|"../../dist/|g' *.js
    sed -i '' "s|'../dist/|'../../dist/|g" *.js
    sed -i '' 's|"../dist/|"../../dist/|g' *.js
    sed -i '' "s|from './src/|from '../../src/|g" *.js
    sed -i '' 's|from "../src/|from "../../src/|g' *.js
else
    # Linux
    sed -i "s|'./dist/|'../../dist/|g" *.js
    sed -i 's|"./dist/|"../../dist/|g' *.js
    sed -i "s|'../dist/|'../../dist/|g" *.js
    sed -i 's|"../dist/|"../../dist/|g' *.js
    sed -i "s|from './src/|from '../../src/|g" *.js
    sed -i 's|from "../src/|from "../../src/|g' *.js
fi

echo -e "${GREEN}✅ import 경로 수정 완료!${NC}"

# 수정된 파일 확인
echo -e "\n${YELLOW}📋 수정된 파일들:${NC}"
grep -l "../../dist" *.js 2>/dev/null || echo "경로가 수정된 파일 없음"

echo -e "\n${GREEN}🎉 경로 수정 작업 완료!${NC}"
