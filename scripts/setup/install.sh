#!/bin/bash

# AI FileSystem MCP 설치 스크립트

echo "🚀 AI FileSystem MCP 설치 시작..."

# 의존성 설치
echo "📦 의존성 설치중..."
npm install

# TypeScript 빌드
echo "🔨 프로젝트 빌드중..."
npm run build

# Claude 설정 파일 경로
CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

# 현재 디렉토리 경로
CURRENT_DIR=$(pwd)

echo ""
echo "✅ 빌드 완료!"
echo ""
echo "📝 Claude Desktop 설정에 추가하세요:"
echo ""
echo "1. 설정 파일 열기:"
echo "   open \"$CLAUDE_CONFIG\""
echo ""
echo "2. mcpServers 섹션에 다음 내용 추가:"
echo ""
cat << EOF
{
  "mcpServers": {
    "ai-filesystem": {
      "command": "node",
      "args": ["$CURRENT_DIR/dist/index.js"]
    }
  }
}
EOF
echo ""
echo "3. Claude Desktop 재시작"
echo ""
echo "🎉 설치 완료!"
