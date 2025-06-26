#!/bin/bash

echo "🚀 Building and restarting MCP server..."

cd "$(dirname "$0")/.." || exit 1

# 1. Build
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# 2. Check if shell command exists
if [ -f "dist/commands/implementations/security/ExecuteShellCommand.js" ]; then
    echo "✅ Shell execution command found in dist!"
else
    echo "❌ Shell execution command NOT found in dist!"
    exit 1
fi

# 3. Show debug info
echo ""
echo "📋 Debug information:"
echo "  - Config file: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "  - Command path: /Users/sangbinna/mcp/ai-filesystem-mcp/dist/index.js"
echo ""
echo "🔄 Please restart Claude Desktop to reload the MCP server"
echo ""
echo "After restarting, you should see 'execute_shell' in the available commands."
echo ""
echo "If the command still doesn't appear, check the Claude logs at:"
echo "  ~/Library/Logs/Claude/mcp-*.log"
