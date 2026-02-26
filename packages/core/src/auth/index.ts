/**
 * Authentication module for OpenWorkspace.
 * Provides OAuth2 flows, service account auth, token storage, and scope management.
 */

// OAuth2
export type { OAuthCredentials, OAuth2Config, DeviceCodeResponse, AuthEngine } from './oauth2.js';
export { createAuthEngine, loadCredentialsFile } from './oauth2.js';

// Service Account
export type { ServiceAccountKey, ServiceAccountConfig } from './service-account.js';
export { createServiceAccountAuth, loadServiceAccountKey } from './service-account.js';

// Token Store
export type { TokenData, TokenStore } from './token-store.js';
export {
  createMemoryTokenStore,
  createFileTokenStore,
  createTokenStore,
  getDefaultConfigDir,
} from './token-store.js';

// Scopes
export type { GoogleScope } from './scopes.js';
export {
  SCOPES,
  validateScopes,
  normalizeScopes,
  getScopeService,
  getScopeDescription,
} from './scopes.js';

// Crypto utilities
export {
  encrypt,
  decrypt,
  generateRandomString,
  sha256Base64Url,
} from './crypto.js';
