#!/bin/bash
cd /Users/Sangbinna/mcp/ai-filesystem-mcp

echo "🔨 Rebuilding after fix..."
echo "========================"
echo ""

# 빌드
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "🧪 Running validation test..."
    echo ""
    node validate-phase1.js
else
    echo "❌ Build failed!"
fi