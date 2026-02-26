/**
 * Structured logger for OpenWorkspace.
 * Zero-dependency implementation with log levels.
 */

/**
 * Log levels in order of severity.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log entry structure.
 */
export type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
};

/**
 * Log sink function type.
 */
export type LogSink = (entry: LogEntry) => void;

/**
 * Logger configuration options.
 */
export type LoggerOptions = {
  level?: LogLevel;
  sink?: LogSink;
  prefix?: string;
};

/**
 * Logger interface with level-specific methods.
 */
export type Logger = {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(prefix: string): Logger;
};

const LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

/**
 * Default console sink for logging.
 */
export const consoleSink: LogSink = (entry) => {
  const timestamp = entry.timestamp.toISOString();
  const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;
  const contextStr = entry.context
    ? ' ' + JSON.stringify(entry.context)
    : '';

  const output = `${prefix} ${entry.message}${contextStr}`;

  switch (entry.level) {
    case 'debug':
      console.debug(output);
      break;
    case 'info':
      console.info(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'error':
      console.error(output);
      break;
  }
};

/**
 * Creates a new logger instance.
 * @example
 * const logger = createLogger({ level: 'info' });
 * logger.info('Server started', { port: 3000 });
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const minLevel = options.level ?? 'info';
  const sink = options.sink ?? consoleSink;
  const prefix = options.prefix ?? '';

  const minLevelIndex = LEVELS.indexOf(minLevel);

  function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LEVELS.indexOf(level) < minLevelIndex) {
      return;
    }

    sink({
      level,
      message: prefix ? `[${prefix}] ${message}` : message,
      timestamp: new Date(),
      context,
    });
  }

  return {
    debug(message: string, context?: Record<string, unknown>): void {
      log('debug', message, context);
    },

    info(message: string, context?: Record<string, unknown>): void {
      log('info', message, context);
    },

    warn(message: string, context?: Record<string, unknown>): void {
      log('warn', message, context);
    },

    error(message: string, context?: Record<string, unknown>): void {
      log('error', message, context);
    },

    child(childPrefix: string): Logger {
      return createLogger({
        level: minLevel,
        sink,
        prefix: prefix ? `${prefix}:${childPrefix}` : childPrefix,
      });
    },
  };
}

/**
 * Default logger instance.
 */
export const defaultLogger = createLogger();
