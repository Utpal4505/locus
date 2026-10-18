import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // 96 bits recommended for AES-GCM
const AUTH_TAG_LENGTH_BYTES = 16; // 128 bits standard for AES-GCM
const KEY_LENGTH_BYTES = 32; // 256 bits for AES-256
const CURRENT_VERSION = 'v1';

const HEX_REGEX = /^[0-9a-f]+$/i;

/**
 * Resolves and validates a 32-byte encryption key from an explicit value or
 * the TOKEN_ENCRYPTION_KEY environment variable.
 */
export function resolveEncryptionKey(overrideKey?: string | Buffer): Buffer {
  const rawKey = overrideKey ?? process.env.TOKEN_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY environment variable is not configured.',
    );
  }

  if (Buffer.isBuffer(rawKey)) {
    if (rawKey.length !== KEY_LENGTH_BYTES) {
      throw new Error(
        `Invalid encryption key: key buffer must be exactly ${KEY_LENGTH_BYTES} bytes.`,
      );
    }
    return rawKey;
  }

  const trimmed = rawKey.trim();

  // 1. Decode 64-character hex string (32 bytes = 256 bits)
  if (trimmed.length === 64 && HEX_REGEX.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  // 2. Decode 44-character base64 string (32 bytes = 256 bits)
  if (/^[A-Za-z0-9+/=_-]{43,44}$/.test(trimmed)) {
    const base64Buf = Buffer.from(trimmed, 'base64');
    if (base64Buf.length === KEY_LENGTH_BYTES) {
      return base64Buf;
    }
  }

  throw new Error(
    `Invalid encryption key: key must decode to exactly ${KEY_LENGTH_BYTES} bytes (e.g. 64-character hex or 44-character base64).`,
  );
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a fresh random nonce.
 *
 * Payload format: v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encryptToken(
  plaintext: string,
  keyOverride?: string | Buffer,
): string {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('Plaintext token must be a non-empty string.');
  }

  const key = resolveEncryptionKey(keyOverride);
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${CURRENT_VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypts and authenticates a versioned ciphertext payload using AES-256-GCM.
 */
export function decryptToken(
  encryptedPayload: string,
  keyOverride?: string | Buffer,
): string {
  if (
    typeof encryptedPayload !== 'string' ||
    encryptedPayload.trim().length === 0
  ) {
    throw new Error('Encrypted payload must be a non-empty string.');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 4) {
    throw new Error(
      'Malformed encrypted token payload: incorrect number of segments.',
    );
  }

  const [version, ivHex, authTagHex, ciphertextHex] = parts as [
    string,
    string,
    string,
    string,
  ];

  if (version !== CURRENT_VERSION) {
    throw new Error(`Unsupported ciphertext version: "${version}".`);
  }

  if (ivHex.length !== IV_LENGTH_BYTES * 2 || !HEX_REGEX.test(ivHex)) {
    throw new Error(
      'Malformed encrypted token payload: invalid IV encoding or length.',
    );
  }

  if (
    authTagHex.length !== AUTH_TAG_LENGTH_BYTES * 2 ||
    !HEX_REGEX.test(authTagHex)
  ) {
    throw new Error(
      'Malformed encrypted token payload: invalid authentication tag encoding or length.',
    );
  }

  if (
    ciphertextHex.length === 0 ||
    ciphertextHex.length % 2 !== 0 ||
    !HEX_REGEX.test(ciphertextHex)
  ) {
    throw new Error(
      'Malformed encrypted token payload: invalid ciphertext encoding.',
    );
  }

  const key = resolveEncryptionKey(keyOverride);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error('Failed to authenticate or decrypt token payload.');
  }
}
