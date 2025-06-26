#!/bin/bash

# AI FileSystem MCP 개발 모드 실행 스크립트
# 변경사항을 실시간으로 감지하여 자동으로 재시작합니다.

echo "🔧 AI FileSystem MCP 개발 모드"
echo "============================="

cd "$(dirname "$0")"

# tsx 설치 확인
if ! npm list tsx &> /dev/null; then
    echo "📦 tsx 설치 중..."
    npm install --save-dev tsx
fi

echo "👀 파일 변경 감지 모드로 실행합니다..."
echo "   (Ctrl+C로 종료)"
echo ""

# 개발 모드 실행
npm run dev
