import { promises as fs } from 'fs';
import * as path from 'path';
import { ISecurityService, PermissionOptions, EncryptionOptions, SecurityAuditOptions } from '../interfaces/ISecurityService.js';
import { CommandResult } from '../../commands/Command.js';
import { SecurityManager } from '../../SecurityManager.js';
import { PermissionManager } from '../../PermissionManager.js';
import { MonitoringManager } from '../../MonitoringManager.js';
import { ErrorHandlingManager } from '../../ErrorHandlingManager.js';

export class SecurityService implements ISecurityService {
  constructor(
    private securityManager: SecurityManager,
    private permissionManager: PermissionManager,
    private monitoringManager: MonitoringManager,
    private errorManager: ErrorHandlingManager
  ) {}

  private async getFilesRecursive(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.getFilesRecursive(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private async handleError(error: unknown, operation: string, path?: string): Promise<CommandResult> {
    const errorContext = {
      operation,
      path,
      error,
      timestamp: new Date()
    };
    const recovery = await this.errorManager.analyzeError(errorContext);
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n${recovery.suggestions.map(s => s.message).join('\n')}`
      }]
    };
  }

  async changePermissions(filePath: string, options: PermissionOptions): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const modeString = typeof options.mode === 'number' 
        ? options.mode.toString(8) 
        : options.mode;
        
      await this.permissionManager.changePermissions(filePath, modeString);
      
      if (options.recursive && (await fs.stat(filePath)).isDirectory()) {
        // For recursive, we need to implement it manually
        const files = await this.getFilesRecursive(filePath);
        for (const file of files) {
          await this.permissionManager.changePermissions(file, modeString);
        }
      }
      
      await this.monitoringManager.logOperation({
        type: 'chmod',
        path: filePath,
        success: true,
        metadata: { 
          duration: Date.now() - startTime,
          permissions: options.mode.toString()
        }
      });
      
      return {
        content: [{ 
          type: 'text', 
          text: `Permissions changed successfully for ${filePath}${options.recursive ? ' (recursive)' : ''}`
        }]
      };
    } catch (error) {
      return this.handleError(error, 'change_permissions', filePath);
    }
  }

  async encryptFile(filePath: string, options: EncryptionOptions): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.securityManager.encryptFile(filePath, {
        password: options.password,
        algorithm: options.algorithm
      });
      
      await this.monitoringManager.logOperation({
        type: 'write',
        path: result.encryptedPath,
        success: true,
        metadata: { duration: Date.now() - startTime }
      });
      
      return {
        content: [{ 
          type: 'text', 
          text: `File encrypted successfully: ${result.encryptedPath}\nAlgorithm: ${options.algorithm || 'aes-256-cbc'}`
        }]
      };
    } catch (error) {
      return this.handleError(error, 'encrypt_file', filePath);
    }
  }

  async decryptFile(filePath: string, password: string): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.securityManager.decryptFile(filePath, password);
      
      await this.monitoringManager.logOperation({
        type: 'write',
        path: result.decryptedPath,
        success: true,
        metadata: { duration: Date.now() - startTime }
      });
      
      return {
        content: [{ 
          type: 'text', 
          text: `File decrypted successfully: ${result.decryptedPath}`
        }]
      };
    } catch (error) {
      return this.handleError(error, 'decrypt_file', filePath);
    }
  }

  async scanSecrets(directory: string): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const results = await this.securityManager.scanSecrets(directory);
      
      await this.monitoringManager.logOperation({
        type: 'read',
        path: directory,
        success: true,
        metadata: { duration: Date.now() - startTime }
      });
      
      const summary = {
        directory,
        totalFindings: results.summary.total,
        bySeverity: results.summary.bySeverity,
        byType: results.summary.byType,
        findings: results.results
      };
      
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(summary, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError(error, 'scan_secrets', directory);
    }
  }

  async securityAudit(directory: string, options?: SecurityAuditOptions): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const auditOptions = {
        checkPermissions: options?.checkPermissions ?? true,
        checkSecrets: options?.checkSecrets ?? true,
        checkVulnerabilities: options?.checkVulnerabilities ?? true
      };
      
      // Perform security audit manually since the method doesn't exist
      const results: any = {
        directory,
        issues: [],
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0
        }
      };

      // Check permissions if enabled
      if (auditOptions.checkPermissions) {
        const files = await this.getFilesRecursive(directory);
        for (const file of files) {
          try {
            const stats = await fs.stat(file);
            const mode = (stats.mode & parseInt('777', 8)).toString(8);
            if (mode === '777' || mode === '666') {
              results.issues.push({
                type: 'permission',
                severity: 'high',
                file,
                message: `File has overly permissive permissions: ${mode}`
              });
              results.summary.highIssues++;
            }
          } catch (err) {
            // Skip files we can't access
          }
        }
      }

      // Check for secrets if enabled
      if (auditOptions.checkSecrets) {
        const secretResults = await this.securityManager.scanSecrets(directory);
        for (const secret of secretResults.results) {
          results.issues.push({
            type: 'secret',
            severity: secret.severity,
            file: secret.file,
            message: `Found ${secret.type}: ${secret.match.substring(0, 20)}...`
          });
          
          switch (secret.severity) {
            case 'critical':
              results.summary.criticalIssues++;
              break;
            case 'high':
              results.summary.highIssues++;
              break;
            case 'medium':
              results.summary.mediumIssues++;
              break;
            case 'low':
              results.summary.lowIssues++;
              break;
          }
        }
      }

      results.summary.totalIssues = results.issues.length;
      
      await this.monitoringManager.logOperation({
        type: 'read',
        path: directory,
        success: true,
        metadata: { duration: Date.now() - startTime }
      });
      
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(results, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError(error, 'security_audit', directory);
    }
  }
}