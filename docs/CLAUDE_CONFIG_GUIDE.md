# AI FileSystem MCP 설정 수정 가이드

## 1. 설정 파일 열기

### macOS에서 설정 파일 열기:
```bash
# 터미널에서
open -e "/Users/sangbinna/Library/Application Support/Claude/claude_desktop_config.json"

# 또는 VS Code로
code "/Users/sangbinna/Library/Application Support/Claude/claude_desktop_config.json"
```

## 2. 환경 변수 추가 (선택사항)

기본 보안 레벨을 moderate로 설정하려면:

```json
"ai-filesystem": {
  "command": "node",
  "args": ["/Users/sangbinna/mcp/ai-filesystem-mcp/dist/index.js"],
  "env": {
    "DEFAULT_SECURITY_LEVEL": "moderate"
  }
}
```

## 3. Claude Desktop 재시작

설정 변경 후 Claude Desktop을 완전히 종료하고 다시 시작해야 합니다:
1. Claude Desktop 종료 (Cmd+Q)
2. 다시 실행

## 4. 설정 확인

Claude에서 다음 명령어로 확인:
```
file_watcher 명령어가 사용 가능한지 확인해줘
```

정상 작동하면 "Available commands: ... file_watcher ..." 같은 메시지가 나옵니다.
