#!/bin/bash

echo "🔨 Building AI FileSystem MCP..."

cd "$(dirname "$0")/.." || exit 1

# Clean build directory
echo "🧹 Cleaning build directory..."
rm -rf dist

# Build TypeScript
echo "📦 Building TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Check if shell command was built
    if [ -f "dist/commands/implementations/security/ExecuteShellCommand.js" ]; then
        echo "✅ Shell execution command built successfully!"
    else
        echo "⚠️  Shell execution command not found in build output"
    fi
else
    echo "❌ Build failed!"
    exit 1
fi
