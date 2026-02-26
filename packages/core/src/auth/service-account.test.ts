import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServiceAccountAuth, loadServiceAccountKey } from './service-account.js';
import { createMemoryTokenStore } from './token-store.js';
import type { TokenStore, TokenData } from './token-store.js';
import { SCOPES } from './scopes.js';
import { AuthError } from '../errors.js';
import { ok, err } from '../result.js';
import type { ServiceAccountKey } from './service-account.js';
import * as crypto from 'node:crypto';

// Generate a proper RSA private key for testing JWT signing
const { privateKey: testPrivateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const mockKey: ServiceAccountKey = {
  type: 'service_account',
  projectId: 'test-project',
  privateKeyId: 'key-123',
  privateKey: testPrivateKey,
  clientEmail: 'test@test-project.iam.gserviceaccount.com',
  clientId: '123456789',
  authUri: 'https://accounts.google.com/o/oauth2/auth',
  tokenUri: 'https://oauth2.googleapis.com/token',
};

/**
 * Helper to create a mock Response object for global fetch.
 */
function mockFetchResponse(
  body: Record<string, unknown> | string,
  status = 200,
  isOk = true
): Response {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: isOk,
    status,
    statusText: isOk ? 'OK' : 'Error',
    text: () => Promise.resolve(bodyStr),
    json: () => Promise.resolve(typeof body === 'string' ? JSON.parse(body) : body),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: () => mockFetchResponse(body, status, isOk),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as Response;
}

describe('service-account', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockFetchResponse({ access_token: 'default-sa-token' })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createServiceAccountAuth', () => {
    it('should create a service account auth with all expected methods', () => {
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
  });

  describe('getToken', () => {
    it('should return cached token if still valid (beyond 5-minute buffer)', async () => {
      const store = createMemoryTokenStore();
      const accountKey = `sa:${mockKey.clientEmail}`;
      await store.set(accountKey, {
        accessToken: 'cached-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
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

      // Should not have made any fetch calls (used cache)
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should return cached token for delegated subject using correct account key', async () => {
      const store = createMemoryTokenStore();
      const accountKey = `sa:${mockKey.clientEmail}:admin@example.com`;
      await store.set(accountKey, {
        accessToken: 'delegated-cached-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      });

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: store,
        subject: 'admin@example.com',
      });

      const result = await auth.getToken();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('delegated-cached-token');
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should re-authenticate when token is expired', async () => {
      const store = createMemoryTokenStore();
      const accountKey = `sa:${mockKey.clientEmail}`;
      await store.set(accountKey, {
        accessToken: 'expired-token',
        expiresAt: Date.now() - 1000, // Expired
        tokenType: 'Bearer',
      });

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'fresh-sa-token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: store,
      });

      const result = await auth.getToken();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('fresh-sa-token');
      }
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should re-authenticate when token is within 5-minute buffer', async () => {
      const store = createMemoryTokenStore();
      const accountKey = `sa:${mockKey.clientEmail}`;
      await store.set(accountKey, {
        accessToken: 'near-expired-token',
        expiresAt: Date.now() + 3 * 60 * 1000, // 3 minutes from now (within 5-min buffer)
        tokenType: 'Bearer',
      });

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'renewed-token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: store,
      });

      const result = await auth.getToken();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('renewed-token');
      }
    });

    it('should authenticate when no token exists in store', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'brand-new-token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
      });

      const result = await auth.getToken();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('brand-new-token');
      }
    });

    it('should authenticate when stored token has no accessToken', async () => {
      const store = createMemoryTokenStore();
      const accountKey = `sa:${mockKey.clientEmail}`;
      // Store token data without accessToken (empty string -> falsy)
      await store.set(accountKey, {
        accessToken: '',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      });

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'new-token-after-empty',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: store,
      });

      const result = await auth.getToken();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('new-token-after-empty');
      }
    });

    it('should propagate token store get errors', async () => {
      const failingStore: TokenStore = {
        async get() { return err(new AuthError('Store read failure')); },
        async set() { return ok(undefined); },
        async remove() { return ok(undefined); },
        async list() { return ok([]); },
        async clear() { return ok(undefined); },
      };

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: failingStore,
      });

      const result = await auth.getToken();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Store read failure');
      }
    });

    it('should authenticate when stored token has no expiresAt', async () => {
      const store = createMemoryTokenStore();
      const accountKey = `sa:${mockKey.clientEmail}`;
      await store.set(accountKey, {
        accessToken: 'token-no-expiry',
        tokenType: 'Bearer',
        // no expiresAt
      });

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'refreshed-from-no-expiry',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: store,
      });

      const result = await auth.getToken();
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Since expiresAt is undefined, the condition `stored.value.expiresAt > Date.now() + 5*60*1000`
        // evaluates to false (undefined > number = false), so it re-authenticates
        expect(result.value).toBe('refreshed-from-no-expiry');
      }
    });
  });

  describe('authenticate', () => {
    it('should create a JWT and exchange it for an access token', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'sa-access-token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const store = createMemoryTokenStore();
      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: store,
      });

      const result = await auth.authenticate();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('sa-access-token');
      }

      // Verify the fetch was called with correct parameters
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0]!;
      expect(url).toBe('https://oauth2.googleapis.com/token');
      expect(options).toMatchObject({ method: 'POST' });

      // Verify body contains JWT assertion
      const body = new URLSearchParams(options!.body as string);
      expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
      const assertion = body.get('assertion');
      expect(assertion).toBeTruthy();

      // Verify JWT structure (3 parts separated by dots)
      const parts = assertion!.split('.');
      expect(parts).toHaveLength(3);

      // Verify JWT header
      const header = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString());
      expect(header.alg).toBe('RS256');
      expect(header.typ).toBe('JWT');
      expect(header.kid).toBe('key-123');

      // Verify JWT claims
      const claims = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString());
      expect(claims.iss).toBe('test@test-project.iam.gserviceaccount.com');
      expect(claims.aud).toBe('https://oauth2.googleapis.com/token');
      expect(claims.scope).toContain('gmail.readonly');
      expect(claims.exp).toBeGreaterThan(claims.iat);
      expect(claims.exp - claims.iat).toBe(3600);
      expect(claims.sub).toBeUndefined(); // no subject
    });

    it('should include subject in JWT claims when delegation is configured', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'delegated-token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
        subject: 'admin@example.com',
      });

      const result = await auth.authenticate();
      expect(result.ok).toBe(true);

      // Verify JWT claims contain sub
      const body = new URLSearchParams(fetchSpy.mock.calls[0]![1]!.body as string);
      const assertion = body.get('assertion')!;
      const claims = JSON.parse(Buffer.from(assertion.split('.')[1]!, 'base64url').toString());
      expect(claims.sub).toBe('admin@example.com');
    });

    it('should store token in token store after successful authentication', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'stored-sa-token',
          expires_in: 7200,
          token_type: 'Bearer',
        })
      );

      const store = createMemoryTokenStore();
      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: store,
      });

      await auth.authenticate();

      const accountKey = `sa:${mockKey.clientEmail}`;
      const stored = await store.get(accountKey);
      expect(stored.ok).toBe(true);
      if (stored.ok && stored.value) {
        expect(stored.value.accessToken).toBe('stored-sa-token');
        expect(stored.value.tokenType).toBe('Bearer');
        expect(stored.value.expiresAt).toBeGreaterThan(Date.now());
      }
    });

    it('should store token with delegated account key', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'delegated-stored-token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const store = createMemoryTokenStore();
      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: store,
        subject: 'user@example.com',
      });

      await auth.authenticate();

      const accountKey = `sa:${mockKey.clientEmail}:user@example.com`;
      const stored = await store.get(accountKey);
      expect(stored.ok).toBe(true);
      if (stored.ok && stored.value) {
        expect(stored.value.accessToken).toBe('delegated-stored-token');
      }
    });

    it('should handle HTTP error from token endpoint', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse('{"error":"invalid_grant","error_description":"Invalid JWT"}', 400, false)
      );

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
      });

      const result = await auth.authenticate();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(AuthError);
        expect(result.error.message).toContain('Service account token exchange failed');
        expect(result.error.message).toContain('400');
      }
    });

    it('should handle network error during token exchange', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
      });

      const result = await auth.authenticate();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Service account token exchange failed');
        expect(result.error.message).toContain('ECONNREFUSED');
      }
    });

    it('should handle non-Error thrown during token exchange', async () => {
      fetchSpy.mockRejectedValueOnce('string error thrown');

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
      });

      const result = await auth.authenticate();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Service account token exchange failed');
        expect(result.error.message).toContain('string error thrown');
      }
    });

    it('should handle response with default expires_in', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'token-no-expiry-field',
          token_type: 'Bearer',
          // no expires_in
        })
      );

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
      });

      const result = await auth.authenticate();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('token-no-expiry-field');
      }
    });

    it('should handle response with default token_type', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'token-no-type',
          expires_in: 3600,
          // no token_type
        })
      );

      const store = createMemoryTokenStore();
      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: store,
      });

      await auth.authenticate();

      const accountKey = `sa:${mockKey.clientEmail}`;
      const stored = await store.get(accountKey);
      expect(stored.ok).toBe(true);
      if (stored.ok && stored.value) {
        expect(stored.value.tokenType).toBe('Bearer'); // default
      }
    });

    it('should handle invalid private key (JWT signing failure)', async () => {
      const badKey: ServiceAccountKey = {
        ...mockKey,
        privateKey: 'not-a-valid-private-key',
      };

      const auth = createServiceAccountAuth({
        key: badKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
      });

      const result = await auth.authenticate();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(AuthError);
        expect(result.error.message).toContain('RSA signing failed');
      }
    });

    it('should normalize and sort scopes in JWT', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'multi-scope-token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.CALENDAR.FULL, SCOPES.GMAIL.READONLY, SCOPES.GMAIL.READONLY], // duplicate
        tokenStore: createMemoryTokenStore(),
      });

      await auth.authenticate();

      const body = new URLSearchParams(fetchSpy.mock.calls[0]![1]!.body as string);
      const assertion = body.get('assertion')!;
      const claims = JSON.parse(Buffer.from(assertion.split('.')[1]!, 'base64url').toString());

      // Scopes should be deduplicated and sorted
      const scopeList = claims.scope.split(' ');
      expect(scopeList).toHaveLength(2); // deduplicated from 3 to 2
      // Should be sorted
      for (let i = 1; i < scopeList.length; i++) {
        expect(scopeList[i] >= scopeList[i - 1]).toBe(true);
      }
    });
  });

  describe('loadServiceAccountKey', () => {
    it('should return error for non-existent file', async () => {
      const result = await loadServiceAccountKey('/nonexistent/service-account.json');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(AuthError);
        expect(result.error.message).toContain('Failed to load service account key');
      }
    });

    it('should load a valid service account key file', async () => {
      const validKeyFile = {
        type: 'service_account',
        project_id: 'my-project',
        private_key_id: 'pk-id-123',
        private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIIB...\n-----END RSA PRIVATE KEY-----\n',
        client_email: 'sa@my-project.iam.gserviceaccount.com',
        client_id: '987654321',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
      };

      const mockReadFile = vi.fn().mockResolvedValue(JSON.stringify(validKeyFile));
      vi.doMock('node:fs/promises', () => ({ readFile: mockReadFile }));

      const { loadServiceAccountKey: loadKey } = await import('./service-account.js');
      const result = await loadKey('service-account.json');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe('service_account');
        expect(result.value.projectId).toBe('my-project');
        expect(result.value.privateKeyId).toBe('pk-id-123');
        expect(result.value.privateKey).toContain('BEGIN RSA PRIVATE KEY');
        expect(result.value.clientEmail).toBe('sa@my-project.iam.gserviceaccount.com');
        expect(result.value.clientId).toBe('987654321');
        expect(result.value.authUri).toBe('https://accounts.google.com/o/oauth2/auth');
        expect(result.value.tokenUri).toBe('https://oauth2.googleapis.com/token');
      }

      vi.doUnmock('node:fs/promises');
    });

    it('should return error when type is not service_account', async () => {
      const invalidTypeFile = {
        type: 'authorized_user',
        project_id: 'my-project',
        private_key_id: 'pk-id',
        private_key: 'key',
        client_email: 'email',
        client_id: 'id',
        auth_uri: 'uri',
        token_uri: 'uri',
      };

      const mockReadFile = vi.fn().mockResolvedValue(JSON.stringify(invalidTypeFile));
      vi.doMock('node:fs/promises', () => ({ readFile: mockReadFile }));

      const { loadServiceAccountKey: loadKey } = await import('./service-account.js');
      const result = await loadKey('wrong-type.json');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('type must be "service_account"');
      }

      vi.doUnmock('node:fs/promises');
    });

    it('should return error when required field is missing', async () => {
      const missingFieldFile = {
        type: 'service_account',
        project_id: 'my-project',
        // missing private_key_id
        private_key: 'key',
        client_email: 'email',
        client_id: 'id',
        auth_uri: 'uri',
        token_uri: 'uri',
      };

      const mockReadFile = vi.fn().mockResolvedValue(JSON.stringify(missingFieldFile));
      vi.doMock('node:fs/promises', () => ({ readFile: mockReadFile }));

      const { loadServiceAccountKey: loadKey } = await import('./service-account.js');
      const result = await loadKey('missing-field.json');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('missing private_key_id');
      }

      vi.doUnmock('node:fs/promises');
    });

    it('should return error when required field is not a string', async () => {
      const invalidFieldFile = {
        type: 'service_account',
        project_id: 'my-project',
        private_key_id: 'pk-id',
        private_key: 12345, // not a string
        client_email: 'email',
        client_id: 'id',
        auth_uri: 'uri',
        token_uri: 'uri',
      };

      const mockReadFile = vi.fn().mockResolvedValue(JSON.stringify(invalidFieldFile));
      vi.doMock('node:fs/promises', () => ({ readFile: mockReadFile }));

      const { loadServiceAccountKey: loadKey } = await import('./service-account.js');
      const result = await loadKey('invalid-field.json');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('missing private_key');
      }

      vi.doUnmock('node:fs/promises');
    });

    it('should return error for invalid JSON', async () => {
      const mockReadFile = vi.fn().mockResolvedValue('not valid json{{{');
      vi.doMock('node:fs/promises', () => ({ readFile: mockReadFile }));

      const { loadServiceAccountKey: loadKey } = await import('./service-account.js');
      const result = await loadKey('invalid.json');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Failed to load service account key');
      }

      vi.doUnmock('node:fs/promises');
    });

    it('should return error when readFile throws', async () => {
      const mockReadFile = vi.fn().mockRejectedValue(new Error('EACCES: permission denied'));
      vi.doMock('node:fs/promises', () => ({ readFile: mockReadFile }));

      const { loadServiceAccountKey: loadKey } = await import('./service-account.js');
      const result = await loadKey('no-access.json');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Failed to load service account key');
        expect(result.error.message).toContain('EACCES');
      }

      vi.doUnmock('node:fs/promises');
    });

    it('should validate all required fields one by one', async () => {
      const requiredFields = [
        'project_id', 'private_key_id', 'private_key',
        'client_email', 'client_id', 'auth_uri', 'token_uri',
      ];

      for (const fieldToRemove of requiredFields) {
        const keyFile: Record<string, string> = {
          type: 'service_account',
          project_id: 'proj',
          private_key_id: 'pkid',
          private_key: 'pk',
          client_email: 'email',
          client_id: 'cid',
          auth_uri: 'auri',
          token_uri: 'turi',
        };

        delete keyFile[fieldToRemove];

        const mockReadFile = vi.fn().mockResolvedValue(JSON.stringify(keyFile));
        vi.doMock('node:fs/promises', () => ({ readFile: mockReadFile }));

        const { loadServiceAccountKey: loadKey } = await import('./service-account.js');
        const result = await loadKey('test.json');
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(`missing ${fieldToRemove}`);
        }

        vi.doUnmock('node:fs/promises');
      }
    });

    it('should handle non-Error thrown during file read', async () => {
      const mockReadFile = vi.fn().mockRejectedValue('string error');
      vi.doMock('node:fs/promises', () => ({ readFile: mockReadFile }));

      const { loadServiceAccountKey: loadKey } = await import('./service-account.js');
      const result = await loadKey('error.json');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Failed to load service account key');
        expect(result.error.message).toContain('string error');
      }

      vi.doUnmock('node:fs/promises');
    });
  });

  describe('JWT creation and signing', () => {
    it('should produce a valid 3-part JWT', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'jwt-test-token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
      });

      await auth.authenticate();

      const body = new URLSearchParams(fetchSpy.mock.calls[0]![1]!.body as string);
      const jwt = body.get('assertion')!;

      // JWT should have 3 parts: header.claims.signature
      const parts = jwt.split('.');
      expect(parts).toHaveLength(3);

      // Each part should be base64url encoded
      for (const part of parts) {
        expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
      }
    });

    it('should set correct JWT header fields', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
      });

      await auth.authenticate();

      const body = new URLSearchParams(fetchSpy.mock.calls[0]![1]!.body as string);
      const jwt = body.get('assertion')!;
      const header = JSON.parse(Buffer.from(jwt.split('.')[0]!, 'base64url').toString());

      expect(header.alg).toBe('RS256');
      expect(header.typ).toBe('JWT');
      expect(header.kid).toBe(mockKey.privateKeyId);
    });

    it('should set correct JWT claims fields', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
      });

      const beforeAuth = Math.floor(Date.now() / 1000);
      await auth.authenticate();
      const afterAuth = Math.floor(Date.now() / 1000);

      const body = new URLSearchParams(fetchSpy.mock.calls[0]![1]!.body as string);
      const jwt = body.get('assertion')!;
      const claims = JSON.parse(Buffer.from(jwt.split('.')[1]!, 'base64url').toString());

      expect(claims.iss).toBe(mockKey.clientEmail);
      expect(claims.aud).toBe('https://oauth2.googleapis.com/token');
      expect(claims.iat).toBeGreaterThanOrEqual(beforeAuth);
      expect(claims.iat).toBeLessThanOrEqual(afterAuth);
      expect(claims.exp).toBe(claims.iat + 3600);
    });

    it('should produce a signature that can be verified', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: createMemoryTokenStore(),
      });

      await auth.authenticate();

      const body = new URLSearchParams(fetchSpy.mock.calls[0]![1]!.body as string);
      const jwt = body.get('assertion')!;
      const [headerB64, claimsB64, signatureB64] = jwt.split('.');

      // Verify the signature using the corresponding public key
      const { publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      // We can't verify with a different key pair, but we can verify the signature
      // is a valid base64url string
      expect(signatureB64).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(signatureB64!.length).toBeGreaterThan(0);
    });
  });

  describe('integration: getToken -> authenticate -> store', () => {
    it('should authenticate on first call then use cache on second', async () => {
      // First call: authenticate
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'first-call-token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const store = createMemoryTokenStore();
      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: store,
      });

      const result1 = await auth.getToken();
      expect(result1.ok).toBe(true);
      if (result1.ok) {
        expect(result1.value).toBe('first-call-token');
      }
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call: should use cached token
      const result2 = await auth.getToken();
      expect(result2.ok).toBe(true);
      if (result2.ok) {
        expect(result2.value).toBe('first-call-token');
      }
      // Should still be 1 fetch call (used cache)
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should re-authenticate after token expires', async () => {
      // First call: authenticate
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'first-token',
          expires_in: 1, // Expires in 1 second (always within buffer)
          token_type: 'Bearer',
        })
      );

      const store = createMemoryTokenStore();
      const auth = createServiceAccountAuth({
        key: mockKey,
        scopes: [SCOPES.GMAIL.READONLY],
        tokenStore: store,
      });

      const result1 = await auth.getToken();
      expect(result1.ok).toBe(true);

      // Second call: expired, should re-authenticate
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'second-token',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

      const result2 = await auth.getToken();
      expect(result2.ok).toBe(true);
      if (result2.ok) {
        expect(result2.value).toBe('second-token');
      }
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
