# Security Policy

AI FileSystem MCP takes security seriously. This document outlines our security policies, vulnerability reporting process, and security best practices.

## 🛡️ Security Features

### Multi-Level Security Model

AI FileSystem MCP implements a **three-tier security model**:

#### 1. Strict Mode (Production)
- **File Access**: Limited to current working directory only
- **Shell Execution**: Completely disabled
- **File Size Limits**: Maximum 1MB per operation
- **Path Validation**: Extensive path traversal protection
- **Command Filtering**: Only whitelisted MCP commands allowed

#### 2. Moderate Mode (Default)
- **File Access**: Limited to project boundaries with validation
- **Shell Execution**: Safe commands only (git, npm, basic utilities)
- **File Size Limits**: Maximum 10MB per operation
- **Path Validation**: Standard path traversal protection
- **Command Filtering**: Most MCP commands allowed with validation

#### 3. Permissive Mode (Development)
- **File Access**: Broader file system access with basic validation
- **Shell Execution**: Most shell commands allowed
- **File Size Limits**: Maximum 100MB per operation
- **Path Validation**: Basic path validation
- **Command Filtering**: All MCP commands allowed

### Built-in Security Mechanisms

#### Input Validation
```typescript
// All commands implement strict input validation
validateArgs(args: any): ValidationResult {
  const errors: string[] = [];
  
  // Path validation
  if (!this.validatePath(args.path)) {
    errors.push('Invalid file path');
  }
  
  // Path traversal protection
  if (this.containsPathTraversal(args.path)) {
    errors.push('Path traversal attack detected');
  }
  
  // Size limits
  if (args.size && args.size > this.maxFileSize) {
    errors.push('File size exceeds limit');
  }
  
  return { valid: errors.length === 0, errors };
}
```

#### File System Protection
- **Sandboxed Operations**: All file operations are contained within allowed directories
- **Atomic Operations**: File operations use transactions to prevent partial writes
- **Backup Creation**: Automatic backups for destructive operations
- **Permission Checks**: Validate file permissions before operations

#### Shell Command Security
```typescript
class ShellExecutionService {
  private readonly securityLevel: SecurityLevel;
  private readonly allowedCommands = new Set([
    'git', 'npm', 'node', 'ls', 'cat', 'grep', 'find'
  ]);
  
  async executeCommand(command: string): Promise<string> {
    // Security level check
    if (this.securityLevel === 'strict') {
      throw new Error('Shell execution disabled in strict mode');
    }
    
    // Command validation
    const baseCommand = command.split(' ')[0];
    if (!this.allowedCommands.has(baseCommand)) {
      throw new Error(`Command '${baseCommand}' not allowed`);
    }
    
    // Injection protection
    if (this.containsMaliciousPatterns(command)) {
      throw new Error('Potentially malicious command detected');
    }
    
    return await this.safeExecution(command);
  }
}
```

## 🔍 Security Scanning

### Automated Security Scanning

Our security scanner checks for:

1. **Dependency Vulnerabilities**
   - CVE database scanning
   - Outdated package detection
   - License compliance checking

2. **Code Security Issues**
   - Injection vulnerabilities (SQL, Command, XSS)
   - Path traversal vulnerabilities
   - Hardcoded secrets detection
   - Insecure cryptographic usage

3. **Secret Detection**
   - API keys and tokens
   - Database credentials
   - Private keys and certificates
   - Cloud service credentials

### Running Security Scans

```bash
# Comprehensive security scan
npm run security:scan

# Dependency audit only
npm audit

# Secret scanning
npm run security:secrets

# Generate detailed security report
npx tsx scripts/security/SecurityScanner.ts
```

### Security Report Example

The security scanner generates comprehensive reports including:

```markdown
# Security Scan Report

## Summary
| Category | Status | Details |
|----------|--------|---------|
| Dependencies | ✅ Clean | 0 vulnerabilities |
| Code Security | ⚠️ Issues Found | 3 issues in 2 files |
| Secrets | ✅ Clean | 0 potential secrets |
| Licenses | ✅ Compliant | 156 packages scanned |

## Code Security Issues
- **Warning**: Potential path traversal in src/core/FileService.ts:42
- **Info**: Insecure random usage in src/utils/id.ts:15
```

## 🚨 Vulnerability Reporting

### Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | ✅ Active support |
| 1.x.x   | ⚠️ Security fixes only |

### Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them responsibly:

#### Option 1: GitHub Security Advisories (Preferred)
1. Go to the [Security Advisories](https://github.com/your-org/ai-filesystem-mcp/security/advisories) page
2. Click "Report a vulnerability"
3. Fill out the form with vulnerability details

#### Option 2: Email
Send vulnerability reports to: **security@ai-filesystem-mcp.dev**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if available)

