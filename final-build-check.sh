#!/bin/bash

echo "AI FileSystem MCP - Final Build Check"
echo "====================================="
echo ""

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Try TypeScript compilation
echo "🔨 Compiling TypeScript..."
if npx tsc; then
    echo "✅ TypeScript compilation successful!"
    echo ""
    
    # Check key files
    echo "📁 Checking output files..."
    if [ -f "dist/index.js" ] && [ -f "dist/index-new.js" ] && [ -f "dist/core/ServiceContainer.js" ]; then
        echo "✅ All key files generated"
    else
        echo "❌ Some key files missing"
        ls -la dist/
        exit 1
    fi
    
    echo ""
    echo "🎉 Build successful! The migration is ready."
    echo ""
    echo "Next steps:"
    echo "1. Run tests: npm test"
    echo "2. Start server: npm start"
    echo "3. Run migration: ./scripts/migrate-final.sh"
else
    echo "❌ TypeScript compilation failed"
    echo ""
    echo "Run './check-errors.sh' to see detailed errors"
    exit 1
fi
