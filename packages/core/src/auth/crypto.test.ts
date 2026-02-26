import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  generateRandomString,
  sha256Base64Url,
  hmacSha256,
  rsaSha256Sign,
} from './crypto.js';

describe('crypto', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string', () => {
      const plaintext = 'Hello, World!';
      const password = 'test-password';

      const encrypted = encrypt(plaintext, password);
      expect(encrypted.ok).toBe(true);
      if (!encrypted.ok) return;

      const decrypted = decrypt(encrypted.value, password);
      expect(decrypted.ok).toBe(true);
      if (!decrypted.ok) return;

      expect(decrypted.value).toBe(plaintext);
    });

    it('should encrypt and decrypt JSON data', () => {
      const data = JSON.stringify({ token: 'abc123', refresh: 'xyz789' });
      const password = 'secure-password';

      const encrypted = encrypt(data, password);
      expect(encrypted.ok).toBe(true);
      if (!encrypted.ok) return;

      const decrypted = decrypt(encrypted.value, password);
      expect(decrypted.ok).toBe(true);
      if (!decrypted.ok) return;

      expect(JSON.parse(decrypted.value)).toEqual({ token: 'abc123', refresh: 'xyz789' });
    });

    it('should produce different ciphertext each time (random salt/iv)', () => {
      const plaintext = 'same data';
      const password = 'same-password';

      const encrypted1 = encrypt(plaintext, password);
      const encrypted2 = encrypt(plaintext, password);

      expect(encrypted1.ok).toBe(true);
      expect(encrypted2.ok).toBe(true);
      if (!encrypted1.ok || !encrypted2.ok) return;

      expect(encrypted1.value).not.toBe(encrypted2.value);
    });

    it('should fail to decrypt with wrong password', () => {
      const encrypted = encrypt('secret', 'correct-password');
      expect(encrypted.ok).toBe(true);
      if (!encrypted.ok) return;

      const decrypted = decrypt(encrypted.value, 'wrong-password');
      expect(decrypted.ok).toBe(false);
    });

    it('should fail to decrypt corrupted data', () => {
      const decrypted = decrypt('not-valid-base64!!!', 'password');
      expect(decrypted.ok).toBe(false);
    });

    it('should fail to decrypt too-short data', () => {
      const shortData = Buffer.from('short').toString('base64');
      const decrypted = decrypt(shortData, 'password');
      expect(decrypted.ok).toBe(false);
    });

    it('should handle empty string', () => {
      const encrypted = encrypt('', 'password');
      expect(encrypted.ok).toBe(true);
      if (!encrypted.ok) return;

      const decrypted = decrypt(encrypted.value, 'password');
      expect(decrypted.ok).toBe(true);
      if (!decrypted.ok) return;

      expect(decrypted.value).toBe('');
    });

    it('should handle unicode strings', () => {
      const plaintext = 'Merhaba Dunya! Turkce karakterler';
      const password = 'test';

      const encrypted = encrypt(plaintext, password);
      expect(encrypted.ok).toBe(true);
      if (!encrypted.ok) return;

      const decrypted = decrypt(encrypted.value, password);
      expect(decrypted.ok).toBe(true);
      if (!decrypted.ok) return;

      expect(decrypted.value).toBe(plaintext);
    });
  });

  describe('generateRandomString', () => {
    it('should generate a string of specified length', () => {
      const str = generateRandomString(32);
      expect(str).toHaveLength(32);
    });

    it('should generate unique strings', () => {
      const str1 = generateRandomString(32);
      const str2 = generateRandomString(32);
      expect(str1).not.toBe(str2);
    });

    it('should generate base64url characters only', () => {
      const str = generateRandomString(100);
      expect(str).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should handle different lengths', () => {
      expect(generateRandomString(1)).toHaveLength(1);
      expect(generateRandomString(43)).toHaveLength(43);
      expect(generateRandomString(128)).toHaveLength(128);
    });
  });

  describe('sha256Base64Url', () => {
    it('should hash a string', () => {
      const hash = sha256Base64Url('test');
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });

    it('should produce consistent results', () => {
      const hash1 = sha256Base64Url('hello');
      const hash2 = sha256Base64Url('hello');
      expect(hash1).toBe(hash2);
    });

    it('should produce different results for different inputs', () => {
      const hash1 = sha256Base64Url('hello');
      const hash2 = sha256Base64Url('world');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce base64url characters', () => {
      const hash = sha256Base64Url('test input');
      expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('hmacSha256', () => {
    it('should produce a signature', () => {
      const sig = hmacSha256('data', 'secret');
      expect(sig).toBeTruthy();
      expect(typeof sig).toBe('string');
    });

    it('should produce consistent results', () => {
      const sig1 = hmacSha256('data', 'secret');
      const sig2 = hmacSha256('data', 'secret');
      expect(sig1).toBe(sig2);
    });

    it('should produce different results for different keys', () => {
      const sig1 = hmacSha256('data', 'key1');
      const sig2 = hmacSha256('data', 'key2');
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('rsaSha256Sign', () => {
    it('should fail with invalid private key', () => {
      const result = rsaSha256Sign('data', 'not-a-valid-key');
      expect(result.ok).toBe(false);
    });
  });
});
