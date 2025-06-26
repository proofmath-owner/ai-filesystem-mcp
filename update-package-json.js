import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 현재 파일의 디렉토리 경로 가져오기
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// package.json 읽기
const packageJsonPath = join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// scripts 업데이트
const updatedScripts = {
    ...packageJson.scripts,
    "test": "npm run build && node tests/integration/test.js",
    "test:refactored": "npm run build && node tests/integration/test-refactored.js", 
    "test:phase1": "npm run build && node tests/integration/test-phase1.js",
    "validate:phase1": "npm run build && node scripts/debug/debug-phase1.js",
    "test:all": "npm run build && node tests/integration/test-all-39.js",
    "test:git": "npm run build && node tests/integration/test-git.js",
    "test:metadata": "npm run build && node tests/integration/test-metadata.js",
    "test:transaction": "npm run build && node tests/integration/test-transaction-deep.js",
    "debug:failed": "node scripts/debug/debug-failed.js",
    "debug:registry": "node scripts/debug/debug-registry.js",
    "debug:step": "node scripts/debug/debug-step-by-step.js",
    "diagnose": "node scripts/debug/quick-diagnose.js",
    "setup": "./scripts/setup/install.sh",
    "setup:clean": "./scripts/setup/clean-install.sh",
    "setup:validate": "./scripts/setup/setup-and-validate.sh",
    "build:quick": "./scripts/build/quick-build.sh",
    "build:check": "./scripts/build/check-build.sh",
    "build:diagnose": "./scripts/build/diagnose-build.sh"
};

packageJson.scripts = updatedScripts;

// 정렬된 scripts로 업데이트
const sortedScripts = Object.keys(updatedScripts)
    .sort()
    .reduce((acc, key) => {
        acc[key] = updatedScripts[key];
        return acc;
    }, {});

packageJson.scripts = sortedScripts;

// 업데이트된 package.json 저장
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✅ package.json 업데이트 완료!');
console.log('\n📋 업데이트된 스크립트 목록:');
console.log('- 테스트 관련: test, test:* 명령어들이 tests/integration/ 경로로 업데이트');
console.log('- 디버그 관련: debug:* 명령어들이 scripts/debug/ 경로로 업데이트');
console.log('- 빌드 관련: build:* 명령어들이 scripts/build/ 경로로 업데이트');
console.log('- 설정 관련: setup:* 명령어들이 scripts/setup/ 경로로 업데이트');
console.log('\n다음 단계: npm test로 테스트가 잘 동작하는지 확인해보세요!');
