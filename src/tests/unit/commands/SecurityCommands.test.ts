import { EncryptFileCommand } from '../../../commands/implementations/security/EncryptFileCommand';
import { DecryptFileCommand } from '../../../commands/implementations/security/DecryptFileCommand';
import { ScanSecretsCommand } from '../../../commands/implementations/security/ScanSecretsCommand';
import { SecurityAuditCommand } from '../../../commands/implementations/security/SecurityAuditCommand';
import { ServiceContainer } from '../../../core/ServiceContainer';
import { SecurityService } from '../../../core/services/security/SecurityService';
import * as fs from 'fs/promises';

// Mock file system
jest.mock('fs/promises');

describe('Security Commands', () => {
  let container: ServiceContainer;
  let mockSecurityService: jest.Mocked<SecurityService>;

  beforeEach(async () => {
    container = new ServiceContainer();
    
    // Create mock security service
    mockSecurityService = {
      encryptFile: jest.fn(),
      decryptFile: jest.fn(),
      scanSecrets: jest.fn(),
      auditSecurity: jest.fn(),
      validateSecurityLevel: jest.fn(),
      initialize: jest.fn(),
      dispose: jest.fn(),
    } as any;

    container.register('securityService', mockSecurityService);
  });

  afterEach(async () => {
    await container.dispose();
    jest.clearAllMocks();
  });

  describe('EncryptFileCommand', () => {
    let command: EncryptFileCommand;

    beforeEach(() => {
      command = new EncryptFileCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('encrypt_file');
      expect(schema.description).toContain('Encrypt a file');
      expect(schema.inputSchema.properties).toHaveProperty('filePath');
      expect(schema.inputSchema.properties).toHaveProperty('password');
    });

    it('should validate required arguments', () => {
      const result = command.validateArgs({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File path is required');
      expect(result.errors).toContain('Password is required');
    });

    it('should validate password strength', () => {
      const weakPassword = command.validateArgs({
        filePath: '/test/file.txt',
        password: '123'
      });
      expect(weakPassword.isValid).toBe(false);
      expect(weakPassword.errors).toContain('Password must be at least 8 characters long');

      const strongPassword = command.validateArgs({
        filePath: '/test/file.txt',
        password: 'StrongPassword123!'
      });
      expect(strongPassword.isValid).toBe(true);
    });

    it('should execute encryption successfully', async () => {
      const args = {
        filePath: '/test/secret.txt',
        password: 'StrongPassword123!',
        algorithm: 'aes-256-gcm'
      };

      const mockResult = {
        encryptedPath: '/test/secret.txt.enc',
        algorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2'
      };

      mockSecurityService.encryptFile.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockSecurityService.encryptFile).toHaveBeenCalledWith(
        '/test/secret.txt',
        'StrongPassword123!',
        'aes-256-gcm'
      );
      expect(result.content[0].text).toContain('File encrypted successfully');
      expect(result.content[0].text).toContain('/test/secret.txt.enc');
    });

    it('should handle encryption errors', async () => {
      const args = {
        filePath: '/test/nonexistent.txt',
        password: 'StrongPassword123!'
      };

      mockSecurityService.encryptFile.mockRejectedValue(new Error('File not found'));

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File not found');
    });
  });

  describe('DecryptFileCommand', () => {
    let command: DecryptFileCommand;

    beforeEach(() => {
      command = new DecryptFileCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('decrypt_file');
      expect(schema.description).toContain('Decrypt a file');
      expect(schema.inputSchema.properties).toHaveProperty('filePath');
      expect(schema.inputSchema.properties).toHaveProperty('password');
    });

    it('should validate required arguments', () => {
      const result = command.validateArgs({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File path is required');
      expect(result.errors).toContain('Password is required');
    });

    it('should execute decryption successfully', async () => {
      const args = {
        filePath: '/test/secret.txt.enc',
        password: 'StrongPassword123!',
        outputPath: '/test/secret_decrypted.txt'
      };

      const mockResult = {
        decryptedPath: '/test/secret_decrypted.txt',
        originalSize: 1024,
        algorithm: 'aes-256-gcm'
      };

      mockSecurityService.decryptFile.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockSecurityService.decryptFile).toHaveBeenCalledWith(
        '/test/secret.txt.enc',
        'StrongPassword123!',
        '/test/secret_decrypted.txt'
      );
      expect(result.content[0].text).toContain('File decrypted successfully');
      expect(result.content[0].text).toContain('/test/secret_decrypted.txt');
    });

    it('should handle wrong password', async () => {
      const args = {
        filePath: '/test/secret.txt.enc',
        password: 'WrongPassword'
      };

      mockSecurityService.decryptFile.mockRejectedValue(new Error('Invalid password'));

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid password');
    });
  });

  describe('ScanSecretsCommand', () => {
    let command: ScanSecretsCommand;

    beforeEach(() => {
      command = new ScanSecretsCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('scan_secrets');
      expect(schema.description).toContain('Scan for secrets');
      expect(schema.inputSchema.properties).toHaveProperty('directory');
    });

    it('should validate arguments correctly', () => {
      const validArgs = {
        directory: '/test'
      };
      
      const result = command.validateArgs(validArgs);
      expect(result.isValid).toBe(true);
    });

    it('should execute secret scan successfully', async () => {
      const args = {
        directory: '/test/project',
        filePattern: '*.{js,ts,json}',
        excludePatterns: ['node_modules/', '.git/']
      };

      const mockResults = {
        totalFiles: 50,
        scannedFiles: 45,
        secrets: [
          {
            file: '/test/project/config.js',
            line: 10,
            type: 'api_key',
            description: 'Potential API key detected',
            severity: 'high' as const,
            pattern: 'API_KEY=...'
          },
          {
            file: '/test/project/database.ts',
            line: 25,
            type: 'password',
            description: 'Hardcoded password detected',
            severity: 'critical' as const,
            pattern: 'password=...'
          }
        ],
        summary: {
          critical: 1,
          high: 1,
          medium: 0,
          low: 0
        }
      };

      mockSecurityService.scanSecrets.mockResolvedValue(mockResults);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockSecurityService.scanSecrets).toHaveBeenCalledWith(
        '/test/project',
        {
          filePattern: '*.{js,ts,json}',
          excludePatterns: ['node_modules/', '.git/']
        }
      );
      expect(result.content[0].text).toContain('Found 2 potential secrets');
      expect(result.content[0].text).toContain('Critical: 1');
      expect(result.content[0].text).toContain('config.js:10');
      expect(result.content[0].text).toContain('API key');
    });

    it('should handle clean scan results', async () => {
      const args = {
        directory: '/test/clean-project'
      };

      const mockResults = {
        totalFiles: 20,
        scannedFiles: 20,
        secrets: [],
        summary: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        }
      };

      mockSecurityService.scanSecrets.mockResolvedValue(mockResults);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('No secrets detected');
      expect(result.content[0].text).toContain('Scanned 20 files');
    });
  });

  describe('SecurityAuditCommand', () => {
    let command: SecurityAuditCommand;

    beforeEach(() => {
      command = new SecurityAuditCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('security_audit');
      expect(schema.description).toContain('security audit');
      expect(schema.inputSchema.properties).toHaveProperty('directory');
    });

    it('should execute comprehensive security audit', async () => {
      const args = {
        directory: '/test/project',
        includeSecrets: true,
        includeDependencies: true,
        includePermissions: true
      };

      const mockResults = {
        timestamp: new Date().toISOString(),
        directory: '/test/project',
        summary: {
          totalIssues: 3,
          critical: 1,
          high: 1,
          medium: 1,
          low: 0
        },
        secrets: {
          found: 2,
          files: ['/test/project/config.js', '/test/project/env.local']
        },
        dependencies: {
          total: 100,
          vulnerabilities: {
            critical: 0,
            high: 1,
            medium: 0,
            low: 0
          }
        },
        permissions: {
          issues: [
            {
              path: '/test/project/private.key',
              issue: 'World readable private key',
              severity: 'critical' as const,
              permissions: '644'
            }
          ]
        },
        recommendations: [
          'Remove hardcoded secrets from source code',
          'Update vulnerable dependencies',
          'Fix file permissions on sensitive files'
        ]
      };

      mockSecurityService.auditSecurity.mockResolvedValue(mockResults);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockSecurityService.auditSecurity).toHaveBeenCalledWith(
        '/test/project',
        {
          includeSecrets: true,
          includeDependencies: true,
          includePermissions: true
        }
      );
      expect(result.content[0].text).toContain('Security Audit Report');
      expect(result.content[0].text).toContain('Total Issues: 3');
      expect(result.content[0].text).toContain('Critical: 1');
      expect(result.content[0].text).toContain('Secrets found: 2');
      expect(result.content[0].text).toContain('World readable private key');
    });

    it('should handle audit with minimal issues', async () => {
      const args = {
        directory: '/test/secure-project'
      };

      const mockResults = {
        timestamp: new Date().toISOString(),
        directory: '/test/secure-project',
        summary: {
          totalIssues: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        secrets: {
          found: 0,
          files: []
        },
        dependencies: {
          total: 50,
          vulnerabilities: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
          }
        },
        permissions: {
          issues: []
        },
        recommendations: []
      };

      mockSecurityService.auditSecurity.mockResolvedValue(mockResults);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('No security issues found');
      expect(result.content[0].text).toContain('Project appears secure');
    });
  });
});