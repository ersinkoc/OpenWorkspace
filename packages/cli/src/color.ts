/**
 * CLI color support module.
 * Provides ANSI color helpers with automatic TTY detection.
 * Respects NO_COLOR, FORCE_COLOR, OWS_COLOR, and TERM=dumb conventions.
 * Zero dependencies.
 */

export type ColorMode = 'auto' | 'always' | 'never';

export type Colors = {
  red(text: string): string;
  green(text: string): string;
  yellow(text: string): string;
  blue(text: string): string;
  cyan(text: string): string;
  magenta(text: string): string;
  gray(text: string): string;
  bold(text: string): string;
  dim(text: string): string;
  underline(text: string): string;
  reset(text: string): string;
};

// ANSI escape code pairs: [open, close]
const CODES = {
  red: ['\x1b[31m', '\x1b[39m'],
  green: ['\x1b[32m', '\x1b[39m'],
  yellow: ['\x1b[33m', '\x1b[39m'],
  blue: ['\x1b[34m', '\x1b[39m'],
  magenta: ['\x1b[35m', '\x1b[39m'],
  cyan: ['\x1b[36m', '\x1b[39m'],
  gray: ['\x1b[90m', '\x1b[39m'],
  bold: ['\x1b[1m', '\x1b[22m'],
  dim: ['\x1b[2m', '\x1b[22m'],
  underline: ['\x1b[4m', '\x1b[24m'],
  reset: ['\x1b[0m', '\x1b[0m'],
} as const;

type StyleName = keyof typeof CODES;

/**
 * Detect whether colors should be enabled based on environment signals.
 *
 * Priority (highest to lowest):
 *   1. `FORCE_COLOR` env var set and non-empty  -> 'always'
 *   2. `OWS_COLOR` env var                      -> value mapped to mode
 *   3. `NO_COLOR` env var is set (any value)    -> 'never'
 *   4. `TERM` === 'dumb'                        -> 'never'
 *   5. stdout is a TTY                          -> 'always'
 *   6. otherwise                                -> 'never'
 */
export function detectColorMode(): ColorMode {
  const env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string | undefined>);

  // FORCE_COLOR takes highest priority.
  if (env['FORCE_COLOR'] !== undefined && env['FORCE_COLOR'] !== '') {
    const val = env['FORCE_COLOR'];
    if (val === '0' || val?.toLowerCase() === 'false') {
      return 'never';
    }
    return 'always';
  }

  // OWS_COLOR project-specific override.
  if (env['OWS_COLOR'] !== undefined && env['OWS_COLOR'] !== '') {
    const val = env['OWS_COLOR']!.toLowerCase();
    if (val === 'always' || val === '1' || val === 'true') return 'always';
    if (val === 'never' || val === '0' || val === 'false') return 'never';
    return 'auto';
  }

  // NO_COLOR convention: any value (even empty) disables color.
  if (env['NO_COLOR'] !== undefined) {
    return 'never';
  }

  // TERM=dumb signals a limited terminal.
  if (env['TERM'] === 'dumb') {
    return 'never';
  }

  // Fall back to TTY detection.
  if (typeof process !== 'undefined' && process.stdout && typeof process.stdout.isTTY === 'boolean') {
    return process.stdout.isTTY ? 'always' : 'never';
  }

  return 'never';
}

/**
 * Create a `Colors` object whose methods either apply ANSI codes or act as
 * identity functions depending on the resolved color mode.
 *
 * @param mode - `'auto'` (default) defers to `detectColorMode()`.
 */
export function createColors(mode: ColorMode = 'auto'): Colors {
  const resolved: ColorMode = mode === 'auto' ? detectColorMode() : mode;
  const enabled = resolved === 'always';

  function wrap(style: StyleName): (text: string) => string {
    if (!enabled) return (text: string) => text;

    const [open, close] = CODES[style];
    return (text: string) => open + text + close;
  }

  return {
    red: wrap('red'),
    green: wrap('green'),
    yellow: wrap('yellow'),
    blue: wrap('blue'),
    cyan: wrap('cyan'),
    magenta: wrap('magenta'),
    gray: wrap('gray'),
    bold: wrap('bold'),
    dim: wrap('dim'),
    underline: wrap('underline'),
    reset: wrap('reset'),
  };
}
