import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  decryptToken,
  encryptToken,
  resolveEncryptionKey,
} from './token-encryption.js';

const VALID_KEY_HEX = crypto.randomBytes(32).toString('hex');
const VALID_KEY_BASE64 = crypto.randomBytes(32).toString('base64');
const VALID_KEY_BUFFER = crypto.randomBytes(32);
const ANOTHER_KEY_HEX = crypto.randomBytes(32).toString('hex');

describe('Token Encryption - resolveEncryptionKey', () => {
  it('resolves a 64-character hex key to a 32-byte buffer', () => {
    const keyBuf = resolveEncryptionKey(VALID_KEY_HEX);
    expect(keyBuf).toBeInstanceOf(Buffer);
    expect(keyBuf.length).toBe(32);
    expect(keyBuf.toString('hex')).toBe(VALID_KEY_HEX);
  });

  it('resolves a 44-character base64 key to a 32-byte buffer', () => {
    const keyBuf = resolveEncryptionKey(VALID_KEY_BASE64);
    expect(keyBuf).toBeInstanceOf(Buffer);
    expect(keyBuf.length).toBe(32);
    expect(keyBuf.toString('base64')).toBe(VALID_KEY_BASE64);
  });

  it('resolves a 32-byte Buffer directly', () => {
    const keyBuf = resolveEncryptionKey(VALID_KEY_BUFFER);
    expect(keyBuf).toBe(VALID_KEY_BUFFER);
    expect(keyBuf.length).toBe(32);
  });

  it('throws when no key is provided and TOKEN_ENCRYPTION_KEY is unset', () => {
    const originalEnv = process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.TOKEN_ENCRYPTION_KEY;

    try {
      expect(() => resolveEncryptionKey()).toThrow(
        'TOKEN_ENCRYPTION_KEY environment variable is not configured.',
      );
    } finally {
      if (originalEnv !== undefined) {
        process.env.TOKEN_ENCRYPTION_KEY = originalEnv;
      }
    }
  });

  it('throws when the key does not decode to 32 bytes', () => {
    expect(() => resolveEncryptionKey('too-short')).toThrow(
      /must decode to exactly 32 bytes/,
    );
    expect(() =>
      resolveEncryptionKey(crypto.randomBytes(16).toString('hex')),
    ).toThrow(/must decode to exactly 32 bytes/);
    expect(() =>
      resolveEncryptionKey(crypto.randomBytes(64).toString('hex')),
    ).toThrow(/must decode to exactly 32 bytes/);
  });
});

