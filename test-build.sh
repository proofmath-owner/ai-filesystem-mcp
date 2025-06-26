#!/bin/bash

# Simple build test script
set -e

echo "Testing TypeScript build..."

# Clean previous build
rm -rf dist

# Run TypeScript compiler
npx tsc

if [ -d "dist" ]; then
    echo "✓ Build successful"
    
    # Check if key files exist
    if [ -f "dist/index.js" ] && [ -f "dist/index-new.js" ]; then
        echo "✓ Main files compiled"
    else
        echo "✗ Main files missing"
        exit 1
    fi
else
    echo "✗ Build failed - no dist directory"
    exit 1
fi

echo "Build test completed successfully!"
