import { Command, CommandContext, CommandResult } from '../Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Change Permissions Command
 * 파일 또는 디렉토리의 권한을 변경합니다.
 */
export class ChangePermissionsCommand extends Command {
  readonly name = 'change_permissions';
  readonly description = 'Change file or directory permissions';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'File or directory path' 
      },
      permissions: { 
        type: 'string', 
        description: 'Permissions (e.g., 755, rwxr-xr-x)' 
      }
    },
    required: ['path', 'permissions']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    this.assertString(args.permissions, 'permissions');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path, permissions } = context.args;
    return await context.fsManager.changePermissions(path, permissions);
  }
}

/**
 * Encrypt File Command
 * 파일을 비밀번호로 암호화합니다.
 */
export class EncryptFileCommand extends Command {
  readonly name = 'encrypt_file';
  readonly description = 'Encrypt a file with password';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'File to encrypt' 
      },
      password: { 
        type: 'string', 
        description: 'Encryption password' 
      }
    },
    required: ['path', 'password']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    this.assertString(args.password, 'password');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path, password } = context.args;
    return await context.fsManager.encryptFile(path, password);
  }
}

/**
 * Decrypt File Command
 * 암호화된 파일을 복호화합니다.
 */
export class DecryptFileCommand extends Command {
  readonly name = 'decrypt_file';
  readonly description = 'Decrypt an encrypted file';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      encryptedPath: { 
        type: 'string', 
        description: 'Encrypted file path' 
      },
      password: { 
        type: 'string', 
        description: 'Decryption password' 
      }
    },
    required: ['encryptedPath', 'password']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.encryptedPath, 'encryptedPath');
    this.assertString(args.password, 'password');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { encryptedPath, password } = context.args;
    return await context.fsManager.decryptFile(encryptedPath, password);
  }
}

/**
 * Scan Secrets Command
 * 디렉토리에서 하드코딩된 시크릿과 민감한 데이터를 스캔합니다.
 */
export class ScanSecretsCommand extends Command {
  readonly name = 'scan_secrets';
  readonly description = 'Scan directory for hardcoded secrets and sensitive data';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      directory: { 
        type: 'string', 
        description: 'Directory to scan' 
      }
    },
    required: ['directory']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.directory, 'directory');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { directory } = context.args;
    return await context.fsManager.scanSecrets(directory);
  }
}

/**
 * Security Audit Command
 * 디렉토리에 대한 보안 감사를 수행합니다.
 */
export class SecurityAuditCommand extends Command {
  readonly name = 'security_audit';
  readonly description = 'Perform security audit on directory';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      directory: { 
        type: 'string', 
        description: 'Directory to audit' 
      }
    },
    required: ['directory']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.directory, 'directory');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { directory } = context.args;
    return await context.fsManager.securityAudit(directory);
  }
}
