#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd /Users/Sangbinna/mcp/ai-filesystem-mcp

echo -e "${BLUE}🚀 Git 초기화 및 PR 준비${NC}"
echo "========================"

# 1. Git 초기화
echo -e "\n${YELLOW}Step 1: Git 초기화${NC}"
git init
echo -e "${GREEN}✓ Git 초기화 완료${NC}"

# 2. 사용자 정보 설정 (필요한 경우)
git config user.name "Sangbinna"
git config user.email "your-email@example.com"  # 이메일 수정 필요

# 3. 백업에서 원본 파일들 복원 (초기 상태)
echo -e "\n${YELLOW}Step 2: 초기 상태 복원${NC}"
BACKUP_DIR=$(ls -d ../ai-filesystem-mcp-backup-* | head -1)

if [ -d "$BACKUP_DIR" ]; then
    # 현재 파일들을 임시로 저장
    mkdir -p ../temp-current
    cp -r . ../temp-current/
    
    # 백업에서 복원 (git 제외)
    rm -rf ./*
    cp -r "$BACKUP_DIR"/* .
    rm -rf organize-project.sh cleanup-final.sh fix-test-paths.sh update-package-json.js
    
    echo -e "${GREEN}✓ 초기 상태 복원 완료${NC}"
else
    echo -e "${RED}❌ 백업 폴더를 찾을 수 없습니다${NC}"
    exit 1
fi

# 4. 초기 커밋
echo -e "\n${YELLOW}Step 3: 초기 커밋 생성${NC}"
git add .
git commit -m "Initial commit: AI FileSystem MCP v2.0 (before refactoring)

- Base implementation with 39 core commands
- TypeScript-based MCP server
- File system operations
- Git integration
- Code analysis features
- Security and compression tools"

echo -e "${GREEN}✓ 초기 커밋 완료${NC}"

# 5. refactoring 브랜치 생성
echo -e "\n${YELLOW}Step 4: refactoring 브랜치 생성${NC}"
git checkout -b refactoring
echo -e "${GREEN}✓ refactoring 브랜치 생성 완료${NC}"

# 6. 리팩토링된 파일들 복원
echo -e "\n${YELLOW}Step 5: 리팩토링 변경사항 적용${NC}"
rm -rf ./*
cp -r ../temp-current/* .
rm -rf ../temp-current

# .gitignore 생성
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
package-lock.json

# Build output
dist/
build/
*.tsbuildinfo

# Test files
test-*.txt
*.test.txt
test-output/
test-extract/
*.enc

# Archives
*.zip
*.tar
*.tar.gz

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment
.env
.env.local
.env.*.local

# Coverage
coverage/
.nyc_output/

# Temporary files
tmp/
temp/
*.tmp
*.temp

# Backup files
*.backup
*.bak
backup-*/
*-backup-*/
EOF

echo -e "${GREEN}✓ 리팩토링 파일 복원 완료${NC}"

# 7. 리팩토링 커밋
echo -e "\n${YELLOW}Step 6: 리팩토링 커밋 생성${NC}"
git add .
git commit -m "refactor: major project restructuring and improvements

BREAKING CHANGES:
- Reorganized project structure for better maintainability
- Moved scripts to categorized folders (build/, test/, debug/, setup/)
- Consolidated test files in tests/integration/
- Moved documentation to docs/ with phases/ subfolder

Major changes:
- Replaced index.ts with refactored version
- Updated all import paths in test files
- Created organized directory structure
- Added comprehensive .gitignore
- Updated package.json scripts for new paths
- Legacy code moved to legacy/ folder

Improvements:
- Better separation of concerns
- Cleaner project root
- More intuitive file organization
- Easier navigation and maintenance"

echo -e "${GREEN}✓ 리팩토링 커밋 완료${NC}"

# 8. 현재 상태 표시
echo -e "\n${BLUE}📊 현재 Git 상태:${NC}"
git log --oneline -n 5
echo ""
git status

echo -e "\n${GREEN}✅ PR 준비 완료!${NC}"
echo -e "\n${YELLOW}다음 단계:${NC}"
echo "1. GitHub 레포지토리 생성:"
echo "   ${BLUE}./scripts/create-github-repo.sh${NC}"
echo ""
echo "2. 레포지토리 생성 후 PR 만들기:"
echo "   ${BLUE}git push origin main${NC}"
echo "   ${BLUE}git push origin refactoring${NC}"
echo "   ${BLUE}gh pr create --title \"Refactor: Major project restructuring\" --body \"See commit message for details\"${NC}"
echo ""
echo "또는 GitHub 웹에서 직접 PR 생성 가능"
