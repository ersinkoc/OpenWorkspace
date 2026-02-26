/**
 * @openworkspace/core
 * Core infrastructure for OpenWorkspace - kernel, results, errors, events, logging, and HTTP.
 */

// Result pattern
export type { Result, Ok, Err } from './result.js';
export { ok, err, unwrap, unwrapOr, map, mapErr } from './result.js';

// Error hierarchy
export {
  WorkspaceError,
  ConfigError,
  AuthError,
  NetworkError,
  RateLimitError,
  ValidationError,
  PluginError,
  NotFoundError,
  isWorkspaceError,
  isErrorType,
} from './errors.js';

// Event bus
export type { EventBus, EventHandler, Subscription } from './events.js';
export { createEventBus } from './events.js';

// Logger
export type { Logger, LogLevel, LogEntry, LogSink, LoggerOptions } from './logger.js';
export { createLogger, consoleSink, defaultLogger } from './logger.js';

// HTTP client
export type {
  HttpClient,
  HttpRequestConfig,
  HttpResponse,
  HttpClientOptions,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from './http.js';
export { createHttpClient } from './http.js';

// Kernel
export type {
  Kernel,
  KernelOptions,
  KernelState,
  Plugin,
  PluginContext,
  CommandHandler,
  ToolDefinition,
  ToolParameter,
} from './kernel.js';
export { createKernel } from './kernel.js';

// Auth
export type {
  OAuthCredentials,
  OAuth2Config,
  DeviceCodeResponse,
  AuthEngine,
  ServiceAccountKey,
  ServiceAccountConfig,
  TokenData,
  TokenStore,
  GoogleScope,
} from './auth/index.js';
export {
  createAuthEngine,
  loadCredentialsFile,
  createServiceAccountAuth,
  loadServiceAccountKey,
  createMemoryTokenStore,
  createFileTokenStore,
  createTokenStore,
  getDefaultConfigDir,
  SCOPES,
  validateScopes,
  normalizeScopes,
  getScopeService,
  getScopeDescription,
  encrypt,
  decrypt,
  generateRandomString,
  sha256Base64Url,
} from './auth/index.js';

// Config
export type { Json5Value, ConfigStore } from './config/index.js';
export { parseJson5, createConfigStore } from './config/index.js';
