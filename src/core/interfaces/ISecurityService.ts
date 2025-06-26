import { SecretMatch } from '../services/security/SecretScanner.js';
import { SecurityAuditResult } from '../services/security/SecurityService.js';

export interface ISecurityService {
  scanSecrets(directory: string): Promise<SecretMatch[]>;
  securityAudit(directory: string): Promise<SecurityAuditResult>;
  generateSecurityReport(audit: SecurityAuditResult): Promise<string>;
  encryptFile(
    filePath: string,
    password: string,
    options?: {
      algorithm?: 'aes-256-gcm' | 'aes-256-cbc';
      outputPath?: string;
    }
  ): Promise<{ outputPath: string; size: number }>;
  decryptFile(
    encryptedPath: string,
    password: string,
    outputPath?: string
  ): Promise<{ outputPath: string; size: number }>;
  performSecurityAudit(
    directory: string,
    options?: {
      recursive?: boolean;
      checkPermissions?: boolean;
      checkSecrets?: boolean;
      checkVulnerabilities?: boolean;
    }
  ): Promise<{
    totalFiles: number;
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      path: string;
      description: string;
    }>;
    recommendations: string[];
  }>;
}
