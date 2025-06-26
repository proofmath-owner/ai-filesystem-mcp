#!/bin/bash

# 쉘 명령어 테스트 스크립트

echo "🚀 AI FileSystem MCP - Shell Commands Test"
echo "========================================="
echo ""

cd "$(dirname "$0")"

# 빌드
echo "🔨 Building project..."
npm run build > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Running with errors..."
    npm run build
fi

echo "✅ Build complete"
echo ""

# 테스트 실행
echo "🧪 Running shell commands test..."
echo "================================="
node test-shell-commands.js

echo ""
echo "✨ Test complete!"
