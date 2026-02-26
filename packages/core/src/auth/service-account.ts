/**
 * Google Workspace service account authentication.
 * Implements JWT-based authentication for server-to-server communication.
 * Supports domain-wide delegation for Google Workspace.
 */

import type { Result } from '../result.js';
import { ok, err } from '../result.js';
import { AuthError } from '../errors.js';
import { rsaSha256Sign } from './crypto.js';
import type { TokenData, TokenStore } from './token-store.js';
import { normalizeScopes } from './scopes.js';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWT_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

/**
 * Service account key file contents.
 */
export type ServiceAccountKey = {
  type: 'service_account';
  projectId: string;
  privateKeyId: string;
  privateKey: string;
  clientEmail: string;
  clientId: string;
  authUri: string;
  tokenUri: string;
};

/**
 * Service account authentication configuration.
 */
export type ServiceAccountConfig = {
  /** Service account key data */
  key: ServiceAccountKey;
  /** Scopes to request */
  scopes: string[];
  /** Token store for caching tokens */
  tokenStore: TokenStore;
  /** Subject email for domain-wide delegation */
  subject?: string;
};

/**
 * JWT header for Google service account auth.
 */
type JwtHeader = {
  alg: 'RS256';
  typ: 'JWT';
  kid: string;
};

/**
 * JWT claims for Google service account auth.
 */
type JwtClaims = {
  iss: string;
  scope: string;
  aud: string;
  exp: number;
  iat: number;
  sub?: string;
};

/**
 * Creates a signed JWT for service account authentication.
 */
function createSignedJwt(
  key: ServiceAccountKey,
  scopes: string[],
  subject?: string
): Result<string, AuthError> {
  const now = Math.floor(Date.now() / 1000);

  const header: JwtHeader = {
    alg: 'RS256',
    typ: 'JWT',
    kid: key.privateKeyId,
  };

  const claims: JwtClaims = {
    iss: key.clientEmail,
    scope: normalizeScopes(scopes).join(' '),
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  if (subject) {
    claims.sub = subject;
  }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedClaims}`;

  const signature = rsaSha256Sign(signatureInput, key.privateKey);
  if (!signature.ok) return signature;

  return ok(`${signatureInput}.${signature.value}`);
}

/**
 * Exchanges a signed JWT for an access token.
 */
async function exchangeJwtForToken(jwt: string): Promise<Result<TokenData, AuthError>> {
  try {
    const body = new URLSearchParams({
      grant_type: JWT_GRANT_TYPE,
      assertion: jwt,
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return err(new AuthError(`Service account token exchange failed: ${response.status} ${errorBody}`));
    }

    const data = (await response.json()) as Record<string, unknown>;
    const expiresIn = typeof data['expires_in'] === 'number' ? data['expires_in'] : 3600;

    return ok({
      accessToken: String(data['access_token'] ?? ''),
      expiresAt: Date.now() + expiresIn * 1000,
      tokenType: String(data['token_type'] ?? 'Bearer'),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(new AuthError(`Service account token exchange failed: ${message}`));
  }
}

/**
 * Creates a service account auth engine.
 * Uses JWT assertion to obtain access tokens from Google.
 * Supports domain-wide delegation via the `subject` parameter.
 *
 * @example
 * const auth = createServiceAccountAuth({
 *   key: serviceAccountKey,
 *   scopes: [SCOPES.GMAIL.READONLY],
 *   tokenStore: createMemoryTokenStore(),
 *   subject: 'admin@example.com',
 * });
 * const token = await auth.getToken();
 */
export function createServiceAccountAuth(config: ServiceAccountConfig) {
  const { key, scopes, tokenStore, subject } = config;
  const accountKey = `sa:${key.clientEmail}${subject ? `:${subject}` : ''}`;

  return {
    /**
     * Get a valid access token, automatically refreshing if expired.
     */
    async getToken(): Promise<Result<string, AuthError>> {
      const stored = await tokenStore.get(accountKey);
      if (!stored.ok) return stored;

      // Check if token is still valid (with 5-minute buffer)
      if (
        stored.value?.accessToken &&
        stored.value.expiresAt &&
        stored.value.expiresAt > Date.now() + 5 * 60 * 1000
      ) {
        return ok(stored.value.accessToken);
      }

      // Generate new token
      return this.authenticate();
    },

    /**
     * Authenticate and obtain a new access token.
     */
    async authenticate(): Promise<Result<string, AuthError>> {
      const jwt = createSignedJwt(key, scopes, subject);
      if (!jwt.ok) return jwt;

      const tokenResult = await exchangeJwtForToken(jwt.value);
      if (!tokenResult.ok) return tokenResult;

      await tokenStore.set(accountKey, tokenResult.value);
      return ok(tokenResult.value.accessToken);
    },

    /**
     * Get the service account email.
     */
    getEmail(): string {
      return key.clientEmail;
    },

    /**
     * Get the subject email (for delegation).
     */
    getSubject(): string | undefined {
      return subject;
    },
  };
}

/**
 * Loads a service account key from a JSON file.
 *
 * @example
 * const key = await loadServiceAccountKey('./service-account.json');
 * if (key.ok) console.log(key.value.clientEmail);
 */
export async function loadServiceAccountKey(
  filePath: string
): Promise<Result<ServiceAccountKey, AuthError>> {
  try {
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(filePath, 'utf8');
    const json = JSON.parse(content) as Record<string, unknown>;

    if (json['type'] !== 'service_account') {
      return err(new AuthError('Invalid service account key: type must be "service_account"'));
    }

    const requiredFields = [
      'project_id', 'private_key_id', 'private_key',
      'client_email', 'client_id', 'auth_uri', 'token_uri',
    ] as const;

    for (const field of requiredFields) {
      if (typeof json[field] !== 'string') {
        return err(new AuthError(`Invalid service account key: missing ${field}`));
      }
    }

    return ok({
      type: 'service_account',
      projectId: String(json['project_id']),
      privateKeyId: String(json['private_key_id']),
      privateKey: String(json['private_key']),
      clientEmail: String(json['client_email']),
      clientId: String(json['client_id']),
      authUri: String(json['auth_uri']),
      tokenUri: String(json['token_uri']),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(new AuthError(`Failed to load service account key: ${message}`));
  }
}
