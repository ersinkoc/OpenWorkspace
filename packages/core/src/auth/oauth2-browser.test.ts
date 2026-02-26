import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as http from 'node:http';
import { createMemoryTokenStore } from './token-store.js';
import { SCOPES } from './scopes.js';

// Mock crypto functions to return predictable values
const MOCK_STATE = 'mock-state-value-for-testing-12345';
const MOCK_VERIFIER = 'mock-code-verifier-for-testing-1234567890abc';
const MOCK_CHALLENGE = 'mock-challenge';

vi.mock('./crypto.js', async () => {
  const actual = await vi.importActual<typeof import('./crypto.js')>('./crypto.js');
  return {
    ...actual,
    generateRandomString: (len: number) => {
      // First call is for state (32 chars), second for codeVerifier (43 chars)
      if (len === 32) return MOCK_STATE;
      if (len === 43) return MOCK_VERIFIER;
      return actual.generateRandomString(len);
    },
    sha256Base64Url: () => MOCK_CHALLENGE,
  };
});

const mockCredentials = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
};

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

function httpGet(url: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode ?? 0, body });
      });
    }).on('error', reject);
  });
}

describe('browserFlow – uncovered paths', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockFetchResponse({ access_token: 'default-token' })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle no-code callback with matching state', async () => {
    const { createAuthEngine } = await import('./oauth2.js');

    const store = createMemoryTokenStore();
    const auth = createAuthEngine({
      credentials: mockCredentials,
      scopes: [SCOPES.GMAIL.READONLY],
      tokenStore: store,
    });

    const port = 30000 + Math.floor(Math.random() * 5000);
    const flowPromise = auth.browserFlow('user@example.com', port);

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 200));

    // Send callback with correct state but no code
    await httpGet(`http://localhost:${port}/callback?state=${MOCK_STATE}`);

    const result = await flowPromise;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('No authorization code received');
    }
  }, 10000);

  it('should handle successful token exchange with matching state and code', async () => {
    const { createAuthEngine } = await import('./oauth2.js');

    fetchSpy.mockResolvedValueOnce(
      mockFetchResponse({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
      })
    );

    const store = createMemoryTokenStore();
    const auth = createAuthEngine({
      credentials: mockCredentials,
      scopes: [SCOPES.GMAIL.READONLY],
      tokenStore: store,
    });

    const port = 35000 + Math.floor(Math.random() * 5000);
    const flowPromise = auth.browserFlow('user@example.com', port);

    await new Promise(resolve => setTimeout(resolve, 200));

    // Send callback with correct state and code
    await httpGet(`http://localhost:${port}/callback?state=${MOCK_STATE}&code=auth-code-123`);

    const result = await flowPromise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.accessToken).toBe('new-access-token');
      expect(result.value.refreshToken).toBe('new-refresh-token');
    }

    // Verify token was stored
    const stored = await store.get('user@example.com');
    expect(stored.ok).toBe(true);
    if (stored.ok && stored.value) {
      expect(stored.value.accessToken).toBe('new-access-token');
    }
  }, 10000);

  it('should handle failed token exchange with matching state and code', async () => {
    const { createAuthEngine } = await import('./oauth2.js');

    fetchSpy.mockResolvedValueOnce(
      mockFetchResponse('Token exchange error', 400, false)
    );

    const store = createMemoryTokenStore();
    const auth = createAuthEngine({
      credentials: mockCredentials,
      scopes: [SCOPES.GMAIL.READONLY],
      tokenStore: store,
    });

    const port = 36000 + Math.floor(Math.random() * 5000);
    const flowPromise = auth.browserFlow('user@example.com', port);

    await new Promise(resolve => setTimeout(resolve, 200));

    // Send callback with correct state and code, but fetch will fail
    await httpGet(`http://localhost:${port}/callback?state=${MOCK_STATE}&code=bad-code`);

    const result = await flowPromise;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Token exchange failed');
    }
  }, 10000);

  it('should time out after 5 minutes', async () => {
    const { createAuthEngine } = await import('./oauth2.js');

    const store = createMemoryTokenStore();
    const auth = createAuthEngine({
      credentials: mockCredentials,
      scopes: [SCOPES.GMAIL.READONLY],
      tokenStore: store,
    });

    const port = 37000 + Math.floor(Math.random() * 5000);

    // Use fake timers for this test
    vi.useFakeTimers();

    const flowPromise = auth.browserFlow('user@example.com', port);

    // Advance time past the 5-minute timeout
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1000);

    const result = await flowPromise;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('timed out');
    }

    vi.useRealTimers();
  }, 15000);
});
