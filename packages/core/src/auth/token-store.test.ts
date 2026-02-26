import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  createMemoryTokenStore,
  createFileTokenStore,
  createTokenStore,
  getDefaultConfigDir,
} from './token-store.js';
import type { TokenData } from './token-store.js';

const testToken: TokenData = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-456',
  expiresAt: Date.now() + 3600000,
  tokenType: 'Bearer',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
};

describe('token-store', () => {
  describe('createMemoryTokenStore', () => {
    it('should create an empty store', async () => {
      const store = createMemoryTokenStore();
      const result = await store.list();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    });

    it('should store and retrieve a token', async () => {
      const store = createMemoryTokenStore();
      await store.set('user@example.com', testToken);

      const result = await store.get('user@example.com');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value?.accessToken).toBe('access-token-123');
        expect(result.value?.refreshToken).toBe('refresh-token-456');
      }
    });

    it('should return undefined for unknown account', async () => {
      const store = createMemoryTokenStore();
      const result = await store.get('unknown@example.com');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBeUndefined();
    });

    it('should list stored accounts', async () => {
      const store = createMemoryTokenStore();
      await store.set('a@example.com', testToken);
      await store.set('b@example.com', testToken);

      const result = await store.list();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value).toContain('a@example.com');
        expect(result.value).toContain('b@example.com');
      }
    });

    it('should remove a token', async () => {
      const store = createMemoryTokenStore();
      await store.set('user@example.com', testToken);
      await store.remove('user@example.com');

      const result = await store.get('user@example.com');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBeUndefined();
    });

    it('should clear all tokens', async () => {
      const store = createMemoryTokenStore();
      await store.set('a@example.com', testToken);
      await store.set('b@example.com', testToken);
      await store.clear();

      const result = await store.list();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    });

    it('should return copies of token data (not references)', async () => {
      const store = createMemoryTokenStore();
      const original = { ...testToken };
      await store.set('user@example.com', original);

      // Modify original
      original.accessToken = 'modified';

      const result = await store.get('user@example.com');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value?.accessToken).toBe('access-token-123');
      }
    });

    it('should overwrite existing token', async () => {
      const store = createMemoryTokenStore();
      await store.set('user@example.com', testToken);
      await store.set('user@example.com', { ...testToken, accessToken: 'new-token' });

      const result = await store.get('user@example.com');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value?.accessToken).toBe('new-token');
      }
    });
  });

  describe('createFileTokenStore', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = path.join(os.tmpdir(), `ows-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await fs.mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should store and retrieve tokens', async () => {
      const store = createFileTokenStore('test-password', tempDir);
      await store.set('user@example.com', testToken);

      const result = await store.get('user@example.com');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value?.accessToken).toBe('access-token-123');
        expect(result.value?.refreshToken).toBe('refresh-token-456');
      }
    });

    it('should persist tokens to encrypted file', async () => {
      const store = createFileTokenStore('test-password', tempDir);
      await store.set('user@example.com', testToken);

      // Verify encrypted file exists
      const filePath = path.join(tempDir, 'tokens.enc');
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBeTruthy();
      // Should not contain plaintext token
      expect(content).not.toContain('access-token-123');
    });

    it('should read tokens from existing file', async () => {
      const store1 = createFileTokenStore('test-password', tempDir);
      await store1.set('user@example.com', testToken);

      // Create new store instance with same password
      const store2 = createFileTokenStore('test-password', tempDir);
      const result = await store2.get('user@example.com');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value?.accessToken).toBe('access-token-123');
      }
    });

    it('should fail with wrong password', async () => {
      const store1 = createFileTokenStore('correct-password', tempDir);
      await store1.set('user@example.com', testToken);

      const store2 = createFileTokenStore('wrong-password', tempDir);
      const result = await store2.get('user@example.com');
      expect(result.ok).toBe(false);
    });

    it('should list accounts', async () => {
      const store = createFileTokenStore('test-password', tempDir);
      await store.set('a@example.com', testToken);
      await store.set('b@example.com', testToken);

      const result = await store.list();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
    });

    it('should remove a token', async () => {
      const store = createFileTokenStore('test-password', tempDir);
      await store.set('user@example.com', testToken);
      await store.remove('user@example.com');

      const result = await store.get('user@example.com');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBeUndefined();
    });

    it('should clear all tokens', async () => {
      const store = createFileTokenStore('test-password', tempDir);
      await store.set('a@example.com', testToken);
      await store.set('b@example.com', testToken);
      await store.clear();

      const result = await store.list();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    });

    it('should return undefined for non-existent account', async () => {
      const store = createFileTokenStore('test-password', tempDir);
      const result = await store.get('nobody@example.com');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBeUndefined();
    });
  });

  describe('createTokenStore', () => {
    it('should create a memory store', () => {
      const store = createTokenStore('memory');
      expect(store).toBeDefined();
    });

    it('should create a file store with password', () => {
      const store = createTokenStore('file', 'test-password');
      expect(store).toBeDefined();
    });

    it('should throw for file store without password', () => {
      const originalEnv = process.env['OWS_KEYRING_PASSWORD'];
      delete process.env['OWS_KEYRING_PASSWORD'];

      expect(() => createTokenStore('file')).toThrow();

      if (originalEnv !== undefined) {
        process.env['OWS_KEYRING_PASSWORD'] = originalEnv;
      }
    });
  });

  describe('createFileTokenStore – error paths', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = path.join(os.tmpdir(), `ows-test-err-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await fs.mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should return error when readTokens fails with corrupted file', async () => {
      // Write a file that is not valid encrypted data
      const filePath = path.join(tempDir, 'tokens.enc');
      await fs.writeFile(filePath, 'not-encrypted-data', 'utf8');

      const store = createFileTokenStore('some-password', tempDir);
      const result = await store.get('user@example.com');
      // The decrypt call should fail
      expect(result.ok).toBe(false);
    });

    it('should return error when ensureDir fails during set()', async () => {
      // Use a config dir path that's a file (not a dir) to force mkdir to fail
      const blockerFile = path.join(tempDir, 'blocker');
      await fs.writeFile(blockerFile, 'I am a file', 'utf8');
      // Try to use a path nested under the file - mkdir should fail
      const badDir = path.join(blockerFile, 'subdir');

      const store = createFileTokenStore('test-password', badDir);
      const result = await store.set('user@example.com', testToken);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        // readTokens is called first inside set(), and its ensureDir fails
        expect(result.error.message).toContain('Failed to read token store');
      }
    });

    it('should return error when writeTokens fails on clear()', async () => {
      // clear() calls writeTokens directly (bypasses readTokens)
      const blockerFile = path.join(tempDir, 'blocker');
      await fs.writeFile(blockerFile, 'I am a file', 'utf8');
      const badDir = path.join(blockerFile, 'subdir');

      const store = createFileTokenStore('test-password', badDir);
      const result = await store.clear();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Failed to write token store');
      }
    });

    it('should return error when readTokens encounters a read error', async () => {
      // Create the file as a directory so readFile fails
      const tokensPath = path.join(tempDir, 'tokens.enc');
      await fs.mkdir(tokensPath, { recursive: true });

      const store = createFileTokenStore('test-password', tempDir);
      const result = await store.get('user@example.com');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Failed to read token store');
      }
    });

    it('should propagate readTokens error through list()', async () => {
      // Create the file as a directory so readFile fails
      const tokensPath = path.join(tempDir, 'tokens.enc');
      await fs.mkdir(tokensPath, { recursive: true });

      const store = createFileTokenStore('test-password', tempDir);
      const result = await store.list();
      expect(result.ok).toBe(false);
    });

    it('should propagate readTokens error through remove()', async () => {
      const tokensPath = path.join(tempDir, 'tokens.enc');
      await fs.mkdir(tokensPath, { recursive: true });

      const store = createFileTokenStore('test-password', tempDir);
      const result = await store.remove('user@example.com');
      expect(result.ok).toBe(false);
    });
  });

  describe('getDefaultConfigDir', () => {
    it('should return a non-empty path', () => {
      const dir = getDefaultConfigDir();
      expect(dir).toBeTruthy();
      expect(typeof dir).toBe('string');
    });

    it('should contain openworkspace in the path', () => {
      const dir = getDefaultConfigDir();
      expect(dir).toContain('openworkspace');
    });
  });
});
