/**
 * Error hierarchy for OpenWorkspace.
 * All errors extend WorkspaceError for typed error handling.
 */

/**
 * Base error class for all OpenWorkspace errors.
 * Provides structured error information and error codes.
 */
export class WorkspaceError extends Error {
  /**
   * Machine-readable error code.
   */
  readonly code: string;

  /**
   * Additional context for the error.
   */
  readonly context?: Record<string, unknown>;

  /**
   * HTTP status code if applicable.
   */
  readonly statusCode?: number;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>,
    statusCode?: number
  ) {
    super(message);
    this.name = 'WorkspaceError';
    this.code = code;
    this.context = context;
    this.statusCode = statusCode;
  }

  /**
   * Returns a JSON-serializable representation of the error.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Error for configuration-related failures.
 */
export class ConfigError extends WorkspaceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', context);
    this.name = 'ConfigError';
  }
}

/**
 * Error for authentication/authorization failures.
 */
export class AuthError extends WorkspaceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', context, 401);
    this.name = 'AuthError';
  }
}

/**
 * Error for network/HTTP request failures.
 */
export class NetworkError extends WorkspaceError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    statusCode?: number
  ) {
    super(message, 'NETWORK_ERROR', context, statusCode);
    this.name = 'NetworkError';
  }
}

/**
 * Error for rate limiting scenarios.
 */
export class RateLimitError extends WorkspaceError {
  /**
   * Timestamp when the rate limit resets.
   */
  readonly resetAt?: Date;

  constructor(message: string, resetAt?: Date, context?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_ERROR', context, 429);
    this.name = 'RateLimitError';
    this.resetAt = resetAt;
  }
}

/**
 * Error for validation failures.
 */
export class ValidationError extends WorkspaceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context, 400);
    this.name = 'ValidationError';
  }
}

/**
 * Error for plugin-related failures.
 */
export class PluginError extends WorkspaceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'PLUGIN_ERROR', context);
    this.name = 'PluginError';
  }
}

/**
 * Error for not-found scenarios.
 */
export class NotFoundError extends WorkspaceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', context, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Type guard to check if an error is a WorkspaceError.
 */
export function isWorkspaceError(error: unknown): error is WorkspaceError {
  return error instanceof WorkspaceError;
}

/**
 * Type guard to check if an error is a specific WorkspaceError subclass.
 */
export function isErrorType<T extends WorkspaceError>(
  error: unknown,
  ErrorClass: new (...args: unknown[]) => T
): error is T {
  return error instanceof ErrorClass;
}
