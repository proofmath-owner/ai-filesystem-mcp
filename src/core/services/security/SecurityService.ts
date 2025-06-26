import * as fs from 'fs/promises';
import * as path from 'path';
import { ISecurityService } from '../../interfaces/ISecurityService.js';
import { EncryptionService } from './EncryptionService.js';
import { SecretScanner, SecretMatch } from './SecretScanner.js';
import { glob } from 'glob';


export interface SecurityAuditResult {
  secretsFound: SecretMatch[];
  permissionIssues: Array<{
    path: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  vulnerabilities: Array<{
    type: string;
    description: string;
    files: string[];
  }>;
  score: number; // 0-100, where 100 is perfect security
}

export class SecurityService implements ISecurityService {
  constructor(
    private encryptionService: EncryptionService,
    private secretScanner: SecretScanner
  ) {}

  async scanSecrets(directory: string): Promise<SecretMatch[]> {
    return this.secretScanner.scanDirectory(directory);
  }

  async securityAudit(directory: string): Promise<SecurityAuditResult> {
    const auditResult: SecurityAuditResult = {
      secretsFound: [],
      permissionIssues: [],
      vulnerabilities: [],
      score: 100
    };

    // Scan for secrets
    auditResult.secretsFound = await this.secretScanner.scanDirectory(directory);
    
    // Check permissions
    auditResult.permissionIssues = await this.checkPermissions(directory);
    
    // Check for vulnerabilities
    auditResult.vulnerabilities = await this.checkVulnerabilities(directory);
    
    // Calculate score
    auditResult.score = this.calculateSecurityScore(auditResult);
    
    return auditResult;
  }

  private async checkPermissions(directory: string): Promise<Array<{
    path: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }>> {
    const issues: Array<{
      path: string;
      issue: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        try {
          const stats = await fs.stat(fullPath);
          const mode = stats.mode;
          
          // Check for world-writable files
          if (mode & 0o002) {
            issues.push({
              path: fullPath,
              issue: 'File is world-writable',
              severity: 'high'
            });
          }
          
          // Check for executable files
          if (mode & 0o111 && entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (!['.sh', '.exe', '.bat', '.cmd'].includes(ext)) {
              issues.push({
                path: fullPath,
                issue: 'Unexpected executable permission',
                severity: 'medium'
              });
            }
          }
          
          // Recursively check subdirectories
          if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
            const subIssues = await this.checkPermissions(fullPath);
            issues.push(...subIssues);
          }
        } catch (error) {
          // Skip files we can't access
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }

    return issues;
  }

  private async checkVulnerabilities(directory: string): Promise<Array<{
    type: string;
    description: string;
    files: string[];
  }>> {
    const vulnerabilities: Array<{
      type: string;
      description: string;
      files: string[];
    }> = [];

    // Check for common vulnerability patterns
    
    // 1. Check for outdated dependencies
    try {
      const packageJsonPath = path.join(directory, 'package.json');
      const packageLockPath = path.join(directory, 'package-lock.json');
      
      const hasPackageJson = await this.fileExists(packageJsonPath);
      const hasPackageLock = await this.fileExists(packageLockPath);
      
      if (hasPackageJson && !hasPackageLock) {
        vulnerabilities.push({
          type: 'Missing lock file',
          description: 'No package-lock.json found. This can lead to inconsistent dependencies.',
          files: [packageJsonPath]
        });
      }
    } catch (error) {
      // Ignore
    }

    // 2. Check for .env files
    try {
      const envPath = path.join(directory, '.env');
      if (await this.fileExists(envPath)) {
        vulnerabilities.push({
          type: 'Environment file exposed',
          description: '.env file found in project root. Ensure it\'s in .gitignore.',
          files: [envPath]
        });
      }
    } catch (error) {
      // Ignore
    }

    // 3. Check for debug mode in configuration files
    const configPatterns = ['**/config*.js', '**/config*.json', '**/settings*.js'];
    for (const pattern of configPatterns) {
      try {
        const files = await glob(path.join(directory, pattern), {
          ignore: ['**/node_modules/**', '**/.git/**']
        });
        
        for (const file of files as string[]) {
          try {
            const content = await fs.readFile(file, 'utf-8');
            if (content.includes('debug: true') || content.includes('"debug": true')) {
              if (!vulnerabilities.find(v => v.type === 'Debug mode enabled')) {
                vulnerabilities.push({
                  type: 'Debug mode enabled',
                  description: 'Debug mode is enabled in configuration files.',
                  files: []
                });
              }
              const vuln = vulnerabilities.find(v => v.type === 'Debug mode enabled');
              if (vuln) vuln.files.push(file);
            }
          } catch (error) {
            // Skip files we can't read
          }
        }
      } catch (error) {
        // Skip if glob fails
      }
    }

    return vulnerabilities;
  }