describe('Token Encryption - encryptToken and decryptToken', () => {
  it('performs round-trip encryption and decryption successfully', () => {
    const token = 'ya29.a0AfH6SMB_sample_oauth_access_token_123456789';
    const encrypted = encryptToken(token, VALID_KEY_HEX);

    expect(encrypted.startsWith('v1:')).toBe(true);
    const decrypted = decryptToken(encrypted, VALID_KEY_HEX);
    expect(decrypted).toBe(token);
  });

  it('round-trips complex tokens with special characters and JSON payloads', () => {
    const complexPayload = JSON.stringify({
      access_token: 'ya29.special!@#$%^&*()_+~`',
      refresh_token: '1//04_refresh_token_complex',
      expires_in: 3600,
    });

    const encrypted = encryptToken(complexPayload, VALID_KEY_BASE64);
    const decrypted = decryptToken(encrypted, VALID_KEY_BASE64);
    expect(decrypted).toBe(complexPayload);
  });

  it('uses a unique nonce for every encryption operation', () => {
    const token = 'fixed_token_value_repeated';
    const encrypted1 = encryptToken(token, VALID_KEY_HEX);
    const encrypted2 = encryptToken(token, VALID_KEY_HEX);

    expect(encrypted1).not.toBe(encrypted2);

    const iv1 = encrypted1.split(':')[1];
    const iv2 = encrypted2.split(':')[1];
    expect(iv1).not.toBe(iv2);

    expect(decryptToken(encrypted1, VALID_KEY_HEX)).toBe(token);
    expect(decryptToken(encrypted2, VALID_KEY_HEX)).toBe(token);
  });

  it('rejects decryption with the wrong key', () => {
    const token = 'secret_youtube_token';
    const encrypted = encryptToken(token, VALID_KEY_HEX);

    expect(() => decryptToken(encrypted, ANOTHER_KEY_HEX)).toThrow(
      'Failed to authenticate or decrypt token payload.',
    );
  });

  it('rejects tampered ciphertext', () => {
    const token = 'confidential_token';
    const encrypted = encryptToken(token, VALID_KEY_HEX);
    const parts = encrypted.split(':');

    // Flip characters in the ciphertext segment
    const tamperedCiphertext =
      parts[3]!.slice(0, -2) + (parts[3]!.slice(-2) === '00' ? 'ff' : '00');
    const tamperedPayload = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedCiphertext}`;

    expect(() => decryptToken(tamperedPayload, VALID_KEY_HEX)).toThrow(
      'Failed to authenticate or decrypt token payload.',
    );
  });

  it('rejects tampered authentication tag', () => {
    const token = 'confidential_token';
    const encrypted = encryptToken(token, VALID_KEY_HEX);
    const parts = encrypted.split(':');

    // Flip characters in the auth tag segment
    const tamperedTag =
      parts[2]!.slice(0, -2) + (parts[2]!.slice(-2) === '00' ? 'ff' : '00');
    const tamperedPayload = `${parts[0]}:${parts[1]}:${tamperedTag}:${parts[3]}`;

    expect(() => decryptToken(tamperedPayload, VALID_KEY_HEX)).toThrow(
      'Failed to authenticate or decrypt token payload.',
    );
  });

  it('rejects tampered IV', () => {
    const token = 'confidential_token';
    const encrypted = encryptToken(token, VALID_KEY_HEX);
    const parts = encrypted.split(':');

    // Flip characters in the IV segment
    const tamperedIv =
      parts[1]!.slice(0, -2) + (parts[1]!.slice(-2) === '00' ? 'ff' : '00');
    const tamperedPayload = `${parts[0]}:${tamperedIv}:${parts[2]}:${parts[3]}`;

    expect(() => decryptToken(tamperedPayload, VALID_KEY_HEX)).toThrow(
      'Failed to authenticate or decrypt token payload.',
    );
  });

  it('rejects unsupported payload versions', () => {
    const encrypted = encryptToken('test', VALID_KEY_HEX);
    const parts = encrypted.split(':');
    const v2Payload = `v2:${parts[1]}:${parts[2]}:${parts[3]}`;

    expect(() => decryptToken(v2Payload, VALID_KEY_HEX)).toThrow(
      'Unsupported ciphertext version: "v2".',
    );
  });

  it('rejects malformed payloads with missing or invalid segments', () => {
    expect(() => decryptToken('', VALID_KEY_HEX)).toThrow(
      'Encrypted payload must be a non-empty string.',
    );
    expect(() =>
      decryptToken('plaintext_token_not_encrypted', VALID_KEY_HEX),
    ).toThrow(
      'Malformed encrypted token payload: incorrect number of segments.',
    );
    expect(() => decryptToken('v1:only_two_segments', VALID_KEY_HEX)).toThrow(
      'Malformed encrypted token payload: incorrect number of segments.',
    );
    expect(() =>
      decryptToken('v1:invalid_iv:auth_tag:ciphertext', VALID_KEY_HEX),
    ).toThrow(
      'Malformed encrypted token payload: invalid IV encoding or length.',
    );
  });

  it('rejects empty plaintext during encryption', () => {
    expect(() => encryptToken('', VALID_KEY_HEX)).toThrow(
      'Plaintext token must be a non-empty string.',
    );
  });
});
