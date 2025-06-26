#!/bin/bash

# 모든 쉘 스크립트에 실행 권한 부여

echo "🔐 실행 권한 설정"
echo "================"

cd "$(dirname "$0")"

echo "📋 실행 권한을 부여할 파일들:"
echo ""

# 현재 디렉토리의 모든 .sh 파일에 실행 권한 부여
for file in *.sh scripts/*.sh scripts/*/*.sh; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
        chmod +x "$file"
    fi
done

echo ""
echo "✨ 모든 쉘 스크립트에 실행 권한을 부여했습니다!"
echo ""
echo "이제 다음 명령들을 사용할 수 있습니다:"
echo "   ./run.sh         - 프로젝트 빌드 및 실행"
echo "   ./dev.sh         - 개발 모드 실행"
echo "   ./quick-start.sh - 빠른 시작"
echo "   ./test.sh        - 테스트 실행"
echo "   ./setup.sh       - 초기 설정"
