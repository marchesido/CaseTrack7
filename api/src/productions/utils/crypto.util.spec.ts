import { encryptToken, decryptToken } from './crypto.util';

describe('CryptoUtil (B3 - AES-256-GCM)', () => {
  it('should encrypt and decrypt tokens correctly preserving value', () => {
    const originalToken = 'ya29.a0ARrdaM8XYZ123456789_refresh_token_secret';
    const encrypted = encryptToken(originalToken);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(originalToken);
    expect(encrypted.split(':').length).toBe(3); // iv:authTag:ciphertext

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it('should throw error if encrypted payload was tampered with (auth tag verification failure)', () => {
    const originalToken = 'token-secreto-123';
    const encrypted = encryptToken(originalToken);
    const [iv, authTag, cipher] = encrypted.split(':');

    // Altera o ciphertext para simular adulteração
    const tamperedCipher = cipher.slice(0, -2) + 'ff';
    const tamperedPayload = `${iv}:${authTag}:${tamperedCipher}`;

    expect(() => decryptToken(tamperedPayload)).toThrow();
  });
});
