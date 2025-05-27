#!/bin/bash
cd /Users/Sangbinna/mcp/ai-filesystem-mcp

echo "🔧 Clean Install Script"
echo "====================="
echo ""

# 1. 기존 파일 정리
echo "1️⃣ Cleaning old files..."
rm -rf node_modules
rm -rf dist
rm -f package-lock.json

# 2. 캐시 정리
echo ""
echo "2️⃣ Clearing npm cache..."
npm cache clean --force

# 3. 새로 설치
echo ""
echo "3️⃣ Fresh install..."
npm install

# 4. 빌드
echo ""
echo "4️⃣ Building..."
npm run build

echo ""
echo "✅ Done! Now you can run: ./validate-phase1.js"