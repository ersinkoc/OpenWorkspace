import { describe, it, expect } from 'vitest';
import { parseArgs, getStringFlag, getBooleanFlag, getArrayFlag } from './parser.js';

describe('parser', () => {
  describe('parseArgs', () => {
    it('should parse empty args', () => {
      const result = parseArgs([]);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value._).toEqual([]);
        expect(result.value.flags).toEqual({});
      }
    });

    it('should parse positional arguments', () => {
      const result = parseArgs(['command', 'subcommand']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value._).toEqual(['command', 'subcommand']);
      }
    });

    it('should parse long option with value', () => {
      const result = parseArgs(['--name', 'test']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.flags.name).toBe('test');
      }
    });

    it('should parse long option with = value', () => {
      const result = parseArgs(['--name=test']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.flags.name).toBe('test');
      }
    });

    it('should parse boolean flags', () => {
      const result = parseArgs(['--verbose'], { boolean: ['verbose'] });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.flags.verbose).toBe(true);
      }
    });

    it('should parse flag without value as boolean', () => {
      const result = parseArgs(['--flag', '--other']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.flags.flag).toBe(true);
        expect(result.value.flags.other).toBe(true);
      }
    });

    it('should parse short options', () => {
      const result = parseArgs(['-v'], { boolean: ['v'] });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.flags.v).toBe(true);
      }
    });

    it('should parse combined short options', () => {
      const result = parseArgs(['-abc'], { boolean: ['a', 'b', 'c'] });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.flags.a).toBe(true);
        expect(result.value.flags.b).toBe(true);
        expect(result.value.flags.c).toBe(true);
      }
    });

    it('should resolve aliases', () => {
      const result = parseArgs(['-v'], { alias: { v: 'version' }, boolean: ['version'] });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.flags.version).toBe(true);
      }
    });

    it('should apply defaults', () => {
      const result = parseArgs([], { default: { format: 'json' } });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.flags.format).toBe('json');
      }
    });

    it('should handle -- separator', () => {
      const result = parseArgs(['--flag', '--', '--not-a-flag', 'value'], { boolean: ['flag'] });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.flags.flag).toBe(true);
        expect(result.value._).toEqual(['--not-a-flag', 'value']);
      }
    });

    it('should mix positional and flags', () => {
      const result = parseArgs(['command', '--json', 'file.txt'], { boolean: ['json'] });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value._).toEqual(['command', 'file.txt']);
        expect(result.value.flags.json).toBe(true);
      }
    });

    it('should store raw args', () => {
      const args = ['--name', 'test', 'command'];
      const result = parseArgs(args);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.raw).toBe(args);
      }
    });

    it('should handle array flags', () => {
      const result = parseArgs(['--tag', 'a', '--tag', 'b'], { array: ['tag'] });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.flags.tag).toEqual(['a', 'b']);
      }
    });
  });

  describe('getStringFlag', () => {
    it('should return string flag value', () => {
      expect(getStringFlag({ name: 'test' }, 'name')).toBe('test');
    });

    it('should return undefined for missing flag', () => {
      expect(getStringFlag({}, 'name')).toBeUndefined();
    });

    it('should return default value for missing flag', () => {
      expect(getStringFlag({}, 'name', 'default')).toBe('default');
    });

    it('should return default for non-string flag', () => {
      expect(getStringFlag({ flag: true }, 'flag', 'default')).toBe('default');
    });
  });

  describe('getBooleanFlag', () => {
    it('should return boolean flag value', () => {
      expect(getBooleanFlag({ verbose: true }, 'verbose')).toBe(true);
    });

    it('should return false for missing flag', () => {
      expect(getBooleanFlag({}, 'verbose')).toBe(false);
    });

    it('should parse string true', () => {
      expect(getBooleanFlag({ flag: 'true' }, 'flag')).toBe(true);
    });

    it('should return default for missing flag', () => {
      expect(getBooleanFlag({}, 'flag', true)).toBe(true);
    });
  });

  describe('getArrayFlag', () => {
    it('should return array flag value', () => {
      expect(getArrayFlag({ tags: ['a', 'b'] }, 'tags')).toEqual(['a', 'b']);
    });

    it('should wrap string in array', () => {
      expect(getArrayFlag({ tag: 'a' }, 'tag')).toEqual(['a']);
    });

    it('should return empty array for missing flag', () => {
      expect(getArrayFlag({}, 'tags')).toEqual([]);
    });
  });
});
