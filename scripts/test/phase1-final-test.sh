#!/bin/bash
cd /Users/Sangbinna/mcp/ai-filesystem-mcp

echo "🎉 Phase 1 Final Build & Test"
echo "============================"
echo ""

# 1. Clean build
echo "1️⃣ Clean build..."
npm run clean
npm run build

echo ""
echo "2️⃣ Running all 39 commands test..."
node test-all-39.js

echo ""
echo "3️⃣ Testing transaction edge cases..."
node test-transaction-issues.js

echo ""
echo "4️⃣ Done! Phase 1 is complete! 🎉"