#!/bin/bash
cd /Users/Sangbinna/mcp/ai-filesystem-mcp

echo "🔨 Quick Build Test"
echo "=================="
echo ""

# node_modules 확인
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies first..."
    npm install
    echo ""
fi

# 빌드 시도
echo "🏗️ Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📊 Checking dist folder:"
    ls -la dist/core/commands/ | head -20
else
    echo ""
    echo "❌ Build failed!"
fi