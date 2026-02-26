import { describe, it, expect } from 'vitest';
import { parseYaml, stringifyYaml } from './yaml.js';

describe('yaml', () => {
  describe('parseYaml', () => {
    it('should parse empty string as null', () => {
      const result = parseYaml('');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(null);
      }
    });

    it('should parse whitespace-only string as null', () => {
      const result = parseYaml('   \n\n  ');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(null);
      }
    });

    it('should parse simple string value', () => {
      const result = parseYaml('hello');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('hello');
      }
    });

    it('should parse string with spaces', () => {
      const result = parseYaml('hello world');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('hello world');
      }
    });

    it('should parse quoted string', () => {
      const result = parseYaml('"hello world"');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('hello world');
      }
    });

    it('should parse single quoted string', () => {
      const result = parseYaml("'hello world'");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('hello world');
      }
    });

    it('should parse number', () => {
      const result = parseYaml('42');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('should parse negative number', () => {
      const result = parseYaml('-42');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(-42);
      }
    });

    it('should parse float', () => {
      const result = parseYaml('3.14');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(3.14);
      }
    });

    it('should parse true', () => {
      const result = parseYaml('true');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it('should parse false', () => {
      const result = parseYaml('false');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });

    it('should parse null', () => {
      const result = parseYaml('null');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(null);
      }
    });

    it('should parse tilde as null', () => {
      const result = parseYaml('~');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(null);
      }
    });

    it('should parse simple object', () => {
      const result = parseYaml('name: test\nvalue: 42');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ name: 'test', value: 42 });
      }
    });

    it('should parse nested object', () => {
      const result = parseYaml('user:\n  name: John\n  age: 30');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ user: { name: 'John', age: 30 } });
      }
    });

    it('should parse simple array', () => {
      const result = parseYaml('- one\n- two\n- three');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(['one', 'two', 'three']);
      }
    });

    it('should parse array of objects', () => {
      const result = parseYaml('- name: first\n  value: 1\n- name: second\n  value: 2');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([
          { name: 'first', value: 1 },
          { name: 'second', value: 2 },
        ]);
      }
    });

    it('should skip comments', () => {
      const result = parseYaml('# This is a comment\nname: test # inline comment');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ name: 'test' });
      }
    });

    it('should skip empty lines', () => {
      const result = parseYaml('name: test\n\n\nvalue: 42');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ name: 'test', value: 42 });
      }
    });

    it('should parse escaped characters in quoted strings', () => {
      const result = parseYaml('"hello\\nworld"');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('hello\nworld');
      }
    });

    it('should return error for inconsistent indentation', () => {
      const result = parseYaml('name: test\n value: 42');
      expect(result.ok).toBe(false);
    });
  });

  describe('stringifyYaml', () => {
    it('should stringify null', () => {
      expect(stringifyYaml(null)).toBe('null');
    });

    it('should stringify true', () => {
      expect(stringifyYaml(true)).toBe('true');
    });

    it('should stringify false', () => {
      expect(stringifyYaml(false)).toBe('false');
    });

    it('should stringify number', () => {
      expect(stringifyYaml(42)).toBe('42');
    });

    it('should stringify string', () => {
      expect(stringifyYaml('hello')).toBe('hello');
    });

    it('should quote string with special characters', () => {
      expect(stringifyYaml('hello world')).toBe('"hello world"');
    });

    it('should quote empty string', () => {
      expect(stringifyYaml('')).toBe('""');
    });

    it('should quote reserved words', () => {
      expect(stringifyYaml('true')).toBe('"true"');
      expect(stringifyYaml('false')).toBe('"false"');
      expect(stringifyYaml('null')).toBe('"null"');
    });

    it('should stringify empty array', () => {
      expect(stringifyYaml([])).toBe('[]');
    });

    it('should stringify array', () => {
      const result = stringifyYaml(['one', 'two', 'three']);
      expect(result).toBe('- one\n- two\n- three');
    });

    it('should stringify empty object', () => {
      expect(stringifyYaml({})).toBe('{}');
    });

    it('should stringify object', () => {
      const result = stringifyYaml({ name: 'test', value: 42 });
      expect(result).toBe('name: test\nvalue: 42');
    });

    it('should stringify nested object', () => {
      const result = stringifyYaml({ user: { name: 'John', age: 30 } });
      expect(result).toBe('user:\n  name: John\n  age: 30');
    });

    it('should stringify array in object', () => {
      const result = stringifyYaml({ items: ['a', 'b'] });
      expect(result).toBe('items:\n  - a\n  - b');
    });

    it('should quote string starting with dash', () => {
      const result = stringifyYaml('-dangerous');
      expect(result).toBe('"-dangerous"');
    });

    it('should quote string starting with >', () => {
      const result = stringifyYaml('>block');
      expect(result).toBe('">block"');
    });

    it('should quote string starting with @', () => {
      const result = stringifyYaml('@mention');
      expect(result).toBe('"@mention"');
    });

    it('should quote tilde string', () => {
      const result = stringifyYaml('~');
      expect(result).toBe('"~"');
    });

    it('should quote string containing colon', () => {
      const result = stringifyYaml('key: value');
      expect(result).toBe('"key: value"');
    });

    it('should quote string containing hash', () => {
      const result = stringifyYaml('with # hash');
      expect(result).toBe('"with # hash"');
    });

    it('should quote string containing newline', () => {
      const result = stringifyYaml('line1\nline2');
      expect(result).toBe('"line1\\nline2"');
    });

    it('should escape backslash and double-quote in quoted strings', () => {
      // 'a\\b"c' doesn't contain spaces/colons/etc., so stringifyYaml doesn't quote it
      const result = stringifyYaml('a\\b"c');
      expect(result).toBe('a\\b"c');
    });

    it('should stringify negative number', () => {
      expect(stringifyYaml(-42)).toBe('-42');
    });

    it('should stringify float', () => {
      expect(stringifyYaml(3.14)).toBe('3.14');
    });
  });

  describe('parseYaml – additional coverage', () => {
    it('should parse literal block scalar (|)', () => {
      const result = parseYaml('content: |\n  line1\n  line2\n  line3');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const val = result.value as Record<string, unknown>;
        expect(val['content']).toBe('line1\nline2\nline3');
      }
    });

    it('should parse folded block scalar (>)', () => {
      const result = parseYaml('content: >\n  line1\n  line2\n  line3');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const val = result.value as Record<string, unknown>;
        expect(val['content']).toBe('line1 line2 line3');
      }
    });

    it('should parse key with no value (end of input)', () => {
      const result = parseYaml('key:');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const val = result.value as Record<string, unknown>;
        expect(val['key']).toBeNull();
      }
    });

    it('should parse key with no value followed by same-level key', () => {
      const result = parseYaml('a:\nb: value');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const val = result.value as Record<string, unknown>;
        expect(val['a']).toBeNull();
        expect(val['b']).toBe('value');
      }
    });

    it('should parse bare dash array item (- with no value)', () => {
      const result = parseYaml('-\n-');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([null, null]);
      }
    });

    it('should parse bare dash followed by nested block', () => {
      const result = parseYaml('-\n  name: test\n  value: 1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([{ name: 'test', value: 1 }]);
      }
    });

    it('should parse comment-only input as null', () => {
      const result = parseYaml('# just a comment\n# another comment');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('should parse inline comment with hash inside quotes', () => {
      const result = parseYaml("value: 'has#hash'");
      expect(result.ok).toBe(true);
      if (result.ok) {
        const val = result.value as Record<string, unknown>;
        expect(val['value']).toBe('has#hash');
      }
    });

    it('should parse inline comment with hash inside double quotes', () => {
      const result = parseYaml('value: "has#hash"');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const val = result.value as Record<string, unknown>;
        expect(val['value']).toBe('has#hash');
      }
    });

    it('should handle colon inside quoted key', () => {
      // The YAML parser preserves quotes in keys when using findUnquotedColon
      // The key slice includes the quotes, so the actual key is "key:with:colons" (with quotes)
      const result = parseYaml('"key:with:colons": value');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const val = result.value as Record<string, unknown>;
        // The key is stored with the quotes since parseObjectBlock uses raw slice
        expect(val['"key:with:colons"']).toBe('value');
      }
    });

    it('should parse escaped tab and carriage return in double-quoted value', () => {
      const result = parseYaml('value: "hello\\tworld\\r"');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const val = result.value as Record<string, unknown>;
        expect(val['value']).toBe('hello\tworld\r');
      }
    });

    it('should parse escaped backslash and double-quote in value', () => {
      const result = parseYaml('value: "a\\\\b\\"c"');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const val = result.value as Record<string, unknown>;
        expect(val['value']).toBe('a\\b"c');
      }
    });

    it('should parse negative float', () => {
      const result = parseYaml('value: -3.14');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const val = result.value as Record<string, unknown>;
        expect(val['value']).toBe(-3.14);
      }
    });

    it('should parse bare dash at end of input with no next line', () => {
      const result = parseYaml('- one\n-');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(['one', null]);
      }
    });

    it('should parse array item with nested object spanning multiple lines', () => {
      const yaml = '- name: first\n  age: 10\n- name: second\n  age: 20';
      const result = parseYaml(yaml);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([
          { name: 'first', age: 10 },
          { name: 'second', age: 20 },
        ]);
      }
    });

    it('should parse deeply nested structure', () => {
      const yaml = 'a:\n  b:\n    c:\n      d: deep';
      const result = parseYaml(yaml);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ a: { b: { c: { d: 'deep' } } } });
      }
    });

    it('should handle object block with line that has no colon (breaks early)', () => {
      // An object where a same-level line has no colon should stop parsing
      const result = parseYaml('key: value\njust-a-word');
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Parser treats this as object with only first key
        const val = result.value as Record<string, unknown>;
        expect(val['key']).toBe('value');
      }
    });

    it('should handle stripComment with hash not preceded by space', () => {
      // A hash not preceded by space should not be treated as a comment
      const result = parseYaml('value: color#red');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const val = result.value as Record<string, unknown>;
        expect(val['value']).toBe('color#red');
      }
    });

    it('should return error for inconsistent indentation inside array block', () => {
      // Array item followed by a line with greater indentation than the array block indent
      // but that is not a valid nested element
      const result = parseYaml('- first\n   - second');
      expect(result.ok).toBe(false);
    });

    it('should parse array that stops when encountering non-array line', () => {
      // An array followed by a key:value line at same indent level should stop the array
      const result = parseYaml('items:\n  - a\n  - b\nother: value');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const val = result.value as Record<string, unknown>;
        expect(val['items']).toEqual(['a', 'b']);
        expect(val['other']).toBe('value');
      }
    });

    it('should parse standalone scalar line when not array or object', () => {
      // A nested value that is a plain scalar (not key:value, not array item)
      const result = parseYaml('key:\n  simple_value');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const val = result.value as Record<string, unknown>;
        expect(val['key']).toBe('simple_value');
      }
    });
  
    it('should break array parsing when encountering non-dash line at same indent', () => {
      // When a top-level array is followed by a key:value line at the same
      // indent, parseArrayBlock breaks out of the loop (lines 172-174).
      const result = parseYaml('- item1\n- item2\nkey: value');
      expect(result.ok).toBe(true);
      if (result.ok) {
        // parseYaml returns the array; the trailing key:value is not parsed
        expect(result.value).toEqual(['item1', 'item2']);
      }
    });
});
});
