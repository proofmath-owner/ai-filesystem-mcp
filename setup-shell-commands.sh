#!/bin/bash

# AI FileSystem MCP - 쉘 명령어 설정 및 테스트
# =============================================

echo "🚀 AI FileSystem MCP - Shell Commands Setup"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# 1. 빌드
echo "1️⃣ Building project..."
npm run build > build.log 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Check build.log for details."
    tail -20 build.log
    exit 1
fi

# 2. 명령어 확인
echo ""
echo "2️⃣ Checking shell commands..."
node -e "
import('./dist/core/ServiceContainer.js').then(async ({ ServiceContainer }) => {
  const container = new ServiceContainer();
  await container.initialize();
  const registry = container.getCommandRegistry();
  const shellCommands = registry.getAllCommands().filter(c => c.name.includes('shell'));
  
  console.log('Found shell commands:');
  shellCommands.forEach(cmd => {
    console.log('  ✅', cmd.name, '-', cmd.description);
  });
  
  if (shellCommands.length === 0) {
    console.log('  ❌ No shell commands found!');
    process.exit(1);
  }
  
  await container.cleanup();
}).catch(console.error);
"

# 3. 간단한 테스트
echo ""
echo "3️⃣ Running quick test..."
node test-shell-commands.js 2>/dev/null | grep -E "(✅|❌|Result:|npm version:|Git status:)"

echo ""
echo "4️⃣ Setup Instructions for Claude Desktop:"
echo "========================================="
echo ""
echo "Add to ~/Library/Application Support/Claude/claude_desktop_config.json:"
echo ""
echo '{'
echo '  "mcpServers": {'
echo '    "ai-filesystem": {'
echo '      "command": "node",'
echo '      "args": ["'$(pwd)'/dist/index.js"]'
echo '    }'
echo '  }'
echo '}'
echo ""
echo "5️⃣ Available Shell Commands:"
echo "============================"
echo ""
echo "📌 Quick shell execution:"
echo '   shell cmd="ls -la"'
echo '   shell cmd="git status"'
echo '   shell cmd="npm run test"'
echo ""
echo "📌 Full control execution:"
echo '   execute_shell command="npm" args=["install", "express"]'
echo '   execute_shell command="git" args=["log", "--oneline", "-5"]'
echo ""
echo "✨ Setup complete! Restart Claude Desktop to use the new commands."
