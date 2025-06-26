import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export interface EncryptionOptions {
  algorithm?: string;
  password: string;
  outputPath?: string;
}

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface SecretScanResult {
  file: string;
  line: number;
  column: number;
  type: string;
  severity: string;
  match: string;
  context: string;
}

export class SecurityManager {
  private readonly algorithm = 'aes-256-cbc';
  private readonly saltLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly keyLength = 32;

  // 기본 비밀 패턴들
  private secretPatterns: SecretPattern[] = [
    {
      name: 'AWS Access Key',
      pattern: /AKIA[0-9A-Z]{16}/g,
      severity: 'critical',
      description: 'AWS Access Key ID'
    },
    {
      name: 'AWS Secret Key',
      pattern: /(?:aws_secret_access_key|aws.secret.key|secret.access.key)\s*[:=]\s*["']?[0-9a-zA-Z/+=]{40}["']?|(?:^|[^a-zA-Z0-9])[0-9a-zA-Z/+=]{40}(?=\s*$|[^a-zA-Z0-9])/g,
      severity: 'critical',
      description: 'AWS Secret Access Key'
    },
    {
      name: 'API Key',
      pattern: /[aA][pP][iI][-_]?[kK][eE][yY]\s*[:=]\s*["']?[a-zA-Z0-9_\-]{20,}["']?/g,
      severity: 'high',
      description: 'Generic API Key'
    },
    {
      name: 'Private Key',
      pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
      severity: 'critical',
      description: 'Private cryptographic key'
    },
    {
      name: 'JWT Token',
      pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      severity: 'high',
      description: 'JSON Web Token'
    },
    {
      name: 'GitHub Token',
      pattern: /ghp_[a-zA-Z0-9]{36}/g,
      severity: 'critical',
      description: 'GitHub Personal Access Token'
    },
    {
      name: 'Slack Token',
      pattern: /xox[baprs]-[0-9a-zA-Z\-]+/g,
      severity: 'high',
      description: 'Slack API Token'
    },
    {
      name: 'Database URL',
      pattern: /[a-zA-Z]+:\/\/[^:]+:[^@]+@[^/]+\/[^\s]+/g,
      severity: 'critical',
      description: 'Database connection string with credentials'
    },
    {
      name: 'Password in URL',
      pattern: /[a-zA-Z]+:\/\/[^:]+:[^@]+@/g,
      severity: 'high',
      description: 'URL with embedded credentials'
    },
    {
      name: 'Email/Password',
      pattern: /[pP][aA][sS][sS][wW][oO][rR][dD]\s*[:=]\s*["']?[^\s"']+["']?/g,
      severity: 'medium',
      description: 'Hardcoded password'
    },
    {
      name: 'Credit Card',
      pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
      severity: 'critical',
      description: 'Credit card number'
    },
    {
      name: 'Social Security Number',
      pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
      severity: 'critical',
      description: 'US Social Security Number'
    }
  ];

  // 파일 암호화
  async encryptFile(filePath: string, options: EncryptionOptions): Promise<{
    encryptedPath: string;
    salt: string;
    iv: string;
  }> {
    const absolutePath = path.resolve(filePath);
    const outputPath = options.outputPath || `${absolutePath}.enc`;

    // 키 파생
    const salt = randomBytes(this.saltLength);
    const key = await scryptAsync(options.password, salt, this.keyLength) as Buffer;
    
    // IV 생성
    const iv = randomBytes(this.ivLength);
    
    // 암호화 스트림 생성
    const cipher = createCipheriv(options.algorithm || this.algorithm, key, iv);
    const input = createReadStream(absolutePath);
    const output = createWriteStream(outputPath);

    // 헤더 작성 (salt + iv)
    output.write(salt);
    output.write(iv);

    // 파일 암호화
    await pipeline(input, cipher, output);

    return {
      encryptedPath: outputPath,
      salt: salt.toString('hex'),
      iv: iv.toString('hex')
    };
  }

  // 파일 복호화
  async decryptFile(encryptedPath: string, password: string, outputPath?: string): Promise<{
    decryptedPath: string;
  }> {
    const absolutePath = path.resolve(encryptedPath);
    const decryptedPath = outputPath || absolutePath.replace(/\.enc$/, '');

    // 암호화된 파일 읽기
    const fileContent = await fs.readFile(absolutePath);
    
    // 헤더 추출 (salt + iv)
    const salt = fileContent.slice(0, this.saltLength);
    const iv = fileContent.slice(this.saltLength, this.saltLength + this.ivLength);
    const encrypted = fileContent.slice(this.saltLength + this.ivLength);

    // 키 파생
    const key = await scryptAsync(password, salt, this.keyLength) as Buffer;

    // 복호화
    const decipher = createDecipheriv(this.algorithm, key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    // 파일 쓰기
    await fs.writeFile(decryptedPath, decrypted);

    return { decryptedPath };
  }

  // 디렉토리 암호화
  async encryptDirectory(dirPath: string, password: string): Promise<{
    encryptedFiles: string[];
    errors: Array<{ file: string; error: string }>;
  }> {
    const encryptedFiles: string[] = [];
    const errors: Array<{ file: string; error: string }> = [];

    const { glob } = await import('glob');
    const files = await glob('**/*', {
      cwd: path.resolve(dirPath),
      ignore: ['**/*.enc'],
      absolute: true,
      nodir: true
    });

    for (const file of files) {
      try {
        const result = await this.encryptFile(file, { password });
        encryptedFiles.push(result.encryptedPath);
        
        // 원본 파일 삭제 (옵션)
        await fs.unlink(file);
      } catch (error: any) {
        errors.push({ file, error: error.message });
      }
    }

    return { encryptedFiles, errors };
  }

  // 민감 정보 스캔
  async scanSecrets(directory: string, options?: {
    filePatterns?: string[];
    exclude?: string[];
    customPatterns?: SecretPattern[];
  }): Promise<{
    results: SecretScanResult[];
    summary: {
      total: number;
      bySeverity: Record<string, number>;
      byType: Record<string, number>;
    };
  }> {
    const results: SecretScanResult[] = [];
    const patterns = [...this.secretPatterns, ...(options?.customPatterns || [])];

    const { glob } = await import('glob');
    const filePatterns = options?.filePatterns || ['**/*'];
    const excludePatterns = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/*.enc',
      ...(options?.exclude || [])
    ];

    // 파일 찾기
    const files: string[] = [];
    for (const pattern of filePatterns) {
      const matches = await glob(pattern, {
        cwd: path.resolve(directory),
        ignore: excludePatterns,
        absolute: true,
        nodir: true
      });
      files.push(...matches);
    }

    // 각 파일 스캔
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, lineIndex) => {
          patterns.forEach(pattern => {
            const matches = [...line.matchAll(pattern.pattern)];
            
            matches.forEach(match => {
              // 화이트리스트 체크
              if (this.isWhitelisted(match[0], line)) {
                return;
              }
              
              // 파일 경로 필터링 (import 문, require 문 등)
              if (this.isFilePathContext(line)) {
                return;
              }
              
              // 일부 내용 마스킹
              const masked = this.maskSecret(match[0]);
              
              results.push({
                file,
                line: lineIndex + 1,
                column: match.index || 0,
                type: pattern.name,
                severity: pattern.severity,
                match: masked,
                context: line.trim()
              });
            });
          });
        });
      } catch (error) {
        // 읽을 수 없는 파일은 스킵
      }
    }

    // 요약 생성
    const summary = {
      total: results.length,
      bySeverity: {} as Record<string, number>,
      byType: {} as Record<string, number>
    };

    results.forEach(result => {
      summary.bySeverity[result.severity] = (summary.bySeverity[result.severity] || 0) + 1;
      summary.byType[result.type] = (summary.byType[result.type] || 0) + 1;
    });

    return { results, summary };
  }

  // 비밀 마스킹
  private maskSecret(secret: string): string {
    if (secret.length <= 8) {
      return '*'.repeat(secret.length);
    }
    
    const visibleLength = Math.min(4, Math.floor(secret.length / 4));
    const start = secret.substring(0, visibleLength);
    const end = secret.substring(secret.length - visibleLength);
    const masked = '*'.repeat(secret.length - visibleLength * 2);
    
    return `${start}${masked}${end}`;
  }

  // 안전한 파일 삭제 (덮어쓰기)
  async secureDelete(filePath: string, passes: number = 3): Promise<void> {
    const absolutePath = path.resolve(filePath);
    const stats = await fs.stat(absolutePath);
    const fileSize = stats.size;

    // 여러 번 덮어쓰기
    for (let pass = 0; pass < passes; pass++) {
      const pattern = pass % 3 === 0 ? 0x00 : pass % 3 === 1 ? 0xFF : 0xAA;
      const buffer = Buffer.alloc(fileSize, pattern);
      
      await fs.writeFile(absolutePath, buffer);
    }

    // 최종적으로 랜덤 데이터로 덮어쓰기
    const randomData = randomBytes(fileSize);
    await fs.writeFile(absolutePath, randomData);

    // 파일 삭제
    await fs.unlink(absolutePath);
  }

  // 파일 권한 강화
  async hardenPermissions(filePath: string, type: 'private' | 'readonly' | 'executable'): Promise<void> {
    const modes = {
      private: 0o600,    // rw-------
      readonly: 0o400,   // r--------
      executable: 0o700  // rwx------
    };

    await fs.chmod(filePath, modes[type]);
  }

  // 보안 감사 보고서 생성
  async generateSecurityAudit(directory: string): Promise<{
    report: string;
    score: number;
    recommendations: string[];
  }> {
    const scanResult = await this.scanSecrets(directory);
    const recommendations: string[] = [];
    
    // 점수 계산 (100점 만점)
    let score = 100;
    score -= scanResult.summary.bySeverity['critical'] ? scanResult.summary.bySeverity['critical'] * 20 : 0;
    score -= scanResult.summary.bySeverity['high'] ? scanResult.summary.bySeverity['high'] * 10 : 0;
    score -= scanResult.summary.bySeverity['medium'] ? scanResult.summary.bySeverity['medium'] * 5 : 0;
    score -= scanResult.summary.bySeverity['low'] ? scanResult.summary.bySeverity['low'] * 2 : 0;
    score = Math.max(0, score);

    // 권장사항 생성
    if (scanResult.summary.bySeverity['critical'] > 0) {
      recommendations.push('⚠️ CRITICAL: Remove all hardcoded credentials immediately');
      recommendations.push('Use environment variables or secure vaults for sensitive data');
    }

    if (scanResult.summary.byType['Private Key'] > 0) {
      recommendations.push('Move private keys to secure key management systems');
      recommendations.push('Never commit private keys to version control');
    }

    if (scanResult.summary.byType['Database URL'] > 0) {
      recommendations.push('Use connection pooling with encrypted credentials');
      recommendations.push('Implement database access through secure APIs');
    }

    // 일반 권장사항
    recommendations.push('Implement pre-commit hooks to scan for secrets');
    recommendations.push('Use .gitignore to exclude sensitive files');
    recommendations.push('Regularly rotate all credentials and tokens');
    recommendations.push('Enable audit logging for all sensitive operations');

    // 보고서 생성
    const report = `
Security Audit Report
====================
Directory: ${directory}
Date: ${new Date().toISOString()}
Score: ${score}/100

Summary
-------
Total Issues Found: ${scanResult.summary.total}

By Severity:
${Object.entries(scanResult.summary.bySeverity)
  .map(([sev, count]) => `- ${sev.toUpperCase()}: ${count}`)
  .join('\n')}

By Type:
${Object.entries(scanResult.summary.byType)
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}

Top Issues:
${scanResult.results.slice(0, 10)
  .map(r => `- [${r.severity.toUpperCase()}] ${r.type} in ${r.file}:${r.line}`)
  .join('\n')}

Recommendations:
${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
`;

    return { report, score, recommendations };
  }

  // 패턴 추가
  addSecretPattern(pattern: SecretPattern): void {
    this.secretPatterns.push(pattern);
  }

  // 화이트리스트 체크 (false positive 방지)
  private isWhitelisted(match: string, context: string): boolean {
    const whitelist = [
      /example\.com/i,
      /test/i,
      /demo/i,
      /sample/i,
      /placeholder/i,
      /xxxx/i,
      /\*{4,}/,
      /fake/i,
      /dummy/i,
      /mock/i
    ];

    return whitelist.some(pattern => pattern.test(match) || pattern.test(context));
  }

  // 파일 경로 컨텍스트 체크
  private isFilePathContext(line: string): boolean {
    const filePathPatterns = [
      /^\s*import\s+/i,
      /^\s*require\s*\(/i,
      /^\s*from\s+["']/i,
      /\.tsx?["']/i,
      /\.jsx?["']/i,
      /\.vue["']/i,
      /src\/[a-zA-Z0-9/_-]+/,
      /tests?\/[a-zA-Z0-9/_-]+/,
      /node_modules/i,
      /\/\/ @ts-/i,
      /\/\* eslint/i
    ];

    return filePathPatterns.some(pattern => pattern.test(line.trim()));
  }
}