/**
 * Zero-dependency argument parser for CLI.
 * Supports flags, options, and positional arguments.
 */

import type { Result } from '@openworkspace/core';
import { ok, ValidationError } from '@openworkspace/core';

/**
 * Parsed command line arguments.
 */
export type ParsedArgs = {
  /**
   * Positional arguments.
   */
  _: string[];

  /**
   * Flags and options.
   */
  flags: Record<string, string | boolean | string[]>;

  /**
   * Raw arguments.
   */
  raw: string[];
};

/**
 * Parser configuration.
 */
export type ParserConfig = {
  /**
   * Options that can have multiple values.
   */
  array?: string[];

  /**
   * Options that are booleans (no value expected).
   */
  boolean?: string[];

  /**
   * Options with default values.
   */
  default?: Record<string, unknown>;

  /**
   * Aliases for options.
   */
  alias?: Record<string, string>;
};

/**
 * Parses command line arguments.
 * @example
 * const result = parseArgs(['--name', 'test', '--verbose', 'command']);
 * if (result.ok) {
 *   console.log(result.value.flags.name); // 'test'
 *   console.log(result.value.flags.verbose); // true
 *   console.log(result.value._); // ['command']
 * }
 */
export function parseArgs(
  args: string[],
  config: ParserConfig = {}
): Result<ParsedArgs, ValidationError> {
  const flags: Record<string, string | boolean | string[]> = {};
  const positional: string[] = [];

  // Apply defaults
  if (config.default) {
    for (const [key, value] of Object.entries(config.default)) {
      flags[key] = value as string | boolean | string[];
    }
  }

  let i = 0;
  while (i < args.length) {
    const arg = args[i] ?? '';

    // Handle --
    if (arg === '--') {
      positional.push(...args.slice(i + 1));
      break;
    }

    // Handle long options (--option)
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      let key: string;
      let value: string | undefined;

      if (eqIndex > 0) {
        key = arg.slice(2, eqIndex);
        value = arg.slice(eqIndex + 1);
      } else {
        key = arg.slice(2);
      }

      // Resolve alias
      const resolvedKey = config.alias?.[key] ?? key;

      // Check if boolean flag
      if (config.boolean?.includes(resolvedKey)) {
        flags[resolvedKey] = true;
      } else if (value !== undefined) {
        // Value was provided with =
        setFlagValue(flags, resolvedKey, value, config.array?.includes(resolvedKey) ?? false);
      } else {
        const nextArg = args[i + 1];
        if (nextArg !== undefined && !nextArg.startsWith('-')) {
          // Next argument is the value
          setFlagValue(flags, resolvedKey, nextArg, config.array?.includes(resolvedKey) ?? false);
          i++;
        } else {
          // No value provided, treat as boolean
          flags[resolvedKey] = true;
        }
      }

      i++;
      continue;
    }

    // Handle short options (-a, -abc, -a value)
    if (arg.startsWith('-') && arg.length > 1) {
      const shorts = arg.slice(1);

      for (let j = 0; j < shorts.length; j++) {
        const shortChar = shorts.charAt(j);
        const resolvedKey = config.alias?.[shortChar] ?? shortChar;

        // Check if boolean flag
        if (config.boolean?.includes(resolvedKey)) {
          flags[resolvedKey] = true;
        } else if (j === shorts.length - 1) {
          // Last short option - check for value
          const nextArg = args[i + 1];
          if (nextArg !== undefined && !nextArg.startsWith('-')) {
            setFlagValue(flags, resolvedKey, nextArg, config.array?.includes(resolvedKey) ?? false);
            i++;
          } else {
            flags[resolvedKey] = true;
          }
        } else {
          flags[resolvedKey] = true;
        }
      }

      i++;
      continue;
    }

    // Positional argument
    positional.push(arg);
    i++;
  }

  return ok({
    _: positional,
    flags,
    raw: args,
  });
}

/**
 * Sets a flag value, handling array accumulation.
 */
function setFlagValue(
  flags: Record<string, string | boolean | string[]>,
  key: string,
  value: string,
  isArray: boolean
): void {
  if (isArray) {
    const existing = flags[key];
    if (Array.isArray(existing)) {
      existing.push(value);
    } else if (typeof existing === 'string') {
      flags[key] = [existing, value];
    } else {
      flags[key] = [value];
    }
  } else {
    flags[key] = value;
  }
}

/**
 * Gets a string flag value.
 */
export function getStringFlag(flags: ParsedArgs['flags'], key: string, defaultValue?: string): string | undefined {
  const value = flags[key];
  if (typeof value === 'string') {
    return value;
  }
  return defaultValue;
}

/**
 * Gets a boolean flag value.
 */
export function getBooleanFlag(flags: ParsedArgs['flags'], key: string, defaultValue = false): boolean {
  const value = flags[key];
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value === 'true';
  }
  return defaultValue;
}

/**
 * Gets an array flag value.
 */
export function getArrayFlag(flags: ParsedArgs['flags'], key: string): string[] {
  const value = flags[key];
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
}
