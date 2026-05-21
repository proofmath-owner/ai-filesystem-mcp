import { CommandRegistry } from '../commands/registry/CommandRegistry.js';
import { CommandLoader } from '../commands/registry/CommandLoader.js';

import { SecurityService } from './services/security/SecurityService.js';
import { EncryptionService } from './services/security/EncryptionService.js';
import { SecretScanner } from './services/security/SecretScanner.js';
import { TransactionService } from './services/batch/TransactionService.js';
import { FileWatcherService } from './services/monitoring/FileWatcherService.js';

// MCP가 노출하는 명령어들의 의존성만 보관하는 minimal DI 컨테이너.
// agent (Claude Code / Codex 등) 가 잘 못 하는 작업만 남겼기 때문에
// 컨테이너도 그에 맞춰 축소되어 있음.
export class ServiceContainer {
  private services: Map<string, any> = new Map();
  private commandRegistry!: CommandRegistry;

  constructor() {
    this.initializeServices();
  }

  async initialize(): Promise<void> {
    this.commandRegistry = new CommandRegistry();
    const loader = new CommandLoader(this.commandRegistry);
    await loader.loadCommands();
  }

  private initializeServices(): void {
    // Security: secret 스캔 + 파일 암호화.
    const encryptionService = new EncryptionService();
    const secretScanner = new SecretScanner();
    const securityService = new SecurityService(encryptionService, secretScanner);

    // Batch: 여러 파일 원자적 변경 (agent의 Edit는 atomic하지 않음).
    const transactionService = new TransactionService();

    // Monitoring: agent 세션 외부에서 살아남는 file watcher.
    const fileWatcherService = new FileWatcherService();

    this.services.set('securityService', securityService);
    this.services.set('transactionService', transactionService);
    this.services.set('fileWatcherService', fileWatcherService);
  }

  getService<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service as T;
  }

  getCommandRegistry(): CommandRegistry {
    return this.commandRegistry;
  }

  async cleanup(): Promise<void> {
    // chokidar watcher는 명시적으로 닫지 않으면 프로세스 종료를 막을 수 있음.
    const watcher = this.services.get('fileWatcherService') as FileWatcherService | undefined;
    if (watcher) {
      await watcher.stopAllWatchers().catch(err => {
        console.error('Failed to stop watchers during cleanup:', err);
      });
    }
  }
}
