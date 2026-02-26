import { describe, it, expect } from 'vitest';
import { createServiceAccountAuth, loadServiceAccountKey } from './service-account.js';
import { createMemoryTokenStore } from './token-store.js';
import { SCOPES } from './scopes.js';
import type { ServiceAccountKey } from './service-account.js';

const mockKey: ServiceAccountKey = {
  type: 'service_account',
  projectId: 'test-project',
  privateKeyId: 'key-123',
  privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIBogIBAAJBALRiMLInjCqLHO+3Gz4B2pVNK+dVx45pLoXg7oxkIxo/RnFC/sLK\n2fHcfBXEsqR5227/fBstGAJp0IF0ygS8n10CAwEAAQJANwMCAHhHg8GnOATWgcmD\ns2WsDDLz2JAxMmN8K1XWkYe1MPOR+p/sAl2VPM4sR7Y4FwjQKMQWUfj3NtH3KMi8\nqQIhAN9WpfTJKPkxkIzOBHfnGFl3R4i7tH0Bk8OjL7bTnsfDAiEA0hRn6MKMlk6P\nOA2XcPSNJJV+bvGw5KJi8MCr+cj0TKsCIFw2J5A8M+a1tT3RKj9iiCLT7vVPnCBb\ne0A5p5J3ysphAiEAyuCJJOFf/pYFPDep42k+0HCNIw3ckVjFjWK8LVUYz+sCICKi\nvTyPxOKHQ0FYJ0T/iYUW6Ysn3bAaLVQRK2s+w9Mh\n-----END RSA PRIVATE KEY-----\n',
  clientEmail: 'test@test-project.iam.gserviceaccount.com',
  clientId: '123456789',
  authUri: 'https://accounts.google.com/o/oauth2/auth',
  tokenUri: 'https://oauth2.googleapis.com/token',
};

describe('service-account', () => {
  describe('createServiceAccountAuth', () => {
    it('should create a service account auth', () => {
      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
      });

      expect(auth).toBeDefined();
      expect(auth.getToken).toBeDefined();
      expect(auth.authenticate).toBeDefined();
      expect(auth.getEmail).toBeDefined();
      expect(auth.getSubject).toBeDefined();
    });

    it('should return service account email', () => {
      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
      });

      expect(auth.getEmail()).toBe('test@test-project.iam.gserviceaccount.com');
    });

    it('should return undefined subject when not set', () => {
      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
      });

      expect(auth.getSubject()).toBeUndefined();
    });

    it('should return subject when set', () => {
      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
        subject: 'admin@example.com',
      });

      expect(auth.getSubject()).toBe('admin@example.com');
    });

    it('should return cached token if still valid', async () => {
      const store = createMemoryTokenStore();
      const accountKey = `sa:${mockKey.clientEmail}`;
      await store.set(accountKey, {
        accessToken: 'cached-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      });

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: store,
      });

      const result = await auth.getToken();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('cached-token');
      }
    });
  });

  describe('loadServiceAccountKey', () => {
    it('should return error for non-existent file', async () => {
      const result = await loadServiceAccountKey('/nonexistent/service-account.json');
      expect(result.ok).toBe(false);
    });
  });
});
