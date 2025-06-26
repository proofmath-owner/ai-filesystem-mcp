#!/bin/bash

# Shell Execution Command 설치 및 빌드 스크립트

echo "🚀 Installing Shell Execution Command..."

# 프로젝트 루트로 이동
cd "$(dirname "$0")/.." || exit 1

# 1. 의존성 설치
echo "📦 Installing dependencies..."
npm install

# 2. TypeScript 빌드
echo "🔨 Building project..."
npm run build

# 3. 빌드 결과 확인
if [ -f "dist/commands/implementations/security/ExecuteShellCommand.js" ]; then
    echo "✅ Shell execution command built successfully!"
else
    echo "❌ Build failed - ExecuteShellCommand.js not found"
    exit 1
fi

# 4. 간단한 검증
echo "🧪 Running quick validation..."
node -e "
const { ExecuteShellCommand } = require('./dist/commands/implementations/security/ExecuteShellCommand.js');
const cmd = new ExecuteShellCommand();
console.log('Command name:', cmd.name);
console.log('Command description:', cmd.description);
"

echo "✨ Installation complete!"
echo ""
echo "To test the command, run:"
echo "  npm run test:shell"
echo ""
echo "Or for integration tests:"
echo "  ./tests/integration/test-shell-execution.js"
