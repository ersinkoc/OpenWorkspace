/**
 * OAuth2 authentication flows for Google APIs.
 * Supports browser redirect, headless (manual paste), and device code flows.
 * Zero-dependency implementation using Node.js native modules.
 */

import * as http from 'node:http';
import * as crypto from 'node:crypto';
import type { Result } from '../result.js';
import { ok, err } from '../result.js';
import { AuthError } from '../errors.js';
import { generateRandomString, sha256Base64Url } from './crypto.js';
import type { TokenData, TokenStore } from './token-store.js';
import { normalizeScopes } from './scopes.js';

/**
 * Google OAuth2 endpoints.
 */
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DEVICE_CODE_URL = 'https://oauth2.googleapis.com/device/code';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

/**
 * OAuth2 client credentials.
 */
export type OAuthCredentials = {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
};

/**
 * OAuth2 flow configuration.
 */
export type OAuth2Config = {
  credentials: OAuthCredentials;
  scopes: string[];
  tokenStore: TokenStore;
  /** Access type: 'offline' for refresh tokens */
  accessType?: 'offline' | 'online';
  /** Prompt type for consent */
  prompt?: 'none' | 'consent' | 'select_account';
};

/**
 * Device code flow response from Google.
 */
export type DeviceCodeResponse = {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  interval: number;
};

/**
 * OAuth2 auth engine for Google API authentication.
 */
export type AuthEngine = {
  /**
   * Get a valid access token for an account.
   * Automatically refreshes expired tokens.
   *
   * @example
   * const token = await auth.getToken('user@example.com');
   * if (token.ok) fetch(url, { headers: { Authorization: `Bearer ${token.value}` } });
   */
  getToken(account: string): Promise<Result<string, AuthError>>;

  /**
   * Start browser-based OAuth2 flow.
   * Opens a local HTTP server, redirects user to Google consent screen.
   *
   * @example
   * const result = await auth.browserFlow('user@example.com');
   */
  browserFlow(account: string, port?: number): Promise<Result<TokenData, AuthError>>;

  /**
   * Start headless OAuth2 flow.
   * Returns an auth URL for the user to visit manually.
   *
   * @example
   * const result = await auth.headlessFlow('user@example.com');
   */
  headlessFlow(account: string): Promise<Result<{ authUrl: string; exchange: (code: string) => Promise<Result<TokenData, AuthError>> }, AuthError>>;

  /**
   * Start device code OAuth2 flow.
   * For environments without a browser (servers, CI).
   *
   * @example
   * const result = await auth.deviceCodeFlow('user@example.com');
   */
  deviceCodeFlow(account: string): Promise<Result<DeviceCodeResponse & { poll: () => Promise<Result<TokenData, AuthError>> }, AuthError>>;

  /**
   * Refresh an existing token.
   */
  refreshToken(account: string): Promise<Result<TokenData, AuthError>>;

  /**
   * Revoke a token.
   */
  revokeToken(account: string): Promise<Result<void, AuthError>>;

  /**
   * Check if a token is valid (not expired).
   */
  isTokenValid(account: string): Promise<Result<boolean, AuthError>>;

  /**
   * List authenticated accounts.
   */
  listAccounts(): Promise<Result<string[], AuthError>>;

  /**
   * Remove an account's tokens.
   */
  removeAccount(account: string): Promise<Result<void, AuthError>>;
};

/**
 * Exchanges an authorization code for tokens.
 */
