import { describe, it, expect } from 'vitest';
import { parseJson5 } from './json5.js';

describe('json5', () => {
  describe('parseJson5', () => {
    it('should parse empty input as null', () => {
      const result = parseJson5('');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBeNull();
    });

    it('should parse null', () => {
      const result = parseJson5('null');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBeNull();
    });

    it('should parse true', () => {
      const result = parseJson5('true');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(true);
    });

    it('should parse false', () => {
      const result = parseJson5('false');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(false);
    });

    it('should parse integers', () => {
      const result = parseJson5('42');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(42);
    });

    it('should parse negative numbers', () => {
      const result = parseJson5('-3.14');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(-3.14);
    });

    it('should parse positive numbers with + sign', () => {
      const result = parseJson5('+42');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(42);
    });

    it('should parse hexadecimal numbers', () => {
      const result = parseJson5('0xFF');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(255);
    });

    it('should parse leading decimal point', () => {
      const result = parseJson5('.5');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(0.5);
    });

    it('should parse Infinity', () => {
      const result = parseJson5('Infinity');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(Infinity);
    });

    it('should parse -Infinity', () => {
      const result = parseJson5('-Infinity');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(-Infinity);
    });

    it('should parse NaN', () => {
      const result = parseJson5('NaN');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBeNaN();
    });

    it('should parse double-quoted strings', () => {
      const result = parseJson5('"hello world"');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('hello world');
    });

    it('should parse single-quoted strings', () => {
      const result = parseJson5("'hello world'");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('hello world');
    });

    it('should parse escape sequences in strings', () => {
      const result = parseJson5('"line1\\nline2\\ttab"');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('line1\nline2\ttab');
    });

    it('should parse unicode escapes', () => {
      const result = parseJson5('"\\u0048ello"');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('Hello');
    });

    it('should parse empty object', () => {
      const result = parseJson5('{}');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({});
    });

    it('should parse object with quoted keys', () => {
      const result = parseJson5('{"name": "test", "value": 42}');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ name: 'test', value: 42 });
    });

    it('should parse object with unquoted keys', () => {
      const result = parseJson5('{name: "test", value: 42}');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ name: 'test', value: 42 });
    });

    it('should parse object with trailing comma', () => {
      const result = parseJson5('{name: "test", value: 42,}');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ name: 'test', value: 42 });
    });

    it('should parse nested objects', () => {
      const result = parseJson5('{a: {b: {c: 1}}}');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ a: { b: { c: 1 } } });
    });

    it('should parse empty array', () => {
      const result = parseJson5('[]');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    });

    it('should parse array with values', () => {
      const result = parseJson5('[1, 2, 3]');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([1, 2, 3]);
    });

    it('should parse array with trailing comma', () => {
      const result = parseJson5('[1, 2, 3,]');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([1, 2, 3]);
    });

    it('should parse mixed arrays', () => {
      const result = parseJson5('[1, "two", true, null]');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([1, 'two', true, null]);
    });

    it('should ignore single-line comments', () => {
      const result = parseJson5(`{
        // This is a comment
        name: "test",
        // Another comment
        value: 42,
      }`);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ name: 'test', value: 42 });
    });

    it('should ignore multi-line comments', () => {
      const result = parseJson5(`{
        /* Multi-line
           comment */
        name: "test",
        value: 42,
      }`);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ name: 'test', value: 42 });
    });

    it('should parse a realistic config file', () => {
      const input = `{
        // Default timezone for calendar/gmail output
        default_timezone: "Europe/Istanbul",

        // Token storage backend
        token_backend: "file",

        // Cache settings
        cache: {
          backend: "memory",
          ttl: "5m",
          max_entries: 1000,
        },

        // Account aliases
        account_aliases: {
          work: "ersin@company.com",
          personal: "ersin@gmail.com",
        },

        // Rate limiting
        rate_limit: {
          strategy: "adaptive",
          max_rps: 10,
        },

        // MCP server settings
        mcp: {
          enabled_services: ["gmail", "calendar", "drive", "sheets", "tasks"],
          max_results_default: 20,
        },
      }`;

      const result = parseJson5(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const config = result.value as Record<string, unknown>;
        expect(config['default_timezone']).toBe('Europe/Istanbul');
        expect(config['token_backend']).toBe('file');

        const cache = config['cache'] as Record<string, unknown>;
        expect(cache['backend']).toBe('memory');
        expect(cache['ttl']).toBe('5m');
        expect(cache['max_entries']).toBe(1000);

        const aliases = config['account_aliases'] as Record<string, unknown>;
        expect(aliases['work']).toBe('ersin@company.com');

        const mcp = config['mcp'] as Record<string, unknown>;
        expect(mcp['enabled_services']).toEqual(['gmail', 'calendar', 'drive', 'sheets', 'tasks']);
      }
    });

    it('should parse exponent notation', () => {
      const result = parseJson5('1e10');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(1e10);
    });

    it('should parse negative exponent', () => {
      const result = parseJson5('1.5e-3');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(0.0015);
    });

    it('should handle single-quoted keys', () => {
      const result = parseJson5("{'name': 'test'}");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ name: 'test' });
    });

    it('should error on invalid input', () => {
      const result = parseJson5('{invalid');
      expect(result.ok).toBe(false);
    });

    it('should error on unterminated string', () => {
      const result = parseJson5('"unterminated');
      expect(result.ok).toBe(false);
    });

    it('should error on trailing content', () => {
      const result = parseJson5('42 extra');
      expect(result.ok).toBe(false);
    });

    it('should parse escaped quotes in strings', () => {
      const result = parseJson5('"say \\"hello\\""');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('say "hello"');
    });

    it('should parse backslash in strings', () => {
      const result = parseJson5('"c:\\\\path\\\\file"');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('c:\\path\\file');
    });
  });
});
