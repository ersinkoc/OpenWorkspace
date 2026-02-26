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
  });
});
