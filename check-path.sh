#!/bin/bash
echo "🔍 Checking path case sensitivity..."
echo ""

echo "Current directory:"
pwd

echo ""
echo "Checking both paths:"
ls -la /Users/Sangbinna/mcp/ai-filesystem-mcp/ 2>&1 | head -5
echo "---"
ls -la /Users/sangbinna/mcp/ai-filesystem-mcp/ 2>&1 | head -5

echo ""
echo "Testing Node.js import with both paths:"
echo ""

# 대문자 경로로 테스트
echo "1. Testing with capital S (Sangbinna):"
node -e "import('./dist/core/commands/index.js').then(m => console.log('✅ Import successful')).catch(e => console.log('❌ Error:', e.message))"

echo ""
echo "2. Running debug script:"
node debug-registry.js