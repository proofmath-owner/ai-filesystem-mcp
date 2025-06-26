# AI FileSystem MCP - 빌드 및 실행 가이드

## 🚀 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. TypeScript 빌드

#### 방법 1: npm 스크립트 사용
```bash
npm run build
```

#### 방법 2: npx 사용
```bash
npx tsc
```

#### 방법 3: 전역 TypeScript 사용
```bash
tsc
```

#### 방법 4: 빌드 헬퍼 사용
```bash
node build-helper.js
```

### 3. 실행
```bash
node dist/index.js
```

## 🛠️ 문제 해결

### TypeScript를 찾을 수 없을 때

1. **로컬 설치 확인**
   ```bash
   ls node_modules/.bin/tsc
   ```

2. **전역 설치**
   ```bash
   npm install -g typescript
   ```

3. **npx 사용**
   ```bash
   npx tsc --version
   ```

### 빌드 오류 발생 시

1. **TypeScript 설정 확인**
   ```bash
   npx tsc --showConfig
   ```

2. **파일 목록 확인**
   ```bash
   npx tsc --listFiles
   ```

3. **상세 오류 확인**
   ```bash
   npx tsc --verbose
   ```

## 📝 수동 빌드 (쉘 접근 없이)

### 1. VS Code 사용
1. VS Code에서 프로젝트 열기
2. `Ctrl+Shift+B` (또는 `Cmd+Shift+B`)로 빌드 작업 실행
3. "tsc: build" 선택

### 2. Node.js 스크립트로 빌드

`manual-build.js` 파일 생성:
```javascript
const { spawn } = require('child_process');
const path = require('path');

const tscPath = path.join('node_modules', '.bin', 'tsc');
const tsc = spawn(tscPath, [], { stdio: 'inherit' });

tsc.on('close', (code) => {
  if (code === 0) {
    console.log('Build successful!');
  } else {
    console.log('Build failed with code:', code);
  }
});
```

실행:
```bash
node manual-build.js
```

### 3. package.json 스크립트 사용

이미 정의된 스크립트들:
- `npm run build` - 기본 빌드
- `npm run build:watch` - 파일 변경 감지 빌드
- `npm run clean` - 빌드 디렉토리 정리

## 🔧 Claude Desktop 설정

### 1. 설정 파일 위치

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 2. 설정 예제

```json
{
  "mcpServers": {
    "ai-filesystem": {
      "command": "node",
      "args": ["/Users/sangbinna/mcp/ai-filesystem-mcp/dist/index.js"]
    }
  }
}
```

### 3. 환경 변수 설정 (선택사항)

```json
{
  "mcpServers": {
    "ai-filesystem": {
      "command": "node",
      "args": ["/path/to/ai-filesystem-mcp/dist/index.js"],
      "env": {
        "SECURITY_LEVEL": "moderate",
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 📊 빌드 검증

### 1. 빌드 결과 확인
```bash
ls -la dist/
```

예상 결과:
```
dist/
├── commands/
├── core/
├── index.js
├── index.d.ts
└── ...
```

### 2. 기본 실행 테스트
```bash
node dist/index.js
```

정상 실행 시 다음과 같은 메시지가 표시됩니다:
```
AI FileSystem MCP Server v2.0 started
Total commands: 39
Available commands:
  - read_file
  - write_file
  - ...
```

## 🐛 디버깅

### 환경 변수로 디버깅
```bash
DEBUG=* node dist/index.js
```

### TypeScript 소스맵 활용
```bash
node --enable-source-maps dist/index.js
```

### 로그 레벨 설정
```bash
LOG_LEVEL=debug node dist/index.js
```

## 💡 팁

1. **빌드 시간 단축**: `tsc --incremental` 사용
2. **타입 체크만**: `tsc --noEmit`로 컴파일 없이 타입 검사
3. **특정 파일만 빌드**: `tsc src/index.ts --outDir dist`

## 🔄 지속적인 개발

### Watch 모드
```bash
npm run build:watch
```

### 개발 서버
```bash
npm run dev
```

이렇게 하면 파일 변경 시 자동으로 재시작됩니다.
