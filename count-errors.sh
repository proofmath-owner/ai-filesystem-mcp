#!/bin/bash
cd /Users/sangbinna/mcp/ai-filesystem-mcp
npm run build 2>&1 | grep "error TS" | wc -l
