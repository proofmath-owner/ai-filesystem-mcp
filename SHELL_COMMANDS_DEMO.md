# 🚀 AI FileSystem MCP - Shell Commands Demo

이제 MCP에서 쉘 명령어를 실행할 수 있습니다!

## 사용 가능한 명령어

### 1. `execute_shell` - 전체 제어가 가능한 쉘 실행
```
예시:
- command: "echo"
- args: ["Hello from MCP!"]
- securityLevel: "moderate"
```

### 2. `shell` - 빠른 쉘 실행 (항상 permissive 모드)
```
예시:
- cmd: "ls -la"
- cwd: "."
```

## 실제 사용 예시

### 1️⃣ 간단한 명령어 실행
```
shell cmd="echo Hello World"
```

### 2️⃣ Git 상태 확인
```
shell cmd="git status --short"
```

### 3️⃣ npm 스크립트 실행
```
execute_shell command="npm" args=["run", "build"] securityLevel="moderate"
```

### 4️⃣ 디렉토리 내용 확인
```
shell cmd="ls -la | head -10"
```

### 5️⃣ 현재 프로세스 확인
```
shell cmd="ps aux | grep node | head -5"
```

## 보안 레벨

- **strict**: 매우 제한적 (시스템 명령어 차단)
- **moderate**: 개발 도구 허용 (기본값)
- **permissive**: 대부분 허용

## 💡 팁

1. 빠른 작업은 `shell` 명령어 사용
2. 세밀한 제어가 필요하면 `execute_shell` 사용
3. 개발 중에는 `moderate` 보안 레벨 권장
4. 프로덕션에서는 `strict` 보안 레벨 사용

## 테스트 방법

```bash
# 빌드
npm run build

# 테스트 실행
node test-shell-commands.js
```

---

이제 Claude Desktop에서 쉘 명령어를 자유롭게 사용할 수 있습니다! 🎉
