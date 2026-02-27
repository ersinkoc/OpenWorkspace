/**
 * Pluggable token storage backends.
 * Supports in-memory and encrypted file-based storage.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Result } from '../result.js';
import { ok, err } from '../result.js';
import { AuthError } from '../errors.js';
import { encrypt, decrypt } from './crypto.js';

/**
 * OAuth2 token data stored for an account.
 */
export type TokenData = {
  /** OAuth2 access token */
  accessToken: string;
  /** OAuth2 refresh token */
  refreshToken?: string;
  /** Token expiration timestamp (ms since epoch) */
  expiresAt?: number;
  /** Granted scopes */
  scopes?: string[];
  /** Token type (usually 'Bearer') */
  tokenType?: string;
};

/**
 * Token store interface for pluggable storage backends.
 */
export type TokenStore = {
  /**
   * Store a token for an account.
   * @example
   * await store.set('user@example.com', { accessToken: '...', refreshToken: '...' });
   */
  set(account: string, token: TokenData): Promise<Result<void, AuthError>>;

  /**
   * Retrieve a token for an account.
   * @example
   * const token = await store.get('user@example.com');
   * if (token.ok && token.value) console.log(token.value.accessToken);
   */
  get(account: string): Promise<Result<TokenData | undefined, AuthError>>;

  /**
   * Remove a token for an account.
   */
  remove(account: string): Promise<Result<void, AuthError>>;

  /**
   * List all stored accounts.
   */
  list(): Promise<Result<string[], AuthError>>;

  /**
   * Clear all stored tokens.
   */
  clear(): Promise<Result<void, AuthError>>;
};

/**
 * Creates an in-memory token store.
 * Tokens are lost when the process exits.
 *
 * @example
 * const store = createMemoryTokenStore();
 * await store.set('user@example.com', { accessToken: 'abc123' });
 */
export function createMemoryTokenStore(): TokenStore {
  const tokens = new Map<string, TokenData>();

  return {
    async set(account, token) {
      tokens.set(account, { ...token });
      return ok(undefined);
    },

    async get(account) {
      const token = tokens.get(account);
      return ok(token ? { ...token } : undefined);
    },

    async remove(account) {
      tokens.delete(account);
      return ok(undefined);
    },

    async list() {
      return ok([...tokens.keys()]);
    },

    async clear() {
      tokens.clear();
      return ok(undefined);
    },
  };
}

/**
 * Returns the default config directory path per platform.
 */
export function getDefaultConfigDir(): string {
  const platform = os.platform();
  const home = os.homedir();

  // Validate home directory
  if (!home || !isValidPath(home)) {
    throw new AuthError('Invalid home directory path');
  }

  let configDir: string;

  if (platform === 'darwin') {
    configDir = path.join(home, 'Library', 'Application Support', 'openworkspace');
  } else if (platform === 'win32') {
    const appData = process.env['APPDATA'];
    if (appData && !isValidPath(appData)) {
      throw new AuthError('Invalid APPDATA environment variable');
    }
    configDir = path.join(appData ?? path.join(home, 'AppData', 'Roaming'), 'openworkspace');
  } else {
    // Linux and others: XDG
    const xdgConfig = process.env['XDG_CONFIG_HOME'];
    if (xdgConfig && !isValidPath(xdgConfig)) {
      throw new AuthError('Invalid XDG_CONFIG_HOME environment variable');
    }
    configDir = path.join(xdgConfig ?? path.join(home, '.config'), 'openworkspace');
  }

  // Final validation
  if (!isValidPath(configDir)) {
    throw new AuthError('Invalid config directory path');
  }

  return configDir;
}

/**
 * Ensures a directory exists, creating it recursively if needed.
 */
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true, mode: 0o700 });
  // Verify permissions were set correctly (umask can affect this)
  try {
    await fs.chmod(dirPath, 0o700);
  } catch {
    // Ignore errors on Windows or if permissions can't be changed
  }
}

/**
 * Validates that a path does not contain path traversal sequences.
 * Prevents directory traversal attacks.
 */
function isValidPath(path: string): boolean {
  // Check for common path traversal patterns
  if (path.includes('..')) return false;
  if (path.includes('~')) return false;
  // Check for null bytes
  if (path.includes('\0')) return false;
  return true;
}

/**
 * File-based token data structure.
 */
type FileTokenData = {
  version: number;
  accounts: Record<string, TokenData>;
};

/**
 * Creates an encrypted file-based token store.
 * Tokens are encrypted with AES-256-GCM using the provided password.
 *
 * @param password - Encryption password (from env OWS_KEYRING_PASSWORD or prompt)
 * @param configDir - Config directory (defaults to platform-specific path)
 *
 * @example
 * const store = createFileTokenStore('my-secret-password');
 * await store.set('user@example.com', { accessToken: 'abc123', refreshToken: 'xyz' });
 */
export function createFileTokenStore(
  password: string,
  configDir?: string
): TokenStore {
  const dir = configDir ?? getDefaultConfigDir();
  const filePath = path.join(dir, 'tokens.enc');

  async function readTokens(): Promise<Result<FileTokenData, AuthError>> {
    try {
      await ensureDir(dir);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      if (!exists) {
        return ok({ version: 1, accounts: {} });
      }

      const encrypted = await fs.readFile(filePath, 'utf8');
      const decrypted = decrypt(encrypted.trim(), password);
      if (!decrypted.ok) return decrypted;

      const data = JSON.parse(decrypted.value) as FileTokenData;
      return ok(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new AuthError(`Failed to read token store: ${message}`));
    }
  }

  async function writeTokens(data: FileTokenData): Promise<Result<void, AuthError>> {
    try {
      await ensureDir(dir);
      const json = JSON.stringify(data);
      const encrypted = encrypt(json, password);
      if (!encrypted.ok) return encrypted;

      await fs.writeFile(filePath, encrypted.value, { encoding: 'utf8', mode: 0o600 });
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new AuthError(`Failed to write token store: ${message}`));
    }
  }

  return {
    async set(account, token) {
      const data = await readTokens();
      if (!data.ok) return data;

      data.value.accounts[account] = { ...token };
      return writeTokens(data.value);
    },

    async get(account) {
      const data = await readTokens();
      if (!data.ok) return data;

      const token = data.value.accounts[account];
      return ok(token ? { ...token } : undefined);
    },

    async remove(account) {
      const data = await readTokens();
      if (!data.ok) return data;

      delete data.value.accounts[account];
      return writeTokens(data.value);
    },

    async list() {
      const data = await readTokens();
      if (!data.ok) return data;

      return ok(Object.keys(data.value.accounts));
    },

    async clear() {
      return writeTokens({ version: 1, accounts: {} });
    },
  };
}

/**
 * Creates a token store based on the specified backend type.
 *
 * @example
 * const store = createTokenStore('memory');
 * const fileStore = createTokenStore('file', 'encryption-password');
 */
export function createTokenStore(
  backend: 'memory' | 'file',
  password?: string,
  configDir?: string
): TokenStore {
  if (backend === 'file') {
    const pwd = password ?? process.env['OWS_KEYRING_PASSWORD'];
    if (!pwd) {
      throw new AuthError(
        'Encryption password required for file token store. Set OWS_KEYRING_PASSWORD environment variable or pass password parameter.'
      );
    }
    return createFileTokenStore(pwd, configDir);
  }
  return createMemoryTokenStore();
}
