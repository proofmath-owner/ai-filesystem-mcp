#!/bin/bash

echo "🔨 Testing build..."

cd "$(dirname "$0")/.." || exit 1

# Clean and build
rm -rf dist
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # List built files
    echo "\n📦 Built files:"
    find dist -name "*.js" | head -20
    
    # Check shell command
    if [ -f "dist/commands/implementations/security/ExecuteShellCommand.js" ]; then
        echo "\n✅ Shell execution command found!"
    fi
else
    echo "❌ Build failed!"
    exit 1
fi