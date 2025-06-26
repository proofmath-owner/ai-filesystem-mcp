import { SecurityService } from '../../../core/services/security/SecurityService';
import { EncryptionService } from '../../../core/services/security/EncryptionService';
import { SecretScanner } from '../../../core/services/security/SecretScanner';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('crypto');

describe('SecurityService', () => {
  let securityService: SecurityService;
  let mockEncryptionService: jest.Mocked<EncryptionService>;
  let mockSecretScanner: jest.Mocked<SecretScanner>;

  beforeEach(() => {
    mockEncryptionService = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
      generateSalt: jest.fn(),
    } as any;

    mockSecretScanner = {
      scanDirectory: jest.fn(),
      scanFile: jest.fn(),
      getPatterns: jest.fn(),
    } as any;

    securityService = new SecurityService();
    (securityService as any).encryptionService = mockEncryptionService;
    (securityService as any).secretScanner = mockSecretScanner;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('File Encryption', () => {
    it('should encrypt file successfully', async () => {
      const filePath = '/test/secret.txt';
      const password = 'strongPassword123!';
      const algorithm = 'aes-256-gcm';

      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('secret content'));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      mockEncryptionService.encrypt.mockResolvedValue({
        encrypted: Buffer.from('encrypted content'),
        iv: Buffer.from('initialization vector'),
        tag: Buffer.from('auth tag')
      });

      const result = await securityService.encryptFile(filePath, password, algorithm);

      expect(fs.readFile).toHaveBeenCalledWith(filePath);
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
        Buffer.from('secret content'),
        password,
        algorithm
      );
      expect(result.encryptedPath).toBe(`${filePath}.enc`);
      expect(result.algorithm).toBe(algorithm);
    });

    it('should handle file not found error', async () => {
      const filePath = '/test/nonexistent.txt';
      const password = 'password123';

      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT: no such file or directory'));

      await expect(securityService.encryptFile(filePath, password))
        .rejects.toThrow('no such file or directory');
    });

    it('should validate password strength', async () => {
      const filePath = '/test/file.txt';
      const weakPassword = '123';

      await expect(securityService.encryptFile(filePath, weakPassword))
        .rejects.toThrow('Password must be at least 8 characters long');
    });
  });

  describe('File Decryption', () => {
    it('should decrypt file successfully', async () => {
      const encryptedPath = '/test/secret.txt.enc';
      const password = 'strongPassword123!';
      const outputPath = '/test/secret_decrypted.txt';

      const mockEncryptedData = {
        encrypted: Buffer.from('encrypted content'),
        iv: Buffer.from('initialization vector'),
        tag: Buffer.from('auth tag'),
        algorithm: 'aes-256-gcm'
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockEncryptedData));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      mockEncryptionService.decrypt.mockResolvedValue(Buffer.from('decrypted content'));

      const result = await securityService.decryptFile(encryptedPath, password, outputPath);

      expect(fs.readFile).toHaveBeenCalledWith(encryptedPath, 'utf8');
      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
        mockEncryptedData.encrypted,
        password,
        mockEncryptedData.algorithm,
        mockEncryptedData.iv,
        mockEncryptedData.tag
      );
      expect(result.decryptedPath).toBe(outputPath);
    });

    it('should handle invalid encrypted file format', async () => {
      const encryptedPath = '/test/invalid.enc';
      const password = 'password123';

      (fs.readFile as jest.Mock).mockResolvedValue('invalid json');

      await expect(securityService.decryptFile(encryptedPath, password))
        .rejects.toThrow('Invalid encrypted file format');
    });

    it('should handle decryption failure', async () => {
      const encryptedPath = '/test/secret.txt.enc';
      const password = 'wrongPassword';

      const mockEncryptedData = {
        encrypted: Buffer.from('encrypted content'),
        iv: Buffer.from('initialization vector'),
        tag: Buffer.from('auth tag'),
        algorithm: 'aes-256-gcm'
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockEncryptedData));
      mockEncryptionService.decrypt.mockRejectedValue(new Error('Authentication failed'));

      await expect(securityService.decryptFile(encryptedPath, password))
        .rejects.toThrow('Authentication failed');
    });
  });

  describe('Secret Scanning', () => {
    it('should scan directory for secrets', async () => {
      const directory = '/test/project';
      const options = {
        filePattern: '*.{js,ts}',
        excludePatterns: ['node_modules/']
      };

      const mockScanResult = {
        totalFiles: 10,
        scannedFiles: 8,
        secrets: [
          {
            file: '/test/project/config.js',
            line: 5,
            type: 'api_key',
            description: 'API key detected',
            severity: 'high' as const,
            pattern: 'API_KEY=sk-...'
          }
        ]
      };

      mockSecretScanner.scanDirectory.mockResolvedValue(mockScanResult);

      const result = await securityService.scanSecrets(directory, options);

      expect(mockSecretScanner.scanDirectory).toHaveBeenCalledWith(directory, options);
      expect(result.secrets).toHaveLength(1);
      expect(result.summary.high).toBe(1);
      expect(result.summary.critical).toBe(0);
    });

    it('should categorize secrets by severity', async () => {
      const directory = '/test/project';
      
      const mockScanResult = {
        totalFiles: 5,
        scannedFiles: 5,
        secrets: [
          {
            file: '/test/project/api.js',
            line: 1,
            type: 'api_key',
            description: 'API key',
            severity: 'critical' as const,
            pattern: 'sk-...'
          },
          {
            file: '/test/project/db.js',
            line: 2,
            type: 'password',
            description: 'Password',
            severity: 'high' as const,
            pattern: 'password=...'
          },
          {
            file: '/test/project/token.js',
            line: 3,
            type: 'token',
            description: 'Token',
            severity: 'medium' as const,
            pattern: 'token=...'
          }
        ]
      };

      mockSecretScanner.scanDirectory.mockResolvedValue(mockScanResult);

      const result = await securityService.scanSecrets(directory);

      expect(result.summary.critical).toBe(1);
      expect(result.summary.high).toBe(1);
      expect(result.summary.medium).toBe(1);
      expect(result.summary.low).toBe(0);
    });
  });

  describe('Security Audit', () => {
    it('should perform comprehensive security audit', async () => {
      const directory = '/test/project';
      const options = {
        includeSecrets: true,
        includeDependencies: true,
        includePermissions: true
      };

      // Mock secret scanning
      mockSecretScanner.scanDirectory.mockResolvedValue({
        totalFiles: 20,
        scannedFiles: 18,
        secrets: [
          {
            file: '/test/project/config.js',
            line: 5,
            type: 'api_key',
            description: 'API key detected',
            severity: 'high' as const,
            pattern: 'API_KEY=sk-...'
          }
        ]
      });

      // Mock file stats for permissions check
      (fs.stat as jest.Mock).mockResolvedValue({
        mode: 0o644,
        isFile: () => true,
        isDirectory: () => false
      });

      const result = await securityService.auditSecurity(directory, options);

      expect(result.directory).toBe(directory);
      expect(result.summary.totalIssues).toBeGreaterThan(0);
      expect(result.secrets.found).toBe(1);
      expect(result.recommendations).toContain('Remove hardcoded secrets from source code');
    });

    it('should handle clean project audit', async () => {
      const directory = '/test/clean-project';

      mockSecretScanner.scanDirectory.mockResolvedValue({
        totalFiles: 10,
        scannedFiles: 10,
        secrets: []
      });

      (fs.stat as jest.Mock).mockResolvedValue({
        mode: 0o600,
        isFile: () => true,
        isDirectory: () => false
      });

      const result = await securityService.auditSecurity(directory);

      expect(result.summary.totalIssues).toBe(0);
      expect(result.secrets.found).toBe(0);
      expect(result.recommendations).toHaveLength(0);
    });
  });

  describe('Security Level Validation', () => {
    it('should validate strict security level', () => {
      const result = securityService.validateSecurityLevel('strict');
      expect(result.isValid).toBe(true);
      expect(result.level).toBe('strict');
    });

    it('should validate moderate security level', () => {
      const result = securityService.validateSecurityLevel('moderate');
      expect(result.isValid).toBe(true);
      expect(result.level).toBe('moderate');
    });

    it('should validate permissive security level', () => {
      const result = securityService.validateSecurityLevel('permissive');
      expect(result.isValid).toBe(true);
      expect(result.level).toBe('permissive');
    });

    it('should reject invalid security level', () => {
      const result = securityService.validateSecurityLevel('invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid security level');
    });

    it('should default to moderate for undefined level', () => {
      const result = securityService.validateSecurityLevel(undefined);
      expect(result.isValid).toBe(true);
      expect(result.level).toBe('moderate');
    });
  });

  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'StrongPassword123!',
        'MySecure&Pass2024',
        'Complex#Password$99'
      ];

      strongPasswords.forEach(password => {
        const result = securityService.validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.strength).toBe('strong');
      });
    });

    it('should validate medium strength passwords', () => {
      const mediumPasswords = [
        'Password123',
        'MyPassword2024',
        'SecurePass99'
      ];

      mediumPasswords.forEach(password => {
        const result = securityService.validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.strength).toBe('medium');
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        '12345678',
        'qwerty'
      ];

      weakPasswords.forEach(password => {
        const result = securityService.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.strength).toBe('weak');
      });
    });

    it('should provide specific validation errors', () => {
      const result = securityService.validatePassword('123');
      expect(result.errors).toContain('Password must be at least 8 characters long');

      const result2 = securityService.validatePassword('12345678');
      expect(result2.errors).toContain('Password must contain letters');

      const result3 = securityService.validatePassword('onlyletters');
      expect(result3.errors).toContain('Password must contain numbers');
    });
  });
});