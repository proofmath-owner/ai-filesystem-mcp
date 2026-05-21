import { CommandRegistry } from './CommandRegistry.js';

import { TransactionCommand } from '../implementations/batch/TransactionCommand.js';
import { FileWatcherCommand } from '../implementations/monitoring/FileWatcherCommand.js';
import {
  ScanSecretsCommand,
  EncryptFileCommand,
  DecryptFileCommand,
  SecurityAuditCommand,
} from '../implementations/security/index.js';

// 등록되는 명령어는 모두 "agent (Claude Code, Codex CLI 등) 가
// 자체 도구로 깔끔히 처리하기 어려운 작업"에 한정.
//   - transaction: 여러 파일을 원자적으로 변경 (rollback 보장)
//   - start_watching: 세션 외부에서 살아남는 file watcher
//   - scan_secrets / security_audit: 정책화된 secret 감사
//   - encrypt_file / decrypt_file: AES-256-GCM + PBKDF2 (포맷 호환 보장)
export class CommandLoader {
  constructor(private readonly registry: CommandRegistry) {}

  async loadCommands(): Promise<void> {
    this.registry.registerMany([
      new TransactionCommand(),
      new FileWatcherCommand(),
      new ScanSecretsCommand(),
      new SecurityAuditCommand(),
      new EncryptFileCommand(),
      new DecryptFileCommand(),
    ]);
  }
}
