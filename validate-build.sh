#!/bin/bash

echo "AI FileSystem MCP - Build Validation"
echo "===================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Running npm install..."
    npm install
fi

# Try to build
echo "🔨 Building TypeScript..."
if npx tsc --noEmit; then
    echo "✅ TypeScript compilation successful (no emit)"
else
    echo "❌ TypeScript compilation failed"
    echo ""
    echo "Common issues to check:"
    echo "1. Missing imports"
    echo "2. Type mismatches"
    echo "3. Circular dependencies"
    exit 1
fi

echo ""
echo "✅ Build validation passed!"
echo ""
echo "Next steps:"
echo "1. Run: npm run build"
echo "2. Test: npm test"
echo "3. Start: npm start"
