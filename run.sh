#!/bin/bash

# AI FileSystem MCP 실행 스크립트
# 프로젝트를 빌드하고 실행합니다.

echo "🚀 AI FileSystem MCP 실행기"
echo "=========================="

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")"

# Node.js 설치 확인
if ! command -v node &> /dev/null; then
    echo "❌ Node.js가 설치되어 있지 않습니다!"
    echo "   https://nodejs.org 에서 Node.js를 설치해주세요."
    exit 1
fi

# npm 설치 확인
if ! command -v npm &> /dev/null; then
    echo "❌ npm이 설치되어 있지 않습니다!"
    exit 1
fi

echo "📋 Node.js 버전: $(node --version)"
echo "📋 npm 버전: $(npm --version)"
echo ""

# 의존성 설치 여부 확인
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install
    echo "✅ 의존성 설치 완료!"
    echo ""
fi

# TypeScript 빌드
echo "🔨 TypeScript 빌드 중..."
npm run build
echo "✅ 빌드 완료!"
echo ""

# MCP 서버 실행
echo "🚀 AI FileSystem MCP 서버 시작..."
echo "================================"
echo ""
node dist/index.js
