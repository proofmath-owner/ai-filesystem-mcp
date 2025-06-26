#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface VulnerabilityReport {
  summary: {
    total: number;
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  vulnerabilities: VulnerabilityDetail[];
  auditTime: string;
  packageAudit: {
    advisories: any[];
    metadata: any;
  };
}

export interface VulnerabilityDetail {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  packageName: string;
  installedVersion: string;
  vulnerableVersions: string;
  patchedVersions: string;
  recommendation: string;
  references: string[];
}

export interface CodeSecurityReport {
  summary: {
    totalFiles: number;
    vulnerableFiles: number;
    issuesFound: number;
  };
  issues: CodeSecurityIssue[];
  scanTime: string;
}

export interface CodeSecurityIssue {
  file: string;
  line: number;
  column: number;
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  category: 'injection' | 'xss' | 'path-traversal' | 'hardcoded-secret' | 'insecure-random' | 'other';
}

export interface SecretScanReport {
  summary: {
    totalFiles: number;
    secretsFound: number;
    typesDetected: string[];
  };
  secrets: SecretFinding[];
  scanTime: string;
}

export interface SecretFinding {
  file: string;
  line: number;
  type: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  content: string; // Redacted content
}

export interface LicenseReport {
  summary: {
    totalPackages: number;
    licensesFound: string[];
    incompatibleLicenses: string[];
  };
  packages: PackageLicense[];
  compliance: {
    compatible: boolean;
    issues: string[];
  };
}

export interface PackageLicense {
  name: string;
  version: string;
  license: string;
  licenseFile?: string;
  compatible: boolean;
  url?: string;
}

