import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createColors, detectColorMode } from './color.js';

describe('createColors', () => {
  describe('never mode', () => {
    it('returns text unchanged for all methods', () => {
      const c = createColors('never');
      expect(c.red('hello')).toBe('hello');
      expect(c.green('hello')).toBe('hello');
      expect(c.yellow('hello')).toBe('hello');
      expect(c.blue('hello')).toBe('hello');
      expect(c.cyan('hello')).toBe('hello');
      expect(c.magenta('hello')).toBe('hello');
      expect(c.gray('hello')).toBe('hello');
      expect(c.bold('hello')).toBe('hello');
      expect(c.dim('hello')).toBe('hello');
      expect(c.underline('hello')).toBe('hello');
      expect(c.reset('hello')).toBe('hello');
    });

    it('returns empty string unchanged', () => {
      const c = createColors('never');
      expect(c.red('')).toBe('');
    });
  });

  describe('always mode', () => {
    it('wraps text with ANSI codes', () => {
      const c = createColors('always');
      expect(c.red('hi')).toContain('\x1b[');
      expect(c.red('hi')).toContain('hi');
      expect(c.red('hi')).not.toBe('hi');
    });

    it('each color produces different escape codes', () => {
      const c = createColors('always');
      const red = c.red('x');
      const green = c.green('x');
      const blue = c.blue('x');
      expect(red).not.toBe(green);
      expect(red).not.toBe(blue);
      expect(green).not.toBe(blue);
    });

    it('bold wraps text with bold codes', () => {
      const c = createColors('always');
      expect(c.bold('hi')).toContain('\x1b[1m');
      expect(c.bold('hi')).toContain('\x1b[22m');
    });

    it('underline wraps text with underline codes', () => {
      const c = createColors('always');
      expect(c.underline('hi')).toContain('\x1b[4m');
      expect(c.underline('hi')).toContain('\x1b[24m');
    });

    it('red uses correct ANSI code', () => {
      const c = createColors('always');
      expect(c.red('test')).toBe('\x1b[31mtest\x1b[39m');
    });

    it('green uses correct ANSI code', () => {
      const c = createColors('always');
      expect(c.green('test')).toBe('\x1b[32mtest\x1b[39m');
    });

    it('dim uses correct ANSI code', () => {
      const c = createColors('always');
      expect(c.dim('test')).toBe('\x1b[2mtest\x1b[22m');
    });
  });
});

describe('detectColorMode', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clean up relevant env vars
    delete process.env['FORCE_COLOR'];
    delete process.env['OWS_COLOR'];
    delete process.env['NO_COLOR'];
    delete process.env['TERM'];
  });

  afterEach(() => {
    // Restore env
    process.env = { ...originalEnv };
  });

  it('returns always when FORCE_COLOR is set', () => {
    process.env['FORCE_COLOR'] = '1';
    expect(detectColorMode()).toBe('always');
  });

  it('returns never when FORCE_COLOR is 0', () => {
    process.env['FORCE_COLOR'] = '0';
    expect(detectColorMode()).toBe('never');
  });

  it('returns never when FORCE_COLOR is false', () => {
    process.env['FORCE_COLOR'] = 'false';
    expect(detectColorMode()).toBe('never');
  });

  it('returns always when OWS_COLOR is always', () => {
    process.env['OWS_COLOR'] = 'always';
    expect(detectColorMode()).toBe('always');
  });

  it('returns never when OWS_COLOR is never', () => {
    process.env['OWS_COLOR'] = 'never';
    expect(detectColorMode()).toBe('never');
  });

  it('returns never when NO_COLOR is set', () => {
    process.env['NO_COLOR'] = '';
    expect(detectColorMode()).toBe('never');
  });

  it('returns never when TERM is dumb', () => {
    process.env['TERM'] = 'dumb';
    expect(detectColorMode()).toBe('never');
  });

  it('FORCE_COLOR takes priority over NO_COLOR', () => {
    process.env['FORCE_COLOR'] = '1';
    process.env['NO_COLOR'] = '';
    expect(detectColorMode()).toBe('always');
  });

  it('OWS_COLOR takes priority over NO_COLOR', () => {
    process.env['OWS_COLOR'] = 'always';
    process.env['NO_COLOR'] = '';
    expect(detectColorMode()).toBe('always');
  });

  it('returns auto when OWS_COLOR is an unknown value', () => {
    process.env['OWS_COLOR'] = 'foobar';
    expect(detectColorMode()).toBe('auto');
  });

  it('returns always when OWS_COLOR is 1', () => {
    process.env['OWS_COLOR'] = '1';
    expect(detectColorMode()).toBe('always');
  });

  it('returns always when OWS_COLOR is true', () => {
    process.env['OWS_COLOR'] = 'true';
    expect(detectColorMode()).toBe('always');
  });

  it('returns never when OWS_COLOR is 0', () => {
    process.env['OWS_COLOR'] = '0';
    expect(detectColorMode()).toBe('never');
  });

  it('returns never when OWS_COLOR is false', () => {
    process.env['OWS_COLOR'] = 'false';
    expect(detectColorMode()).toBe('never');
  });

  it('returns based on stdout.isTTY when no env vars are set', () => {
    const origIsTTY = process.stdout.isTTY;
    try {
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true, configurable: true });
      expect(detectColorMode()).toBe('always');

      Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true, configurable: true });
      expect(detectColorMode()).toBe('never');
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', { value: origIsTTY, writable: true, configurable: true });
    }
  });

  it('returns never when stdout.isTTY is not a boolean', () => {
    const origIsTTY = process.stdout.isTTY;
    try {
      Object.defineProperty(process.stdout, 'isTTY', { value: undefined, writable: true, configurable: true });
      expect(detectColorMode()).toBe('never');
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', { value: origIsTTY, writable: true, configurable: true });
    }
  });
});
