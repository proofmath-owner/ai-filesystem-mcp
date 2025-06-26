#!/bin/bash

# Quick validation script
echo "AI FileSystem MCP - Quick Validation"
echo "===================================="

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

# Check if TypeScript is installed
if [ ! -f "node_modules/.bin/tsc" ]; then
    echo "❌ TypeScript not found. Running npm install..."
    npm install
fi

# Check main files exist
echo ""
echo "Checking source files..."
FILES=(
    "src/index.ts"
    "src/index-new.ts"
    "src/core/ServiceContainer.ts"
    "src/server/MCPServer.ts"
    "src/commands/base/BaseCommand.ts"
    "src/commands/registry/CommandRegistry.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file is missing"
    fi
done

echo ""
echo "Creating missing directories..."
mkdir -p src/core/interfaces
mkdir -p src/core/services/{file,directory,search,git,code,security}
mkdir -p src/core/managers
mkdir -p src/commands/{base,registry,implementations/{file,directory,search,git,code,security}}

echo ""
echo "Quick validation complete!"
echo ""
echo "To complete the migration:"
echo "1. Run: npm install"
echo "2. Run: npm run build"
echo "3. Run: ./scripts/test-migration.sh"
