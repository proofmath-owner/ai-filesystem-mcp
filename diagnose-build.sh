#!/bin/bash
cd /Users/Sangbinna/mcp/ai-filesystem-mcp

echo "🔍 Checking TypeScript compilation errors..."
echo "========================================"
echo ""

# TypeScript 컴파일러 직접 실행
npx tsc --noEmit

echo ""
echo "📋 Checking for missing files..."
echo ""

# 필요한 파일들이 있는지 확인
echo "Checking core commands..."
ls -la src/core/commands/

echo ""
echo "Checking if all command files exist..."
for dir in file search git code transaction watcher archive system batch refactoring cloud security metadata; do
  if [ -d "src/core/commands/$dir" ]; then
    echo "✅ $dir/"
  else
    echo "❌ $dir/ - MISSING!"
  fi
done