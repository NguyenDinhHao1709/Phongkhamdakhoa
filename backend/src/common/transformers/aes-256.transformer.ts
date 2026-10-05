import { ValueTransformer } from 'typeorm';
import * as crypto from 'crypto';

/**
 * AES-256-CBC Data Transformer for HIPAA & PII Compliance
 * Encrypts sensitive fields (CCCD, address, clinical diagnoses) at the database layer.
 * 
 * Supports:
 * - Deterministic IV for unique/searchable fields (e.g. CCCD/soCmnd)
 * - Randomized IV for text/clinical fields (e.g. diaChi, trieuChung, chanDoan)
 * - Backward compatibility with unencrypted legacy records (graceful fallback)
 */
export class Aes256Transformer implements ValueTransformer {
  private readonly key: Buffer;
  private readonly candidateKeys: Buffer[];
  private readonly deterministic: boolean;

  constructor(options?: { deterministic?: boolean }) {
    this.deterministic = Boolean(options?.deterministic);
    const primarySecret =
      process.env.APP_ENCRYPTION_KEY ||
      'phong_kham_secret_encryption_key_2026_hipaa_compliance';
    // Always derive a strictly 32-byte (256-bit) key
    this.key = crypto.createHash('sha256').update(primarySecret).digest();

    const candidateSecrets = Array.from(
      new Set(
        [
          primarySecret,
          'phong_kham_secret_encryption_key_2026_hipaa_compliance',
          process.env.APP_ENCRYPTION_KEY,
          process.env.JWT_SECRET,
        ].filter(Boolean) as string[],
      ),
    );
    this.candidateKeys = candidateSecrets.map((s) =>
      crypto.createHash('sha256').update(s).digest(),
    );
  }

  /**
   * Encrypt data before saving to database (to)
   */
  to(value: string | null | undefined): string | null | undefined {
    if (value === null || value === undefined || value === '') {
      return value;
    }

    // Do not re-encrypt if already encrypted
    if (typeof value === 'string' && value.startsWith('enc:')) {
      return value;
    }

    try {
      const stringValue = String(value);
      // Deterministic IV for unique searchable fields (HMAC), or randomized IV for clinical text
      const iv = this.deterministic
        ? crypto.createHmac('sha256', this.key).update(stringValue).digest().subarray(0, 16)
        : crypto.randomBytes(16);

      const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);
      let encrypted = cipher.update(stringValue, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return `enc:${iv.toString('hex')}:${encrypted}`;
    } catch (err) {
      console.error('[Aes256Transformer.to] Encryption failed:', err);
      return value;
    }
  }

  /**
   * Decrypt data after retrieving from database (from)
   */
  from(value: string | null | undefined): string | null | undefined {
    if (value === null || value === undefined || value === '') {
      return value;
    }

    // If data is unencrypted legacy plaintext, return as-is
    if (typeof value !== 'string' || !value.startsWith('enc:')) {
      return value;
    }

    const parts = value.split(':');
    if (parts.length !== 3) {
      return value;
    }

    const iv = Buffer.from(parts[1], 'hex');
    const encryptedHex = parts[2];

    for (const key of this.candidateKeys) {
      try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch {
        // Continue to try next candidate key
      }
    }

    console.warn('[Aes256Transformer.from] Decryption warning: unable to decrypt with any candidate key');
    return value;
  }
}
