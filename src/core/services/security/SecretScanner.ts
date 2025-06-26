import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

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
    const startTime = Date.now();
    const MAX_DURATION = 10000; // 10초 제한
    const MAX_FILES = 500; // 최대 파일 수 제한
    
    try {
      // Get all files
      const files = await glob(path.join(directory, '**/*'), {
        nodir: true,
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/*.min.js',
          '**/*.map',
          '**/*.lock',
          '**/coverage/**'
        ]
      });

      // 파일 수 제한
      const limitedFiles = (files as string[]).slice(0, MAX_FILES);
      
      // Scan each file
      for (const file of limitedFiles) {
        // 시간 제한 체크
        if (Date.now() - startTime > MAX_DURATION) {
          console.warn(`Secret scan timeout after scanning ${results.length} secrets in ${limitedFiles.indexOf(file)} files`);
          break;
        }
        
        try {
          const fileResults = await this.scanFile(file);
          results.push(...fileResults);
          
          // 결과가 너무 많으면 중단
          if (results.length > 1000) {
            console.warn('Too many secrets found, stopping scan');
            break;
          }
        } catch (error) {
          // 개별 파일 오류는 무시하고 계속
          continue;
        }
      }
    } catch (error) {
      console.error('Secret scan error:', error);
    }

    return results;
  }

  async scanFile(filePath: string): Promise<SecretMatch[]> {
    const results: SecretMatch[] = [];
    
    try {
      // 파일 크기 체크
      const stats = await fs.stat(filePath);
      if (stats.size > 1024 * 1024) { // 1MB 이상 파일 스킵
        return results;
      }
      
      // 바이너리 파일 확장자 체크
      const ext = path.extname(filePath).toLowerCase();
      const binaryExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.dylib'];
      if (binaryExts.includes(ext)) {
        return results;
      }
      
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // 라인 수 제한
      const maxLines = Math.min(lines.length, 5000);

      for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
        const line = lines[lineIndex];
        
        // 라인 길이 제한 (너무 긴 라인은 스킵)
        if (line.length > 500) continue;
        
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
            
            // 파일당 최대 시크릿 수 제한
            if (results.length > 50) {
              return results;
            }
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
