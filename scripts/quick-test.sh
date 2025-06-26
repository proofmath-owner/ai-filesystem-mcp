#!/bin/bash

echo "🔨 Quick build and test..."

cd "$(dirname "$0")/../.." || exit 1

# Build
echo "Building..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Test command loading
    echo ""
    echo "🧪 Testing command loading..."
    node scripts/debug/check-commands.js
else
    echo "❌ Build failed!"
    exit 1
fi
