import { describe, it, expect } from 'vitest';
import { ok, err, unwrap, unwrapOr, map, mapErr } from './result.js';

describe('result', () => {
  describe('ok', () => {
    it('should create a successful result', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should work with complex types', () => {
      const result = ok({ name: 'test', value: 123 });
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ name: 'test', value: 123 });
    });
  });

  describe('err', () => {
    it('should create a failed result', () => {
      const error = new Error('test error');
      const result = err(error);
      expect(result.ok).toBe(false);
      expect(result.error).toBe(error);
    });

    it('should work with string errors', () => {
      const result = err('string error');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('string error');
    });
  });

  describe('unwrap', () => {
    it('should return value for ok result', () => {
      const result = ok(42);
      expect(unwrap(result)).toBe(42);
    });

    it('should throw error for err result', () => {
      const error = new Error('test error');
      const result = err(error);
      expect(() => unwrap(result)).toThrow('test error');
    });
  });

  describe('unwrapOr', () => {
    it('should return value for ok result', () => {
      const result = ok(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    it('should return fallback for err result', () => {
      const result = err(new Error('test'));
      expect(unwrapOr(result, 0)).toBe(0);
    });
  });

  describe('map', () => {
    it('should transform ok value', () => {
      const result = ok(21);
      const mapped = map(result, (x) => x * 2);
      expect(mapped.ok).toBe(true);
      expect(mapped.value).toBe(42);
    });

    it('should pass through err result', () => {
      const error = new Error('test');
      const result = err(error);
      const mapped = map(result, (x: number) => x * 2);
      expect(mapped.ok).toBe(false);
      expect(mapped.error).toBe(error);
    });
  });

  describe('mapErr', () => {
    it('should transform err value', () => {
      const result = err('error');
      const mapped = mapErr(result, (e) => new Error(String(e)));
      expect(mapped.ok).toBe(false);
      expect(mapped.error).toBeInstanceOf(Error);
    });

    it('should pass through ok result', () => {
      const result = ok(42);
      const mapped = mapErr(result, (e) => new Error(String(e)));
      expect(mapped.ok).toBe(true);
      expect(mapped.value).toBe(42);
    });
  });
});
