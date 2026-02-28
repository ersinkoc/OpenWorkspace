/**
 * Persisted configuration management.
 * Supports platform-specific config paths, environment variable overrides,
 * and JSON5 config file format.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Result } from '../result.js';
import { ok, err } from '../result.js';
import { ConfigError } from '../errors.js';
import { getDefaultConfigDir } from '../auth/token-store.js';
import { parseJson5 } from './json5.js';
import type { Json5Value } from './json5.js';

/**
 * Configuration store interface.
 */
export type ConfigStore = {
  /**
   * Get a configuration value by dotted path.
   * @example
   * const tz = config.get('default_timezone'); // 'Europe/Istanbul'
   * const backend = config.get('cache.backend'); // 'memory'
   */
  get(key: string): unknown;

  /**
   * Set a configuration value by dotted path.
   * @example
   * config.set('default_timezone', 'UTC');
   * config.set('cache.ttl', '10m');
   */
  set(key: string, value: unknown): void;

  /**
   * Delete a configuration value.
   */
  delete(key: string): boolean;

  /**
   * List all configuration keys (flattened dotted paths).
   */
  list(): string[];

  /**
   * Get the full configuration object.
   */
  getAll(): Record<string, unknown>;

  /**
   * Save configuration to disk.
   */
  save(): Promise<Result<void, ConfigError>>;

  /**
   * Reload configuration from disk.
   */
  reload(): Promise<Result<void, ConfigError>>;

  /**
   * Get the config file path.
   */
  getPath(): string;
};

/**
 * Default configuration values.
 */
const DEFAULTS: Record<string, unknown> = {
  default_timezone: 'UTC',
  token_backend: 'file',
  cache: {
    backend: 'memory',
    ttl: '5m',
    max_entries: 1000,
  },
  account_aliases: {},
  rate_limit: {
    strategy: 'adaptive',
    max_rps: 10,
  },
  mcp: {
    enabled_services: ['gmail', 'calendar', 'drive', 'sheets', 'tasks'],
    max_results_default: 20,
  },
};

/**
 * Gets a nested value from an object using a dotted path.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    // Prevent prototype pollution
    if (!isSafeKey(part)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Sets a nested value in an object using a dotted path.
 */
/**
 * Validates that a key is safe to use (not a prototype pollution vector).
 */
function isSafeKey(key: string): boolean {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part) continue;

    // Prevent prototype pollution
    if (!isSafeKey(part)) {
      throw new Error(`Invalid key: ${part}`);
    }

    const next = current[part];
    if (next === null || next === undefined || typeof next !== 'object' || Array.isArray(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart) {
    // Prevent prototype pollution on final key
    if (!isSafeKey(lastPart)) {
      throw new Error(`Invalid key: ${lastPart}`);
    }
    current[lastPart] = value;
  }
}

/**
 * Deletes a nested value from an object using a dotted path.
 */
function deleteNestedValue(obj: Record<string, unknown>, path: string): boolean {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part) return false;

    // Prevent prototype pollution
    if (!isSafeKey(part)) {
      return false;
    }

    const next = current[part];
    if (next === null || next === undefined || typeof next !== 'object' || Array.isArray(next)) {
      return false;
    }
    current = next as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart in current) {
    // Prevent prototype pollution on final key
    if (!isSafeKey(lastPart)) {
      return false;
    }
    delete current[lastPart];
    return true;
  }
  return false;
}

/**
 * Flattens a nested object into dotted-path keys.
 */
function flattenKeys(obj: Record<string, unknown>, prefix: string = ''): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Deep merges source into target.
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      key in result &&
      result[key] !== null &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Stringify config to JSON with 2-space indent.
 */
function stringifyConfig(config: Record<string, unknown>): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Creates a configuration store.
 *
 * @example
 * const config = await createConfigStore();
 * const tz = config.get('default_timezone');
 * config.set('cache.ttl', '10m');
 * await config.save();
 */
export async function createConfigStore(
  configDir?: string
): Promise<ConfigStore> {
  const dir = configDir ?? process.env['OWS_CONFIG_DIR'] ?? getDefaultConfigDir();
  const filePath = path.join(dir, 'config.json');

  let data: Record<string, unknown> = {};

  // Try to load existing config
  try {
    await fs.mkdir(dir, { recursive: true });
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = parseJson5(content);
    if (parsed.ok && parsed.value !== null && typeof parsed.value === 'object' && !Array.isArray(parsed.value)) {
      data = parsed.value as Record<string, unknown>;
    }
  } catch {
    // File doesn't exist yet, use defaults
  }

  // Merge with defaults
  data = deepMerge(DEFAULTS, data);

  // Apply environment variable overrides
  const envOverrides: Record<string, string | undefined> = {
    'default_timezone': process.env['OWS_TIMEZONE'],
    'token_backend': undefined,
    'cache.backend': process.env['OWS_CACHE'] === 'off' ? 'none' : undefined,
  };

  for (const [key, envValue] of Object.entries(envOverrides)) {
    if (envValue !== undefined) {
      setNestedValue(data, key, envValue);
    }
  }

  const store: ConfigStore = {
    get(key) {
      return getNestedValue(data, key);
    },

    set(key, value) {
      setNestedValue(data, key, value);
    },

    delete(key) {
      return deleteNestedValue(data, key);
    },

    list() {
      return flattenKeys(data);
    },

    getAll() {
      return { ...data };
    },

    async save() {
      try {
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, stringifyConfig(data), 'utf8');
        return ok(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err(new ConfigError(`Failed to save config: ${message}`));
      }
    },

    async reload() {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const parsed = parseJson5(content);
        if (!parsed.ok) return parsed;

        if (parsed.value !== null && typeof parsed.value === 'object' && !Array.isArray(parsed.value)) {
          data = deepMerge(DEFAULTS, parsed.value as Record<string, unknown>);
        }
        return ok(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err(new ConfigError(`Failed to reload config: ${message}`));
      }
    },

    getPath() {
      return filePath;
    },
  };

  return store;
}
