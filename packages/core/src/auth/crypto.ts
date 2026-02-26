/**
 * AES-256-GCM encryption utilities for token storage.
 * Uses Node.js native crypto module - zero dependencies.
 */

import * as crypto from 'node:crypto';
import type { Result } from '../result.js';
import { ok, err } from '../result.js';
import { AuthError } from '../errors.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

/**
 * Derives an AES-256 key from a password using PBKDF2.
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypts data using AES-256-GCM with a password.
 * Output format: salt(32) + iv(12) + tag(16) + ciphertext
 *
 * @example
 * const encrypted = encrypt('secret data', 'my-password');
 * if (encrypted.ok) console.log(encrypted.value); // base64 string
 */
export function encrypt(plaintext: string, password: string): Result<string, AuthError> {
  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(password, salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    const combined = Buffer.concat([salt, iv, tag, encrypted]);
    return ok(combined.toString('base64'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(new AuthError(`Encryption failed: ${message}`));
  }
}

/**
 * Decrypts data encrypted with AES-256-GCM.
 * Expects input format: base64(salt(32) + iv(12) + tag(16) + ciphertext)
 *
 * @example
 * const decrypted = decrypt(encryptedBase64, 'my-password');
 * if (decrypted.ok) console.log(decrypted.value); // 'secret data'
 */
export function decrypt(encryptedBase64: string, password: string): Result<string, AuthError> {
  try {
    const combined = Buffer.from(encryptedBase64, 'base64');

    if (combined.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
      return err(new AuthError('Invalid encrypted data: too short'));
    }

    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = deriveKey(password, salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return ok(decrypted.toString('utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(new AuthError(`Decryption failed: ${message}`));
  }
}

/**
 * Generates a cryptographically secure random string.
 * Useful for PKCE code verifiers and state parameters.
 *
 * @example
 * const verifier = generateRandomString(43); // PKCE code verifier
 */
export function generateRandomString(length: number): string {
  const bytes = crypto.randomBytes(Math.ceil((length * 3) / 4));
  return bytes
    .toString('base64url')
    .slice(0, length);
}

/**
 * Creates a SHA-256 hash of the input, returned as base64url.
 * Used for PKCE code challenge (S256 method).
 *
 * @example
 * const challenge = sha256Base64Url(codeVerifier);
 */
export function sha256Base64Url(input: string): string {
  return crypto
    .createHash('sha256')
    .update(input, 'utf8')
    .digest('base64url');
}

/**
 * Signs data using HMAC-SHA256.
 */
export function hmacSha256(data: string, key: string): string {
  return crypto
    .createHmac('sha256', key)
    .update(data, 'utf8')
    .digest('base64url');
}

/**
 * Creates an RSA-SHA256 signature (used for service account JWTs).
 */
export function rsaSha256Sign(data: string, privateKey: string): Result<string, AuthError> {
  try {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    return ok(sign.sign(privateKey, 'base64url'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(new AuthError(`RSA signing failed: ${message}`));
  }
}