### Response Timeline

| Timeframe | Action |
|-----------|--------|
| 24 hours | Acknowledgment of report |
| 7 days | Initial assessment and triage |
| 30 days | Fix development and testing |
| Release | Security patch deployment |

### Security Advisory Process

1. **Validation**: We validate the reported vulnerability
2. **Assessment**: We assess the severity and impact
3. **Development**: We develop and test a fix
4. **Coordination**: We coordinate disclosure with reporter
5. **Release**: We release the security patch
6. **Disclosure**: We publish a security advisory

## 🔐 Security Best Practices

### For Users

#### Configuration Security
```json
{
  "security": {
    "level": "moderate",
    "allowShellExecution": false,
    "maxFileSize": "10MB",
    "allowedPaths": ["./src", "./docs"],
    "deniedPaths": ["/etc", "/var", "~/.ssh"]
  }
}
```

#### Environment Variables
```bash
# Never hardcode secrets - use environment variables
export MCP_API_KEY="your-api-key"
export MCP_DATABASE_URL="your-database-url"

# Set appropriate security level
export MCP_SECURITY_LEVEL="moderate"
```

#### File System Security
- Always validate file paths before operations
- Use absolute paths when possible
- Never trust user input without validation
- Implement proper error handling

### For Developers

#### Secure Coding Guidelines

1. **Input Validation**
   ```typescript
   // Always validate inputs
   if (!isValidPath(userPath)) {
     throw new SecurityError('Invalid path provided');
   }
   ```

2. **Path Traversal Prevention**
   ```typescript
   // Resolve and validate paths
   const safePath = path.resolve(basePath, userPath);
   if (!safePath.startsWith(basePath)) {
     throw new SecurityError('Path traversal detected');
   }
   ```

3. **Command Injection Prevention**
   ```typescript
   // Use parameterized commands
   const args = ['status', '--porcelain'];
   await execFile('git', args, { cwd: repoPath });
   ```

4. **Secret Management**
   ```typescript
   // Use environment variables
   const apiKey = process.env.API_KEY;
   if (!apiKey) {
     throw new Error('API_KEY environment variable required');
   }
   ```

#### Security Testing

1. **Unit Tests**
   ```typescript
   describe('Security Validation', () => {
     it('should reject path traversal attempts', () => {
       expect(() => validatePath('../../../etc/passwd')).toThrow();
     });
   });
   ```

2. **Integration Tests**
   ```typescript
   describe('File Operations Security', () => {
     it('should prevent access outside allowed directories', async () => {
       await expect(fileService.readFile('/etc/passwd')).rejects.toThrow();
     });
   });
   ```

## 🛠️ Security Infrastructure

### Dependency Management

```json
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "deps:check": "npm outdated",
    "deps:update": "npm update"
  }
}
```

### Automated Security Checks

Our CI/CD pipeline includes:

- **Dependency Scanning**: Automated vulnerability scanning on every commit
- **Secret Detection**: Prevents commits containing secrets
- **Code Analysis**: Static analysis for security issues
- **License Compliance**: Ensures license compatibility

### Security Monitoring

Production deployments include:

- **Real-time Monitoring**: Security event logging and alerting
- **Anomaly Detection**: Unusual pattern detection
- **Access Logging**: Comprehensive audit trails
- **Incident Response**: Automated response to security events

## 📋 Security Checklist

### Pre-Release Security Review

- [ ] All dependencies updated and audited
- [ ] Security scan completed with no critical issues
- [ ] Code review completed by security team
- [ ] Penetration testing completed (major releases)
- [ ] Documentation updated with security considerations

### Deployment Security

- [ ] Environment variables properly configured
- [ ] Security level appropriate for environment
- [ ] Access controls properly configured
- [ ] Monitoring and logging enabled
- [ ] Backup and recovery procedures tested

### Ongoing Security

- [ ] Regular security scans scheduled
- [ ] Dependency updates automated
- [ ] Security training completed by team
- [ ] Incident response plan updated
- [ ] Security documentation current

## 📚 Security Resources

### Documentation
- [Security Architecture](../developer-guide/security-architecture.md)
- [Deployment Security Guide](../deployment/security.md)
- [API Security Reference](../api/security.md)

### Tools
- [Security Scanner](../../scripts/security/SecurityScanner.ts)
- [Vulnerability Database](https://nvd.nist.gov/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### Contact
- **Security Team**: security@ai-filesystem-mcp.dev
- **General Support**: support@ai-filesystem-mcp.dev
- **Community**: [GitHub Discussions](https://github.com/your-org/ai-filesystem-mcp/discussions)

---

**Remember**: Security is a shared responsibility. Users, developers, and the community all play a role in maintaining the security of AI FileSystem MCP.