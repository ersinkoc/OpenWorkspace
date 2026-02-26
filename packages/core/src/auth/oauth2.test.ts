import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAuthEngine, loadCredentialsFile } from './oauth2.js';
import { createMemoryTokenStore } from './token-store.js';
import type { TokenData } from './token-store.js';
import { SCOPES } from './scopes.js';

const mockCredentials = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
};

describe('oauth2', () => {
  describe('createAuthEngine', () => {
    it('should create an auth engine', () => {
      const auth = createAuthEngine({
        credentials: mockCredentials,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
      });

      expect(auth).toBeDefined();
      expect(auth.getToken).toBeDefined();
      expect(auth.browserFlow).toBeDefined();
      expect(auth.headlessFlow).toBeDefined();
      expect(auth.deviceCodeFlow).toBeDefined();
      expect(auth.refreshToken).toBeDefined();
      expect(auth.revokeToken).toBeDefined();
      expect(auth.isTokenValid).toBeDefined();
      expect(auth.listAccounts).toBeDefined();
      expect(auth.removeAccount).toBeDefined();
    });

    describe('getToken', () => {
      it('should return error for unknown account', async () => {
        const auth = createAuthEngine({
          credentials: mockCredentials,
          scopes: [SCOPES.GMAIL.READONLY],
          tokenStore: createMemoryTokenStore(),
        });

        const result = await auth.getToken('unknown@example.com');
        expect(result.ok).toBe(false);
      });

      it('should return valid token from store', async () => {
        const store = createMemoryTokenStore();
        const token: TokenData = {
          accessToken: 'valid-access-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 3600 * 1000, // 1 hour from now
          tokenType: 'Bearer',
        };
        await store.set('user@example.com', token);

        const auth = createAuthEngine({
          credentials: mockCredentials,
          scopes: [SCOPES.GMAIL.READONLY],
          tokenStore: store,
        });

        const result = await auth.getToken('user@example.com');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe('valid-access-token');
        }
      });

      it('should return error for expired token without refresh token', async () => {
        const store = createMemoryTokenStore();
        const token: TokenData = {
          accessToken: 'expired-token',
          expiresAt: Date.now() - 1000, // Already expired
          tokenType: 'Bearer',
        };
        await store.set('user@example.com', token);

        const auth = createAuthEngine({
          credentials: mockCredentials,
          scopes: [SCOPES.GMAIL.READONLY],
          tokenStore: store,
        });

        const result = await auth.getToken('user@example.com');
        expect(result.ok).toBe(false);
      });
    });

    describe('isTokenValid', () => {
      it('should return false for unknown account', async () => {
        const auth = createAuthEngine({
          credentials: mockCredentials,
          scopes: [SCOPES.GMAIL.READONLY],
          tokenStore: createMemoryTokenStore(),
        });

        const result = await auth.isTokenValid('unknown@example.com');
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toBe(false);
      });

      it('should return true for valid token', async () => {
        const store = createMemoryTokenStore();
        await store.set('user@example.com', {
          accessToken: 'token',
          expiresAt: Date.now() + 3600000,
          tokenType: 'Bearer',
        });

        const auth = createAuthEngine({
          credentials: mockCredentials,
          scopes: [SCOPES.GMAIL.READONLY],
          tokenStore: store,
        });

        const result = await auth.isTokenValid('user@example.com');
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toBe(true);
      });

      it('should return false for expired token', async () => {
        const store = createMemoryTokenStore();
        await store.set('user@example.com', {
          accessToken: 'token',
          expiresAt: Date.now() - 1000,
          tokenType: 'Bearer',
        });

        const auth = createAuthEngine({
          credentials: mockCredentials,
          scopes: [SCOPES.GMAIL.READONLY],
          tokenStore: store,
        });

        const result = await auth.isTokenValid('user@example.com');
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toBe(false);
      });

      it('should return true for token without expiry', async () => {
        const store = createMemoryTokenStore();
        await store.set('user@example.com', {
          accessToken: 'token',
          tokenType: 'Bearer',
        });

        const auth = createAuthEngine({
          credentials: mockCredentials,
          scopes: [SCOPES.GMAIL.READONLY],
          tokenStore: store,
        });

        const result = await auth.isTokenValid('user@example.com');
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toBe(true);
      });
    });

    describe('listAccounts', () => {
      it('should return empty list initially', async () => {
        const auth = createAuthEngine({
          credentials: mockCredentials,
          scopes: [SCOPES.GMAIL.READONLY],
          tokenStore: createMemoryTokenStore(),
        });

        const result = await auth.listAccounts();
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toEqual([]);
      });

      it('should return stored accounts', async () => {
        const store = createMemoryTokenStore();
        await store.set('a@example.com', { accessToken: 'a', tokenType: 'Bearer' });
        await store.set('b@example.com', { accessToken: 'b', tokenType: 'Bearer' });

        const auth = createAuthEngine({
          credentials: mockCredentials,
          scopes: [SCOPES.GMAIL.READONLY],
          tokenStore: store,
        });

        const result = await auth.listAccounts();
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toHaveLength(2);
        }
      });
    });

    describe('removeAccount', () => {
      it('should remove an account', async () => {
        const store = createMemoryTokenStore();
        await store.set('user@example.com', { accessToken: 'token', tokenType: 'Bearer' });

        const auth = createAuthEngine({
          credentials: mockCredentials,
          scopes: [SCOPES.GMAIL.READONLY],
          tokenStore: store,
        });

        await auth.removeAccount('user@example.com');

        const result = await store.get('user@example.com');
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toBeUndefined();
      });
    });

    describe('refreshToken', () => {
      it('should return error when no refresh token exists', async () => {
        const store = createMemoryTokenStore();
        await store.set('user@example.com', {
          accessToken: 'token',
          tokenType: 'Bearer',
        });

        const auth = createAuthEngine({
          credentials: mockCredentials,
          scopes: [SCOPES.GMAIL.READONLY],
          tokenStore: store,
        });

        const result = await auth.refreshToken('user@example.com');
        expect(result.ok).toBe(false);
      });

      it('should return error for unknown account', async () => {
        const auth = createAuthEngine({
          credentials: mockCredentials,
          scopes: [SCOPES.GMAIL.READONLY],
          tokenStore: createMemoryTokenStore(),
        });

        const result = await auth.refreshToken('unknown@example.com');
        expect(result.ok).toBe(false);
      });
    });

    describe('headlessFlow', () => {
      it('should return auth URL and exchange function', async () => {
        const auth = createAuthEngine({
          credentials: mockCredentials,
          scopes: [SCOPES.GMAIL.READONLY],
          tokenStore: createMemoryTokenStore(),
        });

        const result = await auth.headlessFlow('user@example.com');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.authUrl).toContain('accounts.google.com');
          expect(result.value.authUrl).toContain(mockCredentials.clientId);
          expect(typeof result.value.exchange).toBe('function');
        }
      });
    });

    describe('revokeToken', () => {
      it('should succeed for non-existent account', async () => {
        const auth = createAuthEngine({
          credentials: mockCredentials,
          scopes: [SCOPES.GMAIL.READONLY],
          tokenStore: createMemoryTokenStore(),
        });

        const result = await auth.revokeToken('nonexistent@example.com');
        expect(result.ok).toBe(true);
      });
    });
  });

  describe('loadCredentialsFile', () => {
    it('should return error for non-existent file', async () => {
      const result = await loadCredentialsFile('/nonexistent/path/credentials.json');
      expect(result.ok).toBe(false);
    });
  });
});
