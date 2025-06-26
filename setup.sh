#!/bin/bash

# AI FileSystem MCP 초기 설정 스크립트

echo "🎯 AI FileSystem MCP 초기 설정"
echo "=============================="
echo ""

cd "$(dirname "$0")"

# 1. Node.js 버전 확인
echo "1️⃣ 시스템 확인..."
node_version=$(node -v 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "   ✅ Node.js: $node_version"
else
    echo "   ❌ Node.js가 설치되어 있지 않습니다!"
    echo "      https://nodejs.org 에서 설치해주세요."
    exit 1
fi

npm_version=$(npm -v 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "   ✅ npm: v$npm_version"
else
    echo "   ❌ npm이 설치되어 있지 않습니다!"
    exit 1
fi

# 2. 실행 권한 설정
echo ""
echo "2️⃣ 실행 권한 설정..."
chmod +x make-executable.sh
./make-executable.sh

# 3. 의존성 설치
echo ""
echo "3️⃣ 의존성 설치..."
npm install

# 4. TypeScript 빌드
echo ""
echo "4️⃣ TypeScript 빌드..."
npm run build

# 5. Claude Desktop 설정 안내
echo ""
echo "5️⃣ Claude Desktop 설정"
echo "======================="
echo ""
echo "Claude Desktop의 설정 파일에 다음 내용을 추가하세요:"
echo ""
echo "📄 ~/Library/Application Support/Claude/claude_desktop_config.json"
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
echo "또는 이미 다른 MCP 서버가 있다면:"
echo ""
echo '    "ai-filesystem": {'
echo '      "command": "node",'
echo '      "args": ["'$(pwd)'/dist/index.js"]'
echo '    }'
echo ""
echo "✨ 설정 완료!"
echo ""
echo "사용 가능한 명령:"
echo "   ./run.sh    - MCP 서버 실행"
echo "   ./dev.sh    - 개발 모드"
echo "   ./test.sh   - 테스트 실행"
