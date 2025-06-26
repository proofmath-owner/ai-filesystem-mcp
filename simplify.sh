#!/bin/bash
# 핵심 명령어만 남기고 나머지는 임시로 제거

cd /Users/sangbinna/mcp/ai-filesystem-mcp

# 백업 폴더 생성
mkdir -p backup/commands

# 에러가 많은 명령어들을 백업
echo "백업 중..."
mv src/commands/implementations/code backup/commands/ 2>/dev/null
mv src/commands/implementations/batch backup/commands/ 2>/dev/null
mv src/commands/implementations/monitoring backup/commands/ 2>/dev/null
mv src/commands/implementations/utils backup/commands/ 2>/dev/null

echo "핵심 명령어만 남김:"
echo "- file (파일 읽기/쓰기)"
echo "- directory (디렉토리 관리)"
echo "- search (검색)"
echo "- git (Git 명령어)"
echo "- security (보안 스캔)"

echo ""
echo "다시 빌드..."
npm run build
