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

    it('should treat short non-boolean last char as true when no next arg', () => {
      // -x where x is NOT boolean and there is no next arg => flags.x = true
      const result = parseArgs(['-x']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.flags.x).toBe(true);
      }
    });

    it('should treat short non-boolean last char as true when next arg starts with dash', () => {
      // -x --other where x is NOT boolean => flags.x = true (no value consumed)
      const result = parseArgs(['-x', '--other'], { boolean: ['other'] });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.flags.x).toBe(true);
        expect(result.value.flags.other).toBe(true);
      }
    });

    it('should treat short non-boolean middle chars as true in combined short options', () => {
      // -abc where only c is NOT boolean => a and b set to true (middle non-boolean), c gets value
      // but actually for this to hit line 147, we need a middle char that is NOT boolean
      const result = parseArgs(['-xy', 'val']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        // x is middle char, NOT in boolean list, so it becomes true (line 147)
        expect(result.value.flags.x).toBe(true);
        // y is last char, NOT boolean, nextArg is 'val' so it gets the value
        expect(result.value.flags.y).toBe('val');
      }
    });

    it('should convert string flag to array when same array flag is provided twice with default', () => {
      // First pass sets flags.tag = 'initial' (from default), second --tag sets it as array
      const result = parseArgs(['--tag', 'a', '--tag', 'b'], { array: ['tag'], default: { tag: 'initial' } });
      expect(result.ok).toBe(true);
      if (result.ok) {
        // default 'initial' is overwritten: first --tag a: existing is string 'initial' -> ['initial', 'a']
        // then --tag b: existing is array ['initial', 'a'] -> ['initial', 'a', 'b']
        expect(result.value.flags.tag).toEqual(['initial', 'a', 'b']);
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