async function exchangeCodeForTokens(
  code: string,
  credentials: OAuthCredentials,
  redirectUri: string,
  codeVerifier?: string
): Promise<Result<TokenData, AuthError>> {
  try {
    const body = new URLSearchParams({
      code,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    if (codeVerifier) {
      body.set('code_verifier', codeVerifier);
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      // Sanitize error body to prevent information leakage
      let errorBody: string;
      try {
        const errorData = (await response.json()) as Record<string, unknown>;
        errorBody = String(errorData['error'] ?? 'unknown_error');
      } catch {
        errorBody = 'unknown_error';
      }
      return err(new AuthError(`Token exchange failed: ${response.status} ${errorBody}`));
    }

    const data = (await response.json()) as Record<string, unknown>;
    const expiresIn = typeof data['expires_in'] === 'number' ? data['expires_in'] : 3600;

    const tokenData: TokenData = {
      accessToken: String(data['access_token'] ?? ''),
      refreshToken: data['refresh_token'] ? String(data['refresh_token']) : undefined,
      expiresAt: Date.now() + expiresIn * 1000,
      tokenType: String(data['token_type'] ?? 'Bearer'),
      scopes: typeof data['scope'] === 'string' ? data['scope'].split(' ') : undefined,
    };

    return ok(tokenData);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(new AuthError(`Token exchange failed: ${message}`));
  }
}

/**
 * Refreshes an access token using a refresh token.
 */
async function refreshAccessToken(
  refreshToken: string,
  credentials: OAuthCredentials
): Promise<Result<TokenData, AuthError>> {
  try {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_type: 'refresh_token',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      // Sanitize error body to prevent information leakage
      let errorBody: string;
      try {
        const errorData = (await response.json()) as Record<string, unknown>;
        errorBody = String(errorData['error'] ?? 'unknown_error');
      } catch {
        errorBody = 'unknown_error';
      }
      return err(new AuthError(`Token refresh failed: ${response.status} ${errorBody}`));
    }

    const data = (await response.json()) as Record<string, unknown>;
    const expiresIn = typeof data['expires_in'] === 'number' ? data['expires_in'] : 3600;

    return ok({
      accessToken: String(data['access_token'] ?? ''),
      refreshToken: data['refresh_token'] ? String(data['refresh_token']) : refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      tokenType: String(data['token_type'] ?? 'Bearer'),
      scopes: typeof data['scope'] === 'string' ? data['scope'].split(' ') : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(new AuthError(`Token refresh failed: ${message}`));
  }
}

/**
 * Builds a Google OAuth2 authorization URL with PKCE support.
 */
function buildAuthUrl(
  credentials: OAuthCredentials,
  scopes: string[],
  redirectUri: string,
  state: string,
  codeChallenge?: string,
  accessType: string = 'offline',
  prompt: string = 'consent'
): string {
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: normalizeScopes(scopes).join(' '),
    access_type: accessType,
    prompt,
    state,
  });

  if (codeChallenge) {
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Creates an OAuth2 auth engine.
 *
 * @example
 * const auth = createAuthEngine({
 *   credentials: { clientId: '...', clientSecret: '...' },
 *   scopes: [SCOPES.GMAIL.READONLY],
 *   tokenStore: createMemoryTokenStore(),
 * });
 */
export function createAuthEngine(config: OAuth2Config): AuthEngine {
  const { credentials, scopes, tokenStore } = config;
  const accessType = config.accessType ?? 'offline';
  const prompt = config.prompt ?? 'consent';

  // Track active browser flows to prevent state confusion from concurrent flows
  const activeFlows = new Map<string, { state: string; codeVerifier: string }>();

  return {
    async getToken(account) {
      const stored = await tokenStore.get(account);
      if (!stored.ok) return stored;

      if (!stored.value) {
        return err(new AuthError(`No token found for account: ${account}`));
      }

      const token = stored.value;

      // Check if token is still valid (with 5-minute buffer)
      if (token.expiresAt && token.expiresAt > Date.now() + 5 * 60 * 1000) {
        return ok(token.accessToken);
      }

      // Try to refresh
      if (token.refreshToken) {
        const refreshed = await refreshAccessToken(token.refreshToken, credentials);
        if (refreshed.ok) {
          await tokenStore.set(account, refreshed.value);
          return ok(refreshed.value.accessToken);
        }
      }

      return err(new AuthError(`Token expired for account: ${account}. Re-authentication required.`));
    },

    async browserFlow(account, port = 8085) {
      const state = generateRandomString(32);
      const codeVerifier = generateRandomString(43);
      const codeChallenge = sha256Base64Url(codeVerifier);
      const redirectUri = credentials.redirectUri ?? `http://localhost:${port}/callback`;

      // Register this flow to prevent state confusion from concurrent flows
      const flowKey = `${account}:${port}`;
      activeFlows.set(flowKey, { state, codeVerifier });

      const authUrl = buildAuthUrl(
        credentials, scopes, redirectUri, state, codeChallenge, accessType, prompt
      );

      return new Promise<Result<TokenData, AuthError>>((resolve) => {
        const server = http.createServer(async (req, res) => {
          const url = new URL(req.url ?? '/', `http://localhost:${port}`);

          if (url.pathname !== '/callback') {
            res.writeHead(404);
            res.end('Not found');
            return;
          }

          const receivedState = url.searchParams.get('state');
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          // Retrieve the expected state for this flow before cleanup
          const flowData = activeFlows.get(flowKey);

          // Clean up flow registration
          activeFlows.delete(flowKey);

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>Authentication Failed</h1><p>You can close this window.</p></body></html>');
            clearTimeout(timeoutId);
            server.close();
            resolve(err(new AuthError(`OAuth2 error: ${error}`)));
            return;
          }

          // Validate state
          if (!flowData || receivedState !== flowData.state) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>State Mismatch</h1><p>Authentication failed. You can close this window.</p></body></html>');
            clearTimeout(timeoutId);
            server.close();
            resolve(err(new AuthError('OAuth2 state mismatch')));
            return;
          }

          if (!code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>No Code</h1><p>Authentication failed. You can close this window.</p></body></html>');
            clearTimeout(timeoutId);
            server.close();
            resolve(err(new AuthError('No authorization code received')));
            return;
          }

          try {
            const tokenResult = await exchangeCodeForTokens(code, credentials, redirectUri, flowData?.codeVerifier);

            if (tokenResult.ok) {
              await tokenStore.set(account, tokenResult.value);
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end('<html><body><h1>Authentication Successful</h1><p>You can close this window.</p></body></html>');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end('<html><body><h1>Authentication Failed</h1><p>You can close this window.</p></body></html>');
            }

            clearTimeout(timeoutId);
            server.close();
            resolve(tokenResult);
          } catch (error) {
            clearTimeout(timeoutId);
            server.close();
            const message = error instanceof Error ? error.message : String(error);
            resolve(err(new AuthError(`Token exchange failed: ${message}`)));
          }
        });

        server.listen(port, '127.0.0.1', () => {
          // In a real CLI, this would open the browser
          // For now, consumers should handle opening the URL
          // The server is ready, consumer should navigate to authUrl
        });

        // Handle server errors (e.g., port already in use)
        server.on('error', (serverError) => {
          activeFlows.delete(flowKey);
          server.close();
          resolve(err(new AuthError(`Failed to start OAuth2 server: ${serverError.message}`)));
        });

        // Expose the auth URL via a custom property on the promise
        // Consumers can access it before the promise resolves
        (server as unknown as Record<string, unknown>)['authUrl'] = authUrl;

        // Timeout after 5 minutes
        const timeoutId = setTimeout(() => {
          activeFlows.delete(flowKey);
          server.close();
          resolve(err(new AuthError('Browser authentication timed out after 5 minutes')));
        }, 5 * 60 * 1000);
      });
    },

    async headlessFlow(account) {
      // eslint-disable-next-line no-console
      console.warn('Warning: Using deprecated OAuth2 out-of-band (OOB) flow. Google has deprecated this flow. Consider using browserFlow or deviceCodeFlow instead.');

      const state = generateRandomString(32);
      const codeVerifier = generateRandomString(43);
      const codeChallenge = sha256Base64Url(codeVerifier);
      const redirectUri = credentials.redirectUri ?? 'urn:ietf:wg:oauth:2.0:oob';

      const authUrl = buildAuthUrl(
        credentials, scopes, redirectUri, state, codeChallenge, accessType, prompt
      );

      return ok({
        authUrl,
        async exchange(code: string) {
          const tokenResult = await exchangeCodeForTokens(code, credentials, redirectUri, codeVerifier);
          if (tokenResult.ok) {
            await tokenStore.set(account, tokenResult.value);
          }
          return tokenResult;
        },
      });
    },

    async deviceCodeFlow(account) {
      try {
        const body = new URLSearchParams({
          client_id: credentials.clientId,
          scope: normalizeScopes(scopes).join(' '),
        });

        const response = await fetch(GOOGLE_DEVICE_CODE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });

        if (!response.ok) {
          // Sanitize error body to prevent information leakage
          let errorBody: string;
          try {
            const errorData = (await response.json()) as Record<string, unknown>;
            errorBody = String(errorData['error'] ?? 'unknown_error');
          } catch {
            errorBody = 'unknown_error';
          }
          return err(new AuthError(`Device code request failed: ${response.status} ${errorBody}`));
        }

        const data = (await response.json()) as Record<string, unknown>;

        const deviceCode = String(data['device_code'] ?? '');
        const userCode = String(data['user_code'] ?? '');
        const verificationUrl = String(data['verification_url'] ?? '');
        const expiresIn = typeof data['expires_in'] === 'number' ? data['expires_in'] : 1800;
        const interval = typeof data['interval'] === 'number' ? data['interval'] : 5;

        return ok({
          deviceCode,
          userCode,
          verificationUrl,
          expiresIn,
          interval,
          async poll() {
            const deadline = Date.now() + expiresIn * 1000;
            // Ensure minimum interval of 1 second to prevent tight polling loops
            let currentInterval = Math.max(interval, 1);

            while (Date.now() < deadline) {
              await new Promise((resolve) => setTimeout(resolve, currentInterval * 1000));

              const pollBody = new URLSearchParams({
                client_id: credentials.clientId,
                client_secret: credentials.clientSecret,
                device_code: deviceCode,
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
              });

              const pollResponse = await fetch(GOOGLE_TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: pollBody.toString(),
              });

              if (pollResponse.ok) {
                const tokenData = (await pollResponse.json()) as Record<string, unknown>;
                const pollExpiresIn = typeof tokenData['expires_in'] === 'number' ? tokenData['expires_in'] : 3600;

                const token: TokenData = {
                  accessToken: String(tokenData['access_token'] ?? ''),
                  refreshToken: tokenData['refresh_token'] ? String(tokenData['refresh_token']) : undefined,
                  expiresAt: Date.now() + pollExpiresIn * 1000,
                  tokenType: String(tokenData['token_type'] ?? 'Bearer'),
                  scopes: typeof tokenData['scope'] === 'string' ? tokenData['scope'].split(' ') : undefined,
                };

                await tokenStore.set(account, token);
                return ok(token);
              }

              const errorData = (await pollResponse.json()) as Record<string, unknown>;
              const errorCode = String(errorData['error'] ?? '');

              if (errorCode === 'authorization_pending') {
                continue;
              }
              if (errorCode === 'slow_down') {
                // Server requested slower polling - wait for current interval and continue
                // The interval will be naturally limited by the server's response
                await new Promise((resolve) => setTimeout(resolve, currentInterval * 1000));
                continue;
              }

              return err(new AuthError(`Device code flow failed: ${errorCode}`));
            }

            return err(new AuthError('Device code flow expired'));
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err(new AuthError(`Device code flow failed: ${message}`));
      }
    },

    async refreshToken(account) {
      const stored = await tokenStore.get(account);
      if (!stored.ok) return stored;

      if (!stored.value?.refreshToken) {
        return err(new AuthError(`No refresh token for account: ${account}`));
      }

      const refreshed = await refreshAccessToken(stored.value.refreshToken, credentials);
      if (refreshed.ok) {
        await tokenStore.set(account, refreshed.value);
      }
      return refreshed;
    },

    async revokeToken(account) {
      const stored = await tokenStore.get(account);
      if (!stored.ok) return stored;

      if (!stored.value) {
        return ok(undefined);
      }

      try {
        const tokenToRevoke = stored.value.refreshToken ?? stored.value.accessToken;
        await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(tokenToRevoke)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        await tokenStore.remove(account);
        return ok(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err(new AuthError(`Token revocation failed: ${message}`));
      }
    },

    async isTokenValid(account) {
      const stored = await tokenStore.get(account);
      if (!stored.ok) return stored;

      if (!stored.value) {
        return ok(false);
      }

      if (!stored.value.expiresAt) {
        return ok(true);
      }

      return ok(stored.value.expiresAt > Date.now() + 5 * 60 * 1000);
    },

    async listAccounts() {
      return tokenStore.list();
    },

    async removeAccount(account) {
      return tokenStore.remove(account);
    },
  };
}

/**
 * Loads OAuth2 credentials from a Google Cloud Console JSON file.
 *
 * @example
 * const creds = await loadCredentialsFile('./client_secret.json');
 * if (creds.ok) console.log(creds.value.clientId);
 */
export async function loadCredentialsFile(
  filePath: string
): Promise<Result<OAuthCredentials, AuthError>> {
  try {
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(filePath, 'utf8');
    const json = JSON.parse(content) as Record<string, unknown>;

    // Support both "installed" and "web" application types
    const app = (json['installed'] ?? json['web']) as Record<string, unknown> | undefined;
    if (!app) {
      return err(new AuthError('Invalid credentials file: missing "installed" or "web" section'));
    }

    const clientId = app['client_id'];
    const clientSecret = app['client_secret'];
    const redirectUris = app['redirect_uris'] as string[] | undefined;

    if (typeof clientId !== 'string' || typeof clientSecret !== 'string') {
      return err(new AuthError('Invalid credentials file: missing client_id or client_secret'));
    }

    return ok({
      clientId,
      clientSecret,
      redirectUri: redirectUris?.[0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(new AuthError(`Failed to load credentials file: ${message}`));
  }
}
