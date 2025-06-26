# 🚀 AI FileSystem MCP 빠른 시작 가이드

## 초기 설정 (처음 한 번만)

```bash
# 1. 실행 권한 부여
chmod +x setup.sh

# 2. 초기 설정 실행
./setup.sh
```

## 일상적인 사용

### 🎯 MCP 서버 실행
```bash
./run.sh
```

### 🔧 개발 모드 (파일 변경 감지)
```bash
./dev.sh
```

### ⚡ 빠른 시작 (빌드 스킵)
```bash
./quick-start.sh
```

### 🧪 테스트 실행
```bash
./test.sh
```

## 스크립트 설명

| 스크립트 | 설명 | 용도 |
|---------|------|------|
| `setup.sh` | 초기 설정 | 프로젝트 처음 설정 시 |
| `run.sh` | 빌드 & 실행 | 일반적인 실행 |
| `dev.sh` | 개발 모드 | 코드 수정 시 |
| `quick-start.sh` | 빠른 실행 | 이미 빌드된 경우 |
| `test.sh` | 테스트 메뉴 | 다양한 테스트 실행 |
| `make-executable.sh` | 권한 설정 | 모든 스크립트 실행 권한 |

## 문제 해결

### 실행 권한 오류
```bash
chmod +x make-executable.sh
./make-executable.sh
```

### 빌드 오류
```bash
npm run clean
npm install
npm run build
```

### 포트 충돌
MCP 서버는 stdio를 사용하므로 포트 충돌은 발생하지 않습니다.

## 주요 기능

- 🔐 **보안 쉘 실행**: 3단계 보안 레벨 (strict/moderate/permissive)
- 📁 **파일 시스템 조작**: 읽기, 쓰기, 검색, 압축
- 🔍 **고급 검색**: 의미 기반 검색, 퍼지 검색
- 🛠️ **코드 분석**: 9개 언어 지원
- 🔄 **Git 통합**: 완전한 Git 워크플로우
- 🔒 **보안 기능**: 암호화, 비밀 스캔

## 빠른 명령어

```bash
# 서버 시작
./run.sh

# 개발 시작
./dev.sh

# 모든 테스트
./test.sh
# -> 1 선택

# 쉘 실행 테스트
./test.sh
# -> 2 선택
```

---

💡 **팁**: `./setup.sh`를 실행하면 Claude Desktop 설정 방법도 안내됩니다!