export class SecurityScanner {
  private readonly scanPatterns = {
    // Common secret patterns
    secrets: [
      {
        name: 'API Key',
        pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9\-_]{20,})/gi,
        confidence: 'high' as const
      },
      {
        name: 'Private Key',
        pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
        confidence: 'high' as const
      },
      {
        name: 'AWS Access Key',
        pattern: /AKIA[0-9A-Z]{16}/gi,
        confidence: 'high' as const
      },
      {
        name: 'JWT Token',
        pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi,
        confidence: 'medium' as const
      },
      {
        name: 'Database URL',
        pattern: /(?:mongodb|mysql|postgres|redis):\/\/[^\s'"]+/gi,
        confidence: 'medium' as const
      },
      {
        name: 'Password',
        pattern: /(?:password|pwd|pass)\s*[:=]\s*['"]?([^\s'"]{6,})/gi,
        confidence: 'medium' as const
      },
      {
        name: 'GitHub Token',
        pattern: /gh[pousr]_[A-Za-z0-9_]{36,255}/gi,
        confidence: 'high' as const
      }
    ],

    // Code security patterns
    security: [
      {
        rule: 'eval-usage',
        pattern: /\beval\s*\(/gi,
        severity: 'error' as const,
        category: 'injection' as const,
        message: 'Use of eval() is dangerous and should be avoided'
      },
      {
        rule: 'path-traversal',
        pattern: /\.\.[\\/]/gi,
        severity: 'warning' as const,
        category: 'path-traversal' as const,
        message: 'Potential path traversal vulnerability'
      },
      {
        rule: 'sql-injection',
        pattern: /\$\{[^}]*\}\s*(?:SELECT|INSERT|UPDATE|DELETE)/gi,
        severity: 'error' as const,
        category: 'injection' as const,
        message: 'Potential SQL injection vulnerability'
      },
      {
        rule: 'command-injection',
        pattern: /exec\s*\(\s*['"`][^'"`]*\$\{[^}]*\}/gi,
        severity: 'error' as const,
        category: 'injection' as const,
        message: 'Potential command injection vulnerability'
      },
      {
        rule: 'hardcoded-secret',
        pattern: /(?:token|secret|key|password)\s*[:=]\s*['"][^'"]{10,}/gi,
        severity: 'warning' as const,
        category: 'hardcoded-secret' as const,
        message: 'Potential hardcoded secret detected'
      },
      {
        rule: 'insecure-random',
        pattern: /Math\.random\(\)/gi,
        severity: 'info' as const,
        category: 'insecure-random' as const,
        message: 'Math.random() is not cryptographically secure'
      }
    ]
  };

  private readonly compatibleLicenses = [
    'MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'ISC', 'Unlicense'
  ];

  // Scan dependencies for vulnerabilities
  async scanDependencies(): Promise<VulnerabilityReport> {
    console.log('🔍 Scanning dependencies for vulnerabilities...');
    
    try {
      const { stdout } = await execAsync('npm audit --json');
      const auditResult = JSON.parse(stdout);
      
      const vulnerabilities: VulnerabilityDetail[] = [];
      const advisories = auditResult.advisories || {};
      
      for (const [id, advisory] of Object.entries(advisories)) {
        const adv = advisory as any;
        vulnerabilities.push({
          id,
          title: adv.title,
          severity: adv.severity,
          packageName: adv.module_name,
          installedVersion: adv.findings?.[0]?.version || 'unknown',
          vulnerableVersions: adv.vulnerable_versions,
          patchedVersions: adv.patched_versions,
          recommendation: adv.recommendation,
          references: adv.references || []
        });
      }
      
      const summary = {
        total: vulnerabilities.length,
        critical: vulnerabilities.filter(v => v.severity === 'critical').length,
        high: vulnerabilities.filter(v => v.severity === 'high').length,
        moderate: vulnerabilities.filter(v => v.severity === 'moderate').length,
        low: vulnerabilities.filter(v => v.severity === 'low').length
      };
      
      return {
        summary,
        vulnerabilities,
        auditTime: new Date().toISOString(),
        packageAudit: auditResult
      };
    } catch (error) {
      console.warn('NPM audit failed, creating empty report');
      return {
        summary: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
        vulnerabilities: [],
        auditTime: new Date().toISOString(),
        packageAudit: { advisories: [], metadata: {} }
      };
    }
  }

  // Scan code for security issues
  async scanCode(directory = './src'): Promise<CodeSecurityReport> {
    console.log('🔍 Scanning code for security issues...');
    
    const files = await glob('**/*.{ts,js,tsx,jsx}', {
      cwd: directory,
      absolute: true
    });
    
    const issues: CodeSecurityIssue[] = [];
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      
      for (const pattern of this.scanPatterns.security) {
        const matches = content.matchAll(pattern.pattern);
        
        for (const match of matches) {
          const lineNumber = this.getLineNumber(content, match.index || 0);
          const column = this.getColumnNumber(content, match.index || 0);
          
          issues.push({
            file: path.relative(process.cwd(), file),
            line: lineNumber,
            column,
            rule: pattern.rule,
            severity: pattern.severity,
            message: pattern.message,
            category: pattern.category
          });
        }
      }
    }
    
    return {
      summary: {
        totalFiles: files.length,
        vulnerableFiles: new Set(issues.map(i => i.file)).size,
        issuesFound: issues.length
      },
      issues,
      scanTime: new Date().toISOString()
    };
  }

  // Scan for secrets in code
  async scanSecrets(directory = '.'): Promise<SecretScanReport> {
    console.log('🔍 Scanning for secrets...');
    
    const files = await glob('**/*.{ts,js,tsx,jsx,json,yml,yaml,env,config}', {
      cwd: directory,
      absolute: true,
      ignore: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '.git/**'
      ]
    });
    
    const secrets: SecretFinding[] = [];
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        for (const pattern of this.scanPatterns.secrets) {
          const matches = content.matchAll(pattern.pattern);
          
          for (const match of matches) {
            const lineNumber = this.getLineNumber(content, match.index || 0);
            const line = content.split('\n')[lineNumber - 1];
            
            secrets.push({
              file: path.relative(process.cwd(), file),
              line: lineNumber,
              type: pattern.name,
              description: `Potential ${pattern.name} detected`,
              confidence: pattern.confidence,
              content: this.redactSecret(line, match[0])
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }
    
    return {
      summary: {
        totalFiles: files.length,
        secretsFound: secrets.length,
        typesDetected: [...new Set(secrets.map(s => s.type))]
      },
      secrets,
      scanTime: new Date().toISOString()
    };
  }

  // Scan licenses for compliance
  async scanLicense(): Promise<LicenseReport> {
    console.log('🔍 Scanning licenses...');
    
    try {
      const { stdout } = await execAsync('npm list --json --long');
      const npmList = JSON.parse(stdout);
      
      const packages: PackageLicense[] = [];
      
      const extractPackages = (deps: any, prefix = '') => {
        for (const [name, info] of Object.entries(deps || {})) {
          const pkg = info as any;
          const license = pkg._license || pkg.license || 'UNKNOWN';
          
          packages.push({
            name: prefix + name,
            version: pkg.version,
            license,
            compatible: this.compatibleLicenses.includes(license),
            url: pkg.homepage || pkg._resolved
          });
          
          if (pkg.dependencies) {
            extractPackages(pkg.dependencies, prefix);
          }
        }
      };
      
      extractPackages(npmList.dependencies);
      
      const licensesFound = [...new Set(packages.map(p => p.license))];
      const incompatibleLicenses = licensesFound.filter(
        license => !this.compatibleLicenses.includes(license) && license !== 'UNKNOWN'
      );
      
      const issues = [];
      if (incompatibleLicenses.length > 0) {
        issues.push(`Incompatible licenses found: ${incompatibleLicenses.join(', ')}`);
      }
      
      const unknownLicenses = packages.filter(p => p.license === 'UNKNOWN');
      if (unknownLicenses.length > 0) {
        issues.push(`${unknownLicenses.length} packages with unknown licenses`);
      }
      
      return {
        summary: {
          totalPackages: packages.length,
          licensesFound,
          incompatibleLicenses
        },
        packages,
        compliance: {
          compatible: incompatibleLicenses.length === 0,
          issues
        }
      };
    } catch (error) {
      console.warn('License scan failed, creating empty report');
      return {
        summary: {
          totalPackages: 0,
          licensesFound: [],
          incompatibleLicenses: []
        },
        packages: [],
        compliance: {
          compatible: true,
          issues: []
        }
      };
    }
  }

  // Run comprehensive security scan
  async runComprehensiveScan(): Promise<{
    dependencies: VulnerabilityReport;
    code: CodeSecurityReport;
    secrets: SecretScanReport;
    licenses: LicenseReport;
  }> {
    console.log('🛡️ Running comprehensive security scan...\n');
    
    const [dependencies, code, secrets, licenses] = await Promise.all([
      this.scanDependencies(),
      this.scanCode(),
      this.scanSecrets(),
      this.scanLicense()
    ]);
    
    return { dependencies, code, secrets, licenses };
  }

  // Generate security report
  async generateSecurityReport(outputPath = './security-report.json'): Promise<void> {
    const results = await this.runComprehensiveScan();
    
    // Write detailed JSON report
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
    
    // Generate summary report
    const summary = this.generateSummaryReport(results);
    const summaryPath = outputPath.replace('.json', '-summary.md');
    await fs.writeFile(summaryPath, summary);
    
    console.log('\n📊 Security Scan Summary:');
    console.log('=========================');
    console.log(`Dependencies: ${results.dependencies.summary.total} vulnerabilities found`);
    console.log(`Code Issues: ${results.code.summary.issuesFound} issues found`);
    console.log(`Secrets: ${results.secrets.summary.secretsFound} potential secrets found`);
    console.log(`Licenses: ${results.licenses.compliance.compatible ? 'Compliant' : 'Issues found'}`);
    console.log(`\n📄 Reports saved:`);
    console.log(`   - ${outputPath} (detailed JSON)`);
    console.log(`   - ${summaryPath} (summary markdown)`);
  }

  // Generate markdown summary report
  private generateSummaryReport(results: any): string {
    const { dependencies, code, secrets, licenses } = results;
    
    return `# Security Scan Report

Generated: ${new Date().toISOString()}

## 📊 Summary

| Category | Status | Details |
|----------|--------|---------|
| Dependencies | ${dependencies.summary.total > 0 ? '⚠️ Issues Found' : '✅ Clean'} | ${dependencies.summary.total} vulnerabilities |
| Code Security | ${code.summary.issuesFound > 0 ? '⚠️ Issues Found' : '✅ Clean'} | ${code.summary.issuesFound} issues in ${code.summary.vulnerableFiles} files |
| Secrets | ${secrets.summary.secretsFound > 0 ? '⚠️ Potential Issues' : '✅ Clean'} | ${secrets.summary.secretsFound} potential secrets |
| Licenses | ${licenses.compliance.compatible ? '✅ Compliant' : '⚠️ Issues Found'} | ${licenses.summary.totalPackages} packages scanned |

## 🔍 Dependency Vulnerabilities

${dependencies.summary.total === 0 ? '✅ No vulnerabilities found' : `
- **Critical**: ${dependencies.summary.critical}
- **High**: ${dependencies.summary.high}  
- **Moderate**: ${dependencies.summary.moderate}
- **Low**: ${dependencies.summary.low}

### Top Issues:
${dependencies.vulnerabilities.slice(0, 5).map((v: any) => 
  `- **${v.title}** (${v.severity}) in ${v.packageName}@${v.installedVersion}`
).join('\n')}
`}

## 🛡️ Code Security Issues

${code.summary.issuesFound === 0 ? '✅ No security issues found' : `
### Issues by Severity:
${this.groupBySeverity(code.issues).map((group: any) => 
  `- **${group.severity}**: ${group.count} issues`
).join('\n')}

### Issues by Category:
${this.groupByCategory(code.issues).map((group: any) => 
  `- **${group.category}**: ${group.count} issues`
).join('\n')}
`}

## 🔐 Secret Scan Results

${secrets.summary.secretsFound === 0 ? '✅ No secrets detected' : `
### Potential Secrets Found:
${secrets.summary.typesDetected.map((type: string) => 
  `- **${type}**: ${secrets.secrets.filter((s: any) => s.type === type).length} occurrences`
).join('\n')}

**Note**: Please review these findings manually as they may include false positives.
`}

## 📜 License Compliance

- **Total Packages**: ${licenses.summary.totalPackages}
- **Compliance Status**: ${licenses.compliance.compatible ? '✅ Compliant' : '⚠️ Issues Found'}

${licenses.compliance.issues.length > 0 ? `
### Issues:
${licenses.compliance.issues.map((issue: string) => `- ${issue}`).join('\n')}
` : ''}

## 🎯 Recommendations

${this.generateRecommendations(results)}

---
*Report generated by AI FileSystem MCP Security Scanner*`;
  }

  // Helper methods
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private getColumnNumber(content: string, index: number): number {
    const lines = content.substring(0, index).split('\n');
    return lines[lines.length - 1].length + 1;
  }

  private redactSecret(line: string, secret: string): string {
    return line.replace(secret, `${secret.substring(0, 4)}***REDACTED***`);
  }

  private groupBySeverity(issues: CodeSecurityIssue[]): Array<{severity: string, count: number}> {
    const groups = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(groups).map(([severity, count]) => ({ severity, count }));
  }

  private groupByCategory(issues: CodeSecurityIssue[]): Array<{category: string, count: number}> {
    const groups = issues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(groups).map(([category, count]) => ({ category, count }));
  }

  private generateRecommendations(results: any): string {
    const recommendations = [];
    
    if (results.dependencies.summary.total > 0) {
      recommendations.push('1. **Update Dependencies**: Run `npm audit fix` to resolve dependency vulnerabilities');
    }
    
    if (results.code.summary.issuesFound > 0) {
      recommendations.push('2. **Fix Code Issues**: Review and address security issues in your code');
    }
    
    if (results.secrets.summary.secretsFound > 0) {
      recommendations.push('3. **Remove Secrets**: Move hardcoded secrets to environment variables or secure storage');
    }
    
    if (!results.licenses.compliance.compatible) {
      recommendations.push('4. **License Review**: Review packages with incompatible licenses');
    }
    
    if (recommendations.length === 0) {
      return '✅ No immediate actions required. Great job on maintaining security!';
    }
    
    return recommendations.join('\n');
  }
}

// CLI execution
async function main() {
  const scanner = new SecurityScanner();
  await scanner.generateSecurityReport();
}

// ESM module check
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default SecurityScanner;