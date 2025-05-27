#!/bin/bash
cd /Users/Sangbinna/mcp/ai-filesystem-mcp

echo "🚀 Direct Build Error Check"
echo "=========================="
echo ""

# npm install 먼저 확인
echo "1️⃣ Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules not found! Running npm install..."
    npm install
else
    echo "✅ node_modules exists"
fi

echo ""
echo "2️⃣ Running TypeScript compiler..."
echo "-----------------------------------"
npx tsc 2>&1 | head -50

echo ""
echo "3️⃣ If no errors above, checking dist folder..."
ls -la dist/ 2>/dev/null || echo "❌ dist folder not found"