  private calculateSecurityScore(audit: SecurityAuditResult): number {
    let score = 100;
    
    // Deduct points for secrets
    for (const secret of audit.secretsFound) {
      switch (secret.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }
    
    // Deduct points for permission issues
    for (const issue of audit.permissionIssues) {
      switch (issue.severity) {
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }
    
    // Deduct points for vulnerabilities
    score -= audit.vulnerabilities.length * 5;
    
    return Math.max(0, score);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async generateSecurityReport(audit: SecurityAuditResult): Promise<string> {
    let report = '# Security Audit Report\n\n';
    report += `Security Score: ${audit.score}/100\n\n`;
    
    // Secrets section
    if (audit.secretsFound.length > 0) {
      report += '## Secrets Found\n\n';
      report += await this.secretScanner.generateReport(audit.secretsFound);
    } else {
      report += '## Secrets\n\nNo secrets found. ✅\n\n';
    }
    
    // Permission issues section
    if (audit.permissionIssues.length > 0) {
      report += '## Permission Issues\n\n';
      for (const issue of audit.permissionIssues) {
        report += `- **${issue.path}**: ${issue.issue} (${issue.severity})\n`;
      }
      report += '\n';
    } else {
      report += '## Permissions\n\nNo permission issues found. ✅\n\n';
    }
    
    // Vulnerabilities section
    if (audit.vulnerabilities.length > 0) {
      report += '## Vulnerabilities\n\n';
      for (const vuln of audit.vulnerabilities) {
        report += `### ${vuln.type}\n`;
        report += `${vuln.description}\n`;
        if (vuln.files.length > 0) {
          report += 'Files:\n';
          for (const file of vuln.files) {
            report += `- ${file}\n`;
          }
        }
        report += '\n';
      }
    } else {
      report += '## Vulnerabilities\n\nNo vulnerabilities found. ✅\n\n';
    }
    
    // Recommendations
    report += '## Recommendations\n\n';
    if (audit.score < 50) {
      report += '⚠️ **Critical**: Your security score is very low. Address the issues immediately.\n\n';
    } else if (audit.score < 80) {
      report += '⚠️ **Warning**: Your security score needs improvement.\n\n';
    } else {
      report += '✅ **Good**: Your security score is good, but always stay vigilant.\n\n';
    }
    
    report += '1. Never commit secrets to version control\n';
    report += '2. Use environment variables for sensitive configuration\n';
    report += '3. Regularly update dependencies\n';
    report += '4. Enable 2FA on all developer accounts\n';
    report += '5. Use secret scanning tools in CI/CD pipeline\n';
    
    return report;
  }

  async encryptFile(
    filePath: string,
    password: string,
    options?: {
      algorithm?: 'aes-256-gcm' | 'aes-256-cbc';
      outputPath?: string;
    }
  ): Promise<{ outputPath: string; size: number }> {
    const encryptedPath = options?.outputPath || `${filePath}.enc`;
    await this.encryptionService.encryptFile(filePath, password, encryptedPath);
    const stats = await fs.stat(encryptedPath);
    return {
      outputPath: encryptedPath,
      size: stats.size
    };
  }

  async decryptFile(
    encryptedPath: string,
    password: string,
    outputPath?: string
  ): Promise<{ outputPath: string; size: number }> {
    const decryptedPath = outputPath || encryptedPath.replace(/\.enc$/, '');
    await this.encryptionService.decryptFile(encryptedPath, password, decryptedPath);
    const stats = await fs.stat(decryptedPath);
    return {
      outputPath: decryptedPath,
      size: stats.size
    };
  }

  async performSecurityAudit(
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
  }> {
    const audit = await this.securityAudit(directory);
    
    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      path: string;
      description: string;
    }> = [];
    
    // Convert audit results to issues
    for (const secret of audit.secretsFound) {
      issues.push({
        type: 'secret',
        severity: secret.severity,
        path: secret.path,
        description: `Found ${secret.type}: ${secret.match.substring(0, 20)}...`
      });
    }
    
    for (const perm of audit.permissionIssues) {
      issues.push({
        type: 'permission',
        severity: perm.severity,
        path: perm.path,
        description: perm.issue
      });
    }
    
    for (const vuln of audit.vulnerabilities) {
      for (const file of vuln.files) {
        issues.push({
          type: 'vulnerability',
          severity: 'medium',
          path: file,
          description: `${vuln.type}: ${vuln.description}`
        });
      }
    }
    
    const recommendations = [];
    if (audit.score < 50) {
      recommendations.push('Immediately address all critical security issues');
      recommendations.push('Implement a security review process');
    }
    if (audit.secretsFound.length > 0) {
      recommendations.push('Remove all hardcoded secrets and use environment variables');
      recommendations.push('Add secret scanning to your CI/CD pipeline');
    }
    if (audit.permissionIssues.length > 0) {
      recommendations.push('Review and fix file permissions');
    }
    if (audit.vulnerabilities.length > 0) {
      recommendations.push('Update dependencies and fix configuration issues');
    }
    
    // Count total files
    let totalFiles = 0;
    try {
      const files = await glob(path.join(directory, '**/*'), {
        ignore: ['**/node_modules/**', '**/.git/**'],
        nodir: true
      });
      totalFiles = (files as string[]).length;
    } catch {
      totalFiles = 0;
    }
    
    return {
      totalFiles,
      issues,
      recommendations
    };
  }
}
