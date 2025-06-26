#!/bin/bash
cd /Users/sangbinna/mcp/ai-filesystem-mcp
echo "🔨 Building project..."
echo "====================="
npm run build
echo ""
echo "Build complete. Checking for errors..."
echo ""
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"
