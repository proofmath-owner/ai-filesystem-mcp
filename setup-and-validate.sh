#!/bin/bash
cd /Users/Sangbinna/mcp/ai-filesystem-mcp

echo "🚀 Phase 1 Setup & Validation"
echo "============================"
echo ""

# 1. Dependencies 설치
echo "1️⃣ Installing dependencies..."
echo "----------------------------"
npm install

echo ""
echo "2️⃣ Building project..."
echo "----------------------"
npm run build

echo ""
echo "3️⃣ Running validation..."
echo "------------------------"
node validate-phase1.js