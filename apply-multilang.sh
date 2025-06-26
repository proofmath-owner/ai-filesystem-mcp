#!/bin/bash
# 다중 언어 지원 ASTProcessor 적용 스크립트

echo "🔧 Applying multi-language ASTProcessor..."

# 1. 기존 파일 백업
if [ -f "src/core/ASTProcessor.ts" ]; then
    cp src/core/ASTProcessor.ts src/core/ASTProcessor.ts.backup
    echo "✅ Backed up original ASTProcessor.ts"
fi

# 2. 새 파일 적용
if [ -f "src/core/ASTProcessor-multilang.ts" ]; then
    mv src/core/ASTProcessor-multilang.ts src/core/ASTProcessor.ts
    echo "✅ Applied multi-language ASTProcessor"
else
    echo "❌ ASTProcessor-multilang.ts not found!"
    exit 1
fi

# 3. 빌드
echo ""
echo "🔨 Building with multi-language support..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful with multi-language support!"
else
    echo ""
    echo "❌ Build failed. Rolling back..."
    mv src/core/ASTProcessor.ts.backup src/core/ASTProcessor.ts
    exit 1
fi
