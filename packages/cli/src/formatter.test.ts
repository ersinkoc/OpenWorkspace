import { describe, it, expect } from 'vitest';
import { formatOutput, detectFormat } from './formatter.js';

describe('formatOutput', () => {
  // ── Table format ─────────────────────────────────────

  describe('table', () => {
    it('formats array of objects as a table', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const result = formatOutput(data, 'table');
      expect(result).toContain('name');
      expect(result).toContain('age');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
      expect(result).toContain('|');
      expect(result).toContain('+');
      expect(result).toContain('-');
    });

    it('formats single object as a one-row table', () => {
      const data = { id: 1, status: 'ok' };
      const result = formatOutput(data, 'table');
      expect(result).toContain('id');
      expect(result).toContain('status');
      expect(result).toContain('1');
      expect(result).toContain('ok');
    });

    it('formats array of primitives as single-column table', () => {
      const data = ['a', 'b', 'c'];
      const result = formatOutput(data, 'table');
      expect(result).toContain('value');
      expect(result).toContain('a');
      expect(result).toContain('b');
      expect(result).toContain('c');
    });

    it('formats a single primitive', () => {
      const result = formatOutput(42, 'table');
      expect(result).toContain('42');
    });

    it('returns empty string for empty array', () => {
      const result = formatOutput([], 'table');
      expect(result).toBe('');
    });

    it('right-aligns numbers', () => {
      const data = [
        { name: 'x', count: 5 },
        { name: 'yy', count: 100 },
      ];
      const result = formatOutput(data, 'table');
      const lines = result.split('\n');
      // The numeric column should be right-aligned: '  5' for count 5
      const dataLine = lines.find(l => l.includes('x') && !l.includes('name'));
      expect(dataLine).toBeDefined();
      // count=5 should come after name=x, padded with spaces
      expect(dataLine).toContain('  5');
    });

    it('truncates with maxWidth', () => {
      const data = [{ description: 'This is a very long description text' }];
      const result = formatOutput(data, 'table', { maxWidth: 10 });
      expect(result).toContain('This is...');
    });

    it('selects specific columns', () => {
      const data = [{ a: 1, b: 2, c: 3 }];
      const result = formatOutput(data, 'table', { columns: ['a', 'c'] });
      expect(result).toContain('a');
      expect(result).toContain('c');
      expect(result).not.toContain('| b');
    });

    it('handles noHeader option', () => {
      const data = [{ x: 1 }];
      const withHeader = formatOutput(data, 'table');
      const withoutHeader = formatOutput(data, 'table', { noHeader: true });
      // Without header there should be fewer lines
      expect(withoutHeader.split('\n').length).toBeLessThan(withHeader.split('\n').length);
    });

    it('handles null and undefined values', () => {
      const data = [{ a: null, b: undefined }];
      const result = formatOutput(data, 'table');
      expect(result).toContain('null');
    });

    it('handles nested objects by JSON stringifying', () => {
      const data = [{ obj: { nested: true } }];
      const result = formatOutput(data, 'table');
      expect(result).toContain('{"nested":true}');
    });
  });

  // ── JSON format ──────────────────────────────────────

  describe('json', () => {
    it('formats array of objects as pretty JSON', () => {
      const data = [{ name: 'Alice' }];
      const result = formatOutput(data, 'json');
      expect(result).toBe(JSON.stringify(data, null, 2));
    });

    it('formats a single value', () => {
      const result = formatOutput('hello', 'json');
      expect(result).toBe('"hello"');
    });

    it('formats null', () => {
      const result = formatOutput(null, 'json');
      expect(result).toBe('null');
    });

    it('formats number', () => {
      const result = formatOutput(42, 'json');
      expect(result).toBe('42');
    });

    it('pretty-prints with 2-space indent', () => {
      const data = { a: { b: 1 } };
      const result = formatOutput(data, 'json');
      expect(result).toContain('  "a"');
      expect(result).toContain('    "b"');
    });
  });

  // ── Plain (TSV) format ───────────────────────────────

  describe('plain', () => {
    it('formats array of objects as TSV with headers', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const result = formatOutput(data, 'plain');
      const lines = result.split('\n');
      expect(lines[0]).toBe('name\tage');
      expect(lines[1]).toBe('Alice\t30');
      expect(lines[2]).toBe('Bob\t25');
    });

    it('formats single object as TSV', () => {
      const data = { x: 1, y: 2 };
      const result = formatOutput(data, 'plain');
      const lines = result.split('\n');
      expect(lines[0]).toBe('x\ty');
      expect(lines[1]).toBe('1\t2');
    });

    it('supports noHeader', () => {
      const data = [{ name: 'test' }];
      const result = formatOutput(data, 'plain', { noHeader: true });
      expect(result).toBe('test');
    });

    it('returns empty string for empty array', () => {
      const result = formatOutput([], 'plain');
      expect(result).toBe('');
    });
  });

  // ── CSV format ───────────────────────────────────────

  describe('csv', () => {
    it('formats array of objects as CSV with headers', () => {
      const data = [
        { name: 'Alice', city: 'NYC' },
        { name: 'Bob', city: 'LA' },
      ];
      const result = formatOutput(data, 'csv');
      const lines = result.split('\n');
      expect(lines[0]).toBe('name,city');
      expect(lines[1]).toBe('Alice,NYC');
      expect(lines[2]).toBe('Bob,LA');
    });

    it('quotes values containing commas', () => {
      const data = [{ text: 'hello, world' }];
      const result = formatOutput(data, 'csv');
      expect(result).toContain('"hello, world"');
    });

    it('escapes internal quotes by doubling', () => {
      const data = [{ text: 'say "hello"' }];
      const result = formatOutput(data, 'csv');
      expect(result).toContain('"say ""hello"""');
    });

    it('quotes values with newlines', () => {
      const data = [{ text: 'line1\nline2' }];
      const result = formatOutput(data, 'csv');
      expect(result).toContain('"line1\nline2"');
    });

    it('supports noHeader', () => {
      const data = [{ a: 1 }];
      const result = formatOutput(data, 'csv', { noHeader: true });
      expect(result).toBe('1');
    });

    it('returns empty string for empty array', () => {
      const result = formatOutput([], 'csv');
      expect(result).toBe('');
    });
  });

  // ── Edge cases ───────────────────────────────────────

  describe('edge cases', () => {
    it('handles undefined data', () => {
      const result = formatOutput(undefined, 'json');
      expect(result).toBeDefined();
    });

    it('handles heterogeneous arrays', () => {
      const data = [
        { a: 1, b: 2 },
        { a: 3, c: 4 },
      ];
      const result = formatOutput(data, 'table');
      expect(result).toContain('a');
      expect(result).toContain('b');
      expect(result).toContain('c');
    });

    it('handles boolean values', () => {
      const data = [{ active: true, deleted: false }];
      const result = formatOutput(data, 'plain');
      expect(result).toContain('true');
      expect(result).toContain('false');
    });
  });
});

describe('detectFormat', () => {
  it('returns json when json flag is true', () => {
    expect(detectFormat({ json: true })).toBe('json');
  });

  it('returns plain when plain flag is true', () => {
    expect(detectFormat({ plain: true })).toBe('plain');
  });

  it('returns csv when csv flag is true', () => {
    expect(detectFormat({ csv: true })).toBe('csv');
  });

  it('defaults to table', () => {
    expect(detectFormat({})).toBe('table');
  });

  it('handles string truthy values', () => {
    expect(detectFormat({ json: 'yes' })).toBe('json');
  });

  it('handles string falsy values', () => {
    expect(detectFormat({ json: 'false' })).toBe('table');
    expect(detectFormat({ json: '0' })).toBe('table');
  });

  it('prioritizes json over plain', () => {
    expect(detectFormat({ json: true, plain: true })).toBe('json');
  });
});
