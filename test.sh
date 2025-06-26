#!/bin/bash

# AI FileSystem MCP 테스트 실행 스크립트
# 다양한 테스트를 선택하여 실행할 수 있습니다.

echo "🧪 AI FileSystem MCP 테스트 러너"
echo "================================"

cd "$(dirname "$0")"

# 테스트 메뉴 표시
echo ""
echo "테스트 옵션을 선택하세요:"
echo "1) 모든 테스트 실행 (test:all)"
echo "2) 쉘 실행 테스트 (test:shell)"
echo "3) Git 명령 테스트 (test:git)"
echo "4) 트랜잭션 테스트 (test:transaction)"
echo "5) 단위 테스트 (test:unit)"
echo "6) 통합 테스트 (test:integration)"
echo "7) 테스트 커버리지 (test:coverage)"
echo "8) Phase 1 검증 (validate:phase1)"
echo "9) 간단한 테스트 (test)"
echo "0) 종료"
echo ""

read -p "선택 [0-9]: " choice

case $choice in
    1)
        echo "🔄 모든 테스트 실행 중..."
        npm run test:all
        ;;
    2)
        echo "🔄 쉘 실행 테스트 중..."
        npm run test:shell
        ;;
    3)
        echo "🔄 Git 명령 테스트 중..."
        npm run test:git
        ;;
    4)
        echo "🔄 트랜잭션 테스트 중..."
        npm run test:transaction
        ;;
    5)
        echo "🔄 단위 테스트 중..."
        npm run test:unit
        ;;
    6)
        echo "🔄 통합 테스트 중..."
        npm run test:integration
        ;;
    7)
        echo "🔄 테스트 커버리지 분석 중..."
        npm run test:coverage
        ;;
    8)
        echo "🔄 Phase 1 검증 중..."
        npm run validate:phase1
        ;;
    9)
        echo "🔄 간단한 테스트 실행 중..."
        npm run test
        ;;
    0)
        echo "👋 종료합니다."
        exit 0
        ;;
    *)
        echo "❌ 잘못된 선택입니다."
        exit 1
        ;;
esac
