import * as crypto from 'crypto';
import * as fs from 'fs/promises';

// File format (v1):
//   [0..4]   magic     = "AIFSE" (5 bytes)
//   [5]      version   = 0x01    (1 byte)
//   [6]      algoId    = 0x01    (1 byte, 0x01 = aes-256-gcm)
//   [7]      kdfId     = 0x01    (1 byte, 0x01 = pbkdf2-sha256)
//   [8..11]  kdfIters  = uint32 BE
//   [12]     saltLen   = uint8 (typically 32)
//   [13]     ivLen     = uint8 (typically 12 for GCM)
//   [14]     tagLen    = uint8 (typically 16)
//   [15..]   salt(saltLen) | iv(ivLen) | authTag(tagLen) | ciphertext
//
// Legacy format (no magic): salt(32) | iv(16) | authTag(16) | ciphertext, PBKDF2 100k.
// Decrypt() auto-detects format by magic prefix to maintain backward compatibility.

const MAGIC = Buffer.from('AIFSE', 'utf-8');
const VERSION = 0x01;
const ALGO_AES_256_GCM = 0x01;
const KDF_PBKDF2_SHA256 = 0x01;

const SALT_LEN = 32;
const IV_LEN = 12; // NIST SP 800-38D 권고 (GCM)
const TAG_LEN = 16;
const PBKDF2_ITERS = 600_000; // OWASP 2023+ 권고 (SHA-256 기준)

const LEGACY_SALT_LEN = 32;
const LEGACY_IV_LEN = 16;
const LEGACY_TAG_LEN = 16;
const LEGACY_PBKDF2_ITERS = 100_000;

const HEADER_LEN = MAGIC.length + 1 + 1 + 1 + 4 + 1 + 1 + 1; // 15

export class EncryptionService {
  async encryptFile(filePath: string, password: string, outputPath?: string): Promise<string> {
    const plaintext = await fs.readFile(filePath);
    const blob = await this.encrypt(plaintext, password);

    const encryptedPath = outputPath || filePath + '.encrypted';
    await fs.writeFile(encryptedPath, blob);
    return encryptedPath;
  }

  async decryptFile(encryptedPath: string, password: string, outputPath?: string): Promise<string> {
    const blob = await fs.readFile(encryptedPath);
    const plaintext = await this.decrypt(blob, password);

    // Default output path: strip the trailing `.encrypted` suffix. If the input
    // does NOT carry that suffix we refuse to fall back to the same path —
    // writing plaintext over the ciphertext would silently destroy the only
    // copy of the encrypted data.
    let decryptedPath: string;
    if (outputPath) {
      decryptedPath = outputPath;
    } else if (encryptedPath.endsWith('.encrypted')) {
      decryptedPath = encryptedPath.slice(0, -'.encrypted'.length);
    } else {
      throw new Error(
        `decryptFile: encrypted input "${encryptedPath}" does not end in .encrypted; ` +
        `pass outputPath explicitly so the ciphertext is not overwritten.`,
      );
    }

    await fs.writeFile(decryptedPath, plaintext);
    return decryptedPath;
  }

