#!/bin/bash

# AI FileSystem MCP 올인원 실행기
# 메뉴 기반 인터페이스로 모든 작업을 수행할 수 있습니다.

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

cd "$(dirname "$0")"

clear

while true; do
    echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${PURPLE}🚀 AI FileSystem MCP Control Panel${NC}  ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}[실행 옵션]${NC}"
    echo "  1) 🚀 MCP 서버 실행 (빌드 포함)"
    echo "  2) ⚡ 빠른 실행 (빌드 스킵)"
    echo "  3) 🔧 개발 모드 (파일 감시)"
    echo ""
    echo -e "${YELLOW}[테스트 옵션]${NC}"
    echo "  4) 🧪 테스트 메뉴"
    echo "  5) 🔍 모든 테스트 실행"
    echo "  6) 🐚 쉘 실행 테스트"
    echo ""
    echo -e "${BLUE}[관리 옵션]${NC}"
    echo "  7) 📦 의존성 재설치"
    echo "  8) 🔨 클린 빌드"
    echo "  9) 🔐 실행 권한 설정"
    echo " 10) 📋 프로젝트 정보"
    echo " 11) 🎯 초기 설정 실행"
    echo ""
    echo -e "${RED}  0) 종료${NC}"
    echo ""
    read -p "선택 [0-11]: " choice

    case $choice in
        1)
            echo -e "\n${GREEN}🚀 MCP 서버를 시작합니다...${NC}\n"
            ./run.sh
            ;;
        2)
            echo -e "\n${GREEN}⚡ 빠른 실행...${NC}\n"
            ./quick-start.sh
            ;;
        3)
            echo -e "\n${GREEN}🔧 개발 모드 시작...${NC}\n"
            ./dev.sh
            ;;
        4)
            echo -e "\n${YELLOW}🧪 테스트 메뉴로 이동...${NC}\n"
            ./test.sh
            ;;
        5)
            echo -e "\n${YELLOW}🔍 모든 테스트 실행...${NC}\n"
            npm run test:all
            ;;
        6)
            echo -e "\n${YELLOW}🐚 쉘 실행 테스트...${NC}\n"
            npm run test:shell
            ;;
        7)
            echo -e "\n${BLUE}📦 의존성 재설치...${NC}\n"
            rm -rf node_modules package-lock.json
            npm install
            echo -e "\n${GREEN}✅ 완료!${NC}"
            ;;
        8)
            echo -e "\n${BLUE}🔨 클린 빌드...${NC}\n"
            npm run clean
            npm run build
            echo -e "\n${GREEN}✅ 완료!${NC}"
            ;;
        9)
            echo -e "\n${BLUE}🔐 실행 권한 설정...${NC}\n"
            chmod +x make-executable.sh
            ./make-executable.sh
            ;;
        10)
            echo -e "\n${CYAN}📋 프로젝트 정보${NC}"
            echo "================================"
            echo -e "프로젝트: ${PURPLE}AI FileSystem MCP${NC}"
            echo -e "버전: ${GREEN}$(node -p "require('./package.json').version")${NC}"
            echo -e "설명: $(node -p "require('./package.json').description")"
            echo ""
            echo "주요 기능:"
            echo "  • 보안 쉘 실행 (3단계 보안 레벨)"
            echo "  • 고급 파일 시스템 조작"
            echo "  • 9개 언어 코드 분석"
            echo "  • Git 통합"
            echo "  • 파일 암호화"
            echo ""
            ;;
        11)
            echo -e "\n${BLUE}🎯 초기 설정 실행...${NC}\n"
            chmod +x setup.sh
            ./setup.sh
            ;;
        0)
            echo -e "\n${GREEN}👋 안녕히 가세요!${NC}\n"
            exit 0
            ;;
        *)
            echo -e "\n${RED}❌ 잘못된 선택입니다.${NC}"
            ;;
    esac

    echo ""
    read -p "계속하려면 Enter를 누르세요..."
    clear
done
