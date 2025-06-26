import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { promisify } from 'util';

const globAsync = promisify(glob);

export interface SecretMatch {
  path: string;
  line: number;
  type: string;
  match: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class SecretScanner {
  private patterns: Array<{
    name: string;
    pattern: RegExp;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [
    // API Keys
    {
      name: 'AWS Access Key',
      pattern: /AKIA[0-9A-Z]{16}/g,
      severity: 'critical'
    },
    {
      name: 'Generic API Key',
      pattern: /api[_-]?key[_-]?[:=]\s*["']?[a-zA-Z0-9]{32,}["']?/gi,
      severity: 'high'
    },
    // Passwords
    {
      name: 'Password in code',
      pattern: /password[_-]?[:=]\s*["'][^"']{8,}["']/gi,
      severity: 'high'
    },
    // Private Keys
    {
      name: 'RSA Private Key',
      pattern: /-----BEGIN RSA PRIVATE KEY-----/g,
      severity: 'critical'
    },
    {
      name: 'SSH Private Key',
      pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g,
      severity: 'critical'
    },
    // Tokens
    {
      name: 'JWT Token',
      pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
      severity: 'medium'
    },
    {
      name: 'GitHub Token',
      pattern: /ghp_[a-zA-Z0-9]{36}/g,
      severity: 'critical'
    },
    {
      name: 'Slack Token',
      pattern: /xox[baprs]-[0-9]{10,12}-[0-9]{10,12}-[a-zA-Z0-9]{24,32}/g,
      severity: 'high'
    },
    // Database URLs
    {
      name: 'Database Connection String',
      pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^"'\s]+/g,
      severity: 'high'
    },
    // Cloud Provider Secrets
    {
      name: 'Google API Key',
      pattern: /AIza[0-9A-Za-z-_]{35}/g,
      severity: 'critical'
    },
    {
      name: 'Stripe API Key',
      pattern: /sk_live_[0-9a-zA-Z]{24,}/g,
      severity: 'critical'
    },
    // Environment Variables
    {
      name: 'Environment Variable',
      pattern: /process\.env\.[A-Z_]+/g,
      severity: 'low'
    }
  ];

  async scanDirectory(directory: string): Promise<SecretMatch[]> {
    const results: SecretMatch[] = [];
    
    // Get all files
    const files = await globAsync(path.join(directory, '**/*'), {
      nodir: true,
      ignore: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/*.min.js',
        '**/*.map'
      ]
    });

    // Scan each file
    for (const file of files as string[]) {
      const fileResults = await this.scanFile(file);
      results.push(...fileResults);
    }

    return results;
  }

  async scanFile(filePath: string): Promise<SecretMatch[]> {
    const results: SecretMatch[] = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        
        for (const { name, pattern, severity } of this.patterns) {
          const matches = Array.from(line.matchAll(pattern));
          
          for (const match of matches) {
            // Skip if it's in a comment
            if (this.isInComment(line, match.index!)) continue;
            
            results.push({
              path: filePath,
              line: lineIndex + 1,
              type: name,
              match: this.sanitizeMatch(match[0]),
              severity
            });
          }
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }

    return results;
  }

  private isInComment(line: string, index: number): boolean {
    // Simple comment detection
    const beforeMatch = line.substring(0, index);
    
    // Single line comments
    if (beforeMatch.includes('//')) return true;
    if (beforeMatch.includes('#')) return true;
    if (beforeMatch.includes('--')) return true;
    
    // Multi-line comments (simplified)
    if (beforeMatch.includes('/*') && !beforeMatch.includes('*/')) return true;
    if (beforeMatch.includes('<!--') && !beforeMatch.includes('-->')) return true;
    
    return false;
  }

  private sanitizeMatch(match: string): string {
    // Truncate and partially hide sensitive data
    if (match.length > 20) {
      return match.substring(0, 10) + '...' + match.substring(match.length - 4);
    }
    return match.substring(0, 5) + '...';
  }

  async generateReport(matches: SecretMatch[]): Promise<string> {
    const groupedByFile: Record<string, SecretMatch[]> = {};
    
    for (const match of matches) {
      if (!groupedByFile[match.path]) {
        groupedByFile[match.path] = [];
      }
      groupedByFile[match.path].push(match);
    }

    let report = '# Security Scan Report\n\n';
    report += `Total issues found: ${matches.length}\n\n`;
    
    // Summary by severity
    const bySeverity = {
      critical: matches.filter(m => m.severity === 'critical').length,
      high: matches.filter(m => m.severity === 'high').length,
      medium: matches.filter(m => m.severity === 'medium').length,
      low: matches.filter(m => m.severity === 'low').length
    };
    
    report += '## Summary by Severity\n';
    report += `- Critical: ${bySeverity.critical}\n`;
    report += `- High: ${bySeverity.high}\n`;
    report += `- Medium: ${bySeverity.medium}\n`;
    report += `- Low: ${bySeverity.low}\n\n`;
    
    // Details by file
    report += '## Details\n\n';
    
    for (const [file, fileMatches] of Object.entries(groupedByFile)) {
      report += `### ${file}\n`;
      
      for (const match of fileMatches) {
        report += `- Line ${match.line}: ${match.type} (${match.severity})\n`;
        report += `  Match: ${match.match}\n`;
      }
      
      report += '\n';
    }

    return report;
  }
}
