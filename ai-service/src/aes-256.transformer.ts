import { ValueTransformer } from 'typeorm';
import * as crypto from 'crypto';

export class Aes256Transformer implements ValueTransformer {
  private readonly key: Buffer;
  private readonly candidateKeys: Buffer[];
  private readonly deterministic: boolean;

  constructor(options?: { deterministic?: boolean }) {
    this.deterministic = Boolean(options?.deterministic);
    const primarySecret =
      process.env.APP_ENCRYPTION_KEY ||
      'phong_kham_secret_encryption_key_2026_hipaa_compliance';
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

  to(value: string | null | undefined): string | null | undefined {
    if (value === null || value === undefined || value === '') return value;
    if (typeof value === 'string' && value.startsWith('enc:')) return value;

    try {
      const stringValue = String(value);
      const iv = this.deterministic
        ? crypto.createHmac('sha256', this.key).update(stringValue).digest().subarray(0, 16)
        : crypto.randomBytes(16);

      const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);
      let encrypted = cipher.update(stringValue, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return `enc:${iv.toString('hex')}:${encrypted}`;
    } catch {
      return value;
    }
  }

  from(value: string | null | undefined): string | null | undefined {
    if (value === null || value === undefined || value === '') return value;
    if (typeof value !== 'string' || !value.startsWith('enc:')) return value;

    const parts = value.split(':');
    if (parts.length !== 3) return value;

    const iv = Buffer.from(parts[1], 'hex');
    const encryptedHex = parts[2];

    for (const key of this.candidateKeys) {
      try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch {}
    }

    return value;
  }
}

