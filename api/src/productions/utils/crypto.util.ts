import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes recomendado para GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes padrão

/**
 * Obtém a chave de criptografia de 32 bytes a partir da variável de ambiente.
 * Caso não esteja configurada ou tenha tamanho diferente, deriva com SHA-256 para garantir 32 bytes.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || 'casetrack-google-oauth-secret-key-32b!';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Criptografa uma string usando AES-256-GCM.
 * Retorna formato seguro: iv:authTag:ciphertext (em formato hex concatenado por dois pontos)
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Descriptografa uma string gerada pelo encryptToken.
 * Valida a integridade dos dados via autentication tag do GCM.
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) return '';
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de token criptografado inválido. Esperado iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, cipherTextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const cipherText = Buffer.from(cipherTextHex, 'hex');
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return decrypted.toString('utf8');
}
