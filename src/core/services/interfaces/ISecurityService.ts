import { CommandResult } from '../../commands/Command.js';

export interface PermissionOptions {
  mode: string | number;
  recursive?: boolean;
}

export interface EncryptionOptions {
  algorithm?: string;
  password: string;
}

export interface SecurityAuditOptions {
  checkPermissions?: boolean;
  checkSecrets?: boolean;
  checkVulnerabilities?: boolean;
}

export interface ISecurityService {
  // Permission operations
  changePermissions(path: string, options: PermissionOptions): Promise<CommandResult>;
  
  // Encryption operations
  encryptFile(filePath: string, options: EncryptionOptions): Promise<CommandResult>;
  decryptFile(filePath: string, password: string): Promise<CommandResult>;
  
  // Security scanning
  scanSecrets(directory: string): Promise<CommandResult>;
  securityAudit(directory: string, options?: SecurityAuditOptions): Promise<CommandResult>;
}