#!/bin/bash

# AI FileSystem MCP 빠른 시작 스크립트
# 빌드 없이 바로 실행 (이미 빌드된 경우)

echo "⚡ AI FileSystem MCP 빠른 시작"
echo "=============================="

cd "$(dirname "$0")"

# dist 폴더 확인
if [ ! -d "dist" ]; then
    echo "❌ 빌드된 파일이 없습니다!"
    echo "   먼저 ./run.sh 를 실행하거나 npm run build 를 실행해주세요."
    exit 1
fi

# 바로 실행
echo "🚀 서버 시작..."
node dist/index.js
