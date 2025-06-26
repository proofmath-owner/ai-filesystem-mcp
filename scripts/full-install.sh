#!/bin/bash

echo "🔧 Installing dependencies and building..."

cd "$(dirname "$0")/.." || exit 1

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Clean build directory
echo "🧹 Cleaning build directory..."
rm -rf dist

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Check if shell command was built
    if [ -f "dist/commands/implementations/security/ExecuteShellCommand.js" ]; then
        echo "✅ Shell execution command built successfully!"
        
        # Run a quick test
        echo ""
        echo "🧪 Running quick test..."
        node -e "
        const { ExecuteShellCommand } = require('./dist/commands/implementations/security/ExecuteShellCommand.js');
        const cmd = new ExecuteShellCommand();
        console.log('✓ Command loaded successfully');
        console.log('  Name:', cmd.name);
        console.log('  Description:', cmd.description);
        "
    else
        echo "⚠️  Shell execution command not found in build output"
    fi
else
    echo "❌ Build failed!"
    exit 1
fi
