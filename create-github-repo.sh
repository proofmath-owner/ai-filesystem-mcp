#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 설정
REPO_NAME="ai-filesystem-mcp"
GITHUB_USER="proofmath-owner"  # 너의 GitHub 사용자명으로 변경
DESCRIPTION="AI-optimized Model Context Protocol (MCP) server for intelligent file system operations"

echo -e "${BLUE}🚀 AI FileSystem MCP GitHub 레포지토리 생성${NC}"
echo "========================================"
echo ""

# 현재 디렉토리 확인
cd /Users/Sangbinna/mcp/ai-filesystem-mcp

# Git 초기화 확인
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}→ Git 초기화 중...${NC}"
    git init
    echo -e "${GREEN}✓ Git 초기화 완료${NC}"
else
    echo -e "${GREEN}✓ Git 이미 초기화됨${NC}"
fi

# 현재 상태 확인
echo ""
echo -e "${BLUE}📊 현재 Git 상태:${NC}"
git status

# 모든 파일 추가
echo ""
echo -e "${YELLOW}→ 파일 추가 중...${NC}"
git add .
echo -e "${GREEN}✓ 파일 추가 완료${NC}"

# 커밋
echo ""
echo -e "${YELLOW}→ 초기 커밋 생성 중...${NC}"
git commit -m "Initial commit: AI FileSystem MCP v2.0

- Smart caching with LRU cache
- Advanced diff & comparison tools
- Compression & archive management
- Enhanced search capabilities
- Code quality & refactoring features
- Security features with encryption
- Batch operations support
- Cloud storage integration
- Monitoring & analytics
- Enhanced error handling"

echo -e "${GREEN}✓ 커밋 완료${NC}"

# GitHub CLI 확인
echo ""
if command -v gh &> /dev/null; then
    echo -e "${GREEN}✓ GitHub CLI 발견${NC}"
    echo ""
    echo -e "${BLUE}GitHub 레포지토리를 자동으로 생성하시겠습니까? (y/n)${NC}"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        # GitHub repo 생성
        echo -e "${YELLOW}→ GitHub 레포지토리 생성 중...${NC}"
        
        if gh repo create "$GITHUB_USER/$REPO_NAME" \
            --public \
            --description "$DESCRIPTION" \
            --source=. \
            --remote=origin \
            --push; then
            
            echo -e "${GREEN}✅ 레포지토리 생성 및 Push 완료!${NC}"
            echo ""
            echo -e "${BLUE}🎉 GitHub URL: https://github.com/$GITHUB_USER/$REPO_NAME${NC}"
            
            # GitHub에서 열기
            echo ""
            echo -e "${BLUE}브라우저에서 열시겠습니까? (y/n)${NC}"
            read -r open_response
            if [[ "$open_response" =~ ^[Yy]$ ]]; then
                open "https://github.com/$GITHUB_USER/$REPO_NAME"
            fi
        else
            echo -e "${RED}❌ 레포지토리 생성 실패${NC}"
        fi
    else
        echo ""
        echo -e "${YELLOW}수동으로 생성하기:${NC}"
        echo "1. GitHub에서 새 레포지토리 생성: https://github.com/new"
        echo "2. 이름: $REPO_NAME"
        echo "3. 설명: $DESCRIPTION"
        echo "4. Public 선택"
        echo "5. README 추가하지 않기 (이미 있음)"
        echo ""
        echo -e "${YELLOW}그 다음 이 명령어들 실행:${NC}"
        echo "git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git"
        echo "git branch -M main"
        echo "git push -u origin main"
    fi
else
    echo -e "${YELLOW}⚠️  GitHub CLI가 없습니다${NC}"
    echo ""
    echo -e "${YELLOW}수동으로 생성하기:${NC}"
    echo "1. GitHub에서 새 레포지토리 생성: https://github.com/new"
    echo "2. 이름: $REPO_NAME"
    echo "3. 설명: $DESCRIPTION"
    echo "4. Public 선택"
    echo "5. README 추가하지 않기 (이미 있음)"
    echo ""
    echo -e "${YELLOW}그 다음 이 명령어들 실행:${NC}"
    echo -e "${BLUE}git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git${NC}"
    echo -e "${BLUE}git branch -M main${NC}"
    echo -e "${BLUE}git push -u origin main${NC}"
fi

# 추가 작업 제안
echo ""
echo -e "${GREEN}📝 다음 단계 추천:${NC}"
echo "1. GitHub Actions 설정 (.github/workflows/)"
echo "2. npm 패키지 배포 준비"
echo "3. 라이센스 파일 추가 (LICENSE)"
echo "4. Contributing 가이드라인 작성"
echo "5. 이슈 템플릿 추가"
