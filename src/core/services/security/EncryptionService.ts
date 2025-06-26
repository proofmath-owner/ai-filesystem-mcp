import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private saltLength = 32;
  private ivLength = 16;
  private tagLength = 16;
  private pbkdf2Iterations = 100000;

  async encryptFile(filePath: string, password: string, outputPath?: string): Promise<string> {
    const content = await fs.readFile(filePath);
    const encrypted = await this.encrypt(content, password);
    
    const encryptedPath = outputPath || filePath + '.encrypted';
    await fs.writeFile(encryptedPath, encrypted);
    
    return encryptedPath;
  }

  async decryptFile(encryptedPath: string, password: string, outputPath?: string): Promise<string> {
    const encryptedContent = await fs.readFile(encryptedPath);
    const decrypted = await this.decrypt(encryptedContent, password);
    
    const decryptedPath = outputPath || encryptedPath.replace('.encrypted', '');
    await fs.writeFile(decryptedPath, decrypted);
    
    return decryptedPath;
  }

  private async encrypt(data: Buffer, password: string): Promise<Buffer> {
    // Generate salt
    const salt = crypto.randomBytes(this.saltLength);
    
    // Derive key from password
    const key = await this.deriveKey(password, salt);
    
    // Generate IV
    const iv = crypto.randomBytes(this.ivLength);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    // Get auth tag
    const authTag = (cipher as any).getAuthTag();
    
    // Combine salt, iv, authTag, and encrypted data
    return Buffer.concat([
      salt,
      iv,
      authTag,
      encrypted
    ]);
  }

  private async decrypt(encryptedData: Buffer, password: string): Promise<Buffer> {
    // Extract components
    const salt = encryptedData.slice(0, this.saltLength);
    const iv = encryptedData.slice(this.saltLength, this.saltLength + this.ivLength);
    const authTag = encryptedData.slice(
      this.saltLength + this.ivLength,
      this.saltLength + this.ivLength + this.tagLength
    );
    const encrypted = encryptedData.slice(this.saltLength + this.ivLength + this.tagLength);
    
    // Derive key from password
    const key = await this.deriveKey(password, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    (decipher as any).setAuthTag(authTag);
    
    // Decrypt data
    try {
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed. Invalid password or corrupted data.');
    }
  }

  private deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, this.pbkdf2Iterations, 32, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  async generateHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
