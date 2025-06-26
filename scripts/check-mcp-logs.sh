#!/bin/bash

echo "📋 Checking Claude MCP logs..."
echo ""

LOG_DIR="$HOME/Library/Logs/Claude"

# Check if log directory exists
if [ ! -d "$LOG_DIR" ]; then
    echo "❌ Claude log directory not found: $LOG_DIR"
    exit 1
fi

# Find ai-filesystem log
AI_FS_LOG=$(ls -t "$LOG_DIR"/mcp-ai-filesystem*.log 2>/dev/null | head -1)

if [ -z "$AI_FS_LOG" ]; then
    echo "❌ No ai-filesystem MCP logs found"
    echo ""
    echo "Available logs:"
    ls -la "$LOG_DIR"/mcp-*.log 2>/dev/null || echo "No MCP logs found"
else
    echo "✅ Found log: $AI_FS_LOG"
    echo ""
    echo "=== Last 50 lines ==="
    tail -50 "$AI_FS_LOG"
    echo ""
    echo "=== Errors (if any) ==="
    grep -i "error" "$AI_FS_LOG" | tail -20
    echo ""
    echo "=== Command loading ==="
    grep -E "(Loading commands|execute_shell|Loaded.*commands)" "$AI_FS_LOG" | tail -20
fi