  async generateHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async encrypt(data: Buffer, password: string): Promise<Buffer> {
    const salt = crypto.randomBytes(SALT_LEN);
    const iv = crypto.randomBytes(IV_LEN);
    const key = await this.deriveKey(password, salt, PBKDF2_ITERS);

    // Build the header first so we can bind it as AAD — any tampering with the
    // algorithm/KDF/iter fields will then fail GCM authentication.
    const header = Buffer.alloc(HEADER_LEN);
    MAGIC.copy(header, 0);
    header.writeUInt8(VERSION, 5);
    header.writeUInt8(ALGO_AES_256_GCM, 6);
    header.writeUInt8(KDF_PBKDF2_SHA256, 7);
    header.writeUInt32BE(PBKDF2_ITERS, 8);
    header.writeUInt8(SALT_LEN, 12);
    header.writeUInt8(IV_LEN, 13);
    header.writeUInt8(TAG_LEN, 14);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_LEN });
    cipher.setAAD(header);
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([header, salt, iv, authTag, ciphertext]);
  }

  private async decrypt(blob: Buffer, password: string): Promise<Buffer> {
    if (blob.length >= MAGIC.length && blob.subarray(0, MAGIC.length).equals(MAGIC)) {
      return this.decryptV1(blob, password);
    }
    return this.decryptLegacy(blob, password);
  }

  private async decryptV1(blob: Buffer, password: string): Promise<Buffer> {
    if (blob.length < HEADER_LEN) {
      throw new Error('Encrypted blob too short for v1 header');
    }

    const version = blob.readUInt8(5);
    if (version !== VERSION) {
      throw new Error(`Unsupported encryption version: ${version}`);
    }

    const algoId = blob.readUInt8(6);
    if (algoId !== ALGO_AES_256_GCM) {
      throw new Error(`Unsupported cipher algorithm: ${algoId}`);
    }

    const kdfId = blob.readUInt8(7);
    if (kdfId !== KDF_PBKDF2_SHA256) {
      throw new Error(`Unsupported KDF: ${kdfId}`);
    }

    const iters = blob.readUInt32BE(8);
    const saltLen = blob.readUInt8(12);
    const ivLen = blob.readUInt8(13);
    const tagLen = blob.readUInt8(14);

    // Bound-check before doing any expensive work. A malicious blob could
    // otherwise pin iters = 0xFFFFFFFF and burn CPU on PBKDF2 prior to GCM
    // authentication.
    if (saltLen < 16 || saltLen > 64) {
      throw new Error(`v1 saltLen out of range: ${saltLen}`);
    }
    if (ivLen < 12 || ivLen > 16) {
      throw new Error(`v1 ivLen out of range: ${ivLen}`);
    }
    if (tagLen < 12 || tagLen > 16) {
      throw new Error(`v1 tagLen out of range: ${tagLen}`);
    }
    if (iters < 100_000 || iters > 10_000_000) {
      throw new Error(`v1 kdf iterations out of range: ${iters}`);
    }
    const minBlobLen = HEADER_LEN + saltLen + ivLen + tagLen;
    if (blob.length < minBlobLen) {
      throw new Error('v1 encrypted blob is shorter than its declared header dimensions');
    }

    const header = blob.subarray(0, HEADER_LEN);

    let offset = HEADER_LEN;
    const salt = blob.subarray(offset, offset + saltLen);
    offset += saltLen;
    const iv = blob.subarray(offset, offset + ivLen);
    offset += ivLen;
    const authTag = blob.subarray(offset, offset + tagLen);
    offset += tagLen;
    const ciphertext = blob.subarray(offset);

    const key = await this.deriveKey(password, salt, iters);
    return this.runDecipher(key, iv, authTag, ciphertext, tagLen, header);
  }

  private async decryptLegacy(blob: Buffer, password: string): Promise<Buffer> {
    const minLen = LEGACY_SALT_LEN + LEGACY_IV_LEN + LEGACY_TAG_LEN;
    if (blob.length < minLen) {
      throw new Error('Encrypted blob too short for legacy format');
    }
    const salt = blob.subarray(0, LEGACY_SALT_LEN);
    const iv = blob.subarray(LEGACY_SALT_LEN, LEGACY_SALT_LEN + LEGACY_IV_LEN);
    const authTag = blob.subarray(
      LEGACY_SALT_LEN + LEGACY_IV_LEN,
      LEGACY_SALT_LEN + LEGACY_IV_LEN + LEGACY_TAG_LEN,
    );
    const ciphertext = blob.subarray(LEGACY_SALT_LEN + LEGACY_IV_LEN + LEGACY_TAG_LEN);

    const key = await this.deriveKey(password, salt, LEGACY_PBKDF2_ITERS);
    return this.runDecipher(key, iv, authTag, ciphertext, LEGACY_TAG_LEN);
  }

  private runDecipher(
    key: Buffer,
    iv: Buffer,
    authTag: Buffer,
    ciphertext: Buffer,
    tagLen: number,
    aad?: Buffer,
  ): Buffer {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: tagLen });
      if (aad) {
        decipher.setAAD(aad);
      }
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch {
      throw new Error('Decryption failed. Invalid password or corrupted data.');
    }
  }

  private deriveKey(password: string, salt: Buffer, iterations: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, 32, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }
}
