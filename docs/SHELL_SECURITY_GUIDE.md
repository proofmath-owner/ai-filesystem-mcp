# AI FileSystem MCP - 쉘 실행 보안 개선 가이드

## 🔐 보안 레벨 시스템

### 1. 보안 레벨 소개

AI FileSystem MCP v2.3.1부터 다단계 보안 레벨을 지원합니다:

#### **STRICT** (엄격) - 기본값
- 시스템 파괴 명령어 차단 (rm, format, shutdown 등)
- 권한 상승 명령어 차단 (sudo, su 등)
- 쉘 기능 비활성화
- 최대 명령어 길이: 1000자

#### **MODERATE** (보통) - 개발자 권장
- 개발 도구 허용 (npm, git, chmod 등)
- 시스템 파괴 명령어만 차단
- 쉘 기능 활성화
- 최대 명령어 길이: 5000자

#### **PERMISSIVE** (허용)
- 최소한의 제한 (shutdown, reboot만 차단)
- 대부분의 명령어 허용
- 쉘 기능 활성화
- 최대 명령어 길이: 10000자

### 2. 사용 예제

#### 기본 사용 (MODERATE 레벨)
```
Use execute_shell with:
- command: "npm"
- args: ["run", "build"]
- cwd: "/path/to/project"
```

#### 보안 레벨 지정
```
Use execute_shell with:
- command: "chmod"
- args: ["+x", "script.sh"]
- securityLevel: "moderate"
```

#### Node.js 도구 실행
```
Use execute_shell with:
- command: "npx"
- args: ["tsc", "--noEmit"]
- securityLevel: "moderate"
```

### 3. 자동 경로 탐지

시스템이 자동으로 다음 경로들을 탐색합니다:
- `./node_modules/.bin` (로컬 패키지)
- `~/.npm/bin` (npm 글로벌)
- `~/.yarn/bin` (Yarn 글로벌)
- `/usr/local/bin` (시스템 도구)
- `/opt/homebrew/bin` (macOS Homebrew)

### 4. 에러 처리 개선

#### 명령어를 찾을 수 없을 때
```json
{
  "success": false,
  "error": "Command not found: tsc",
  "hint": "Make sure the command is installed. Try: npm install -g typescript"
}
```

#### 보안 정책 위반
```json
{
  "success": false,
  "error": "Command 'rm' is blocked for security reasons",
  "hint": "This command is blocked by security policy. Try using a less restrictive security level (moderate or permissive) if you trust the command."
}
```

### 5. 고급 사용법

#### 쉘 기능 사용
```
Use execute_shell with:
- command: "ls"
- args: ["-la", "|", "grep", "node"]
- shell: true
- securityLevel: "moderate"
```

#### 환경 변수 설정
```
Use execute_shell with:
- command: "node"
- args: ["script.js"]
- env: {
    "NODE_ENV": "production",
    "API_KEY": "your-key"
  }
- securityLevel: "moderate"
```

#### 타임아웃 설정
```
Use execute_shell with:
- command: "npm"
- args: ["install"]
- timeout: 120000  // 2분
- securityLevel: "moderate"
```

## 🛠️ 문제 해결

### npm/npx를 찾을 수 없을 때

1. Node.js가 설치되어 있는지 확인
2. 프로젝트 디렉토리에서 실행 (`cwd` 옵션 사용)
3. `securityLevel: "moderate"` 사용

### 권한 오류

1. `securityLevel: "moderate"` 또는 `"permissive"` 사용
2. 파일/디렉토리 권한 확인
3. 필요시 `change_permissions` 명령 먼저 실행

### 쉘 기능이 필요한 경우

파이프(`|`), 리다이렉션(`>`), 와일드카드(`*`) 등을 사용하려면:
```
- shell: true
- securityLevel: "moderate"
```

## 🔒 보안 권장사항

1. **개발 환경**: `MODERATE` 레벨 사용
2. **프로덕션**: `STRICT` 레벨 유지
3. **신뢰할 수 없는 입력**: 항상 `STRICT` 사용
4. **임시 권한 상승**: 특정 작업에만 `PERMISSIVE` 사용

## 📝 마이그레이션 가이드

### 기존 코드 업데이트

이전:
```
Use execute_shell with:
- command: "npm"
- args: ["run", "build"]
```

이후:
```
Use execute_shell with:
- command: "npm"
- args: ["run", "build"]
- securityLevel: "moderate"
```

### ServiceContainer 업데이트

```typescript
// 기존 ShellExecutionService 대신 EnhancedShellExecutionService 사용
const shellService = new EnhancedShellExecutionService(SecurityLevel.MODERATE);
this.services.set('shellService', shellService);
```
