import { describe, it, expect } from 'vitest';
import {
  WorkspaceError,
  ConfigError,
  AuthError,
  NetworkError,
  RateLimitError,
  ValidationError,
  PluginError,
  NotFoundError,
  isWorkspaceError,
  isErrorType,
} from './errors.js';

describe('errors', () => {
  describe('WorkspaceError', () => {
    it('should create base error with all properties', () => {
      const error = new WorkspaceError('test message', 'TEST_CODE', { key: 'value' }, 500);
      expect(error.message).toBe('test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.context).toEqual({ key: 'value' });
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('WorkspaceError');
    });

    it('should serialize to JSON', () => {
      const error = new WorkspaceError('test', 'CODE', { foo: 'bar' }, 400);
      const json = error.toJSON();
      expect(json).toEqual({
        name: 'WorkspaceError',
        message: 'test',
        code: 'CODE',
        context: { foo: 'bar' },
        statusCode: 400,
      });
    });
  });

  describe('ConfigError', () => {
    it('should have correct code and name', () => {
      const error = new ConfigError('config failed');
      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.name).toBe('ConfigError');
    });
  });

  describe('AuthError', () => {
    it('should have correct code, name and status', () => {
      const error = new AuthError('auth failed');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.name).toBe('AuthError');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('NetworkError', () => {
    it('should have correct code and name', () => {
      const error = new NetworkError('network failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.name).toBe('NetworkError');
    });

    it('should accept status code', () => {
      const error = new NetworkError('network failed', {}, 503);
      expect(error.statusCode).toBe(503);
    });
  });

  describe('RateLimitError', () => {
    it('should have correct code, name and status', () => {
      const error = new RateLimitError('rate limited');
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.name).toBe('RateLimitError');
      expect(error.statusCode).toBe(429);
    });

    it('should accept resetAt date', () => {
      const resetAt = new Date('2024-01-01');
      const error = new RateLimitError('rate limited', resetAt);
      expect(error.resetAt).toBe(resetAt);
    });
  });

  describe('ValidationError', () => {
    it('should have correct code, name and status', () => {
      const error = new ValidationError('validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('PluginError', () => {
    it('should have correct code and name', () => {
      const error = new PluginError('plugin failed');
      expect(error.code).toBe('PLUGIN_ERROR');
      expect(error.name).toBe('PluginError');
    });
  });

  describe('NotFoundError', () => {
    it('should have correct code, name and status', () => {
      const error = new NotFoundError('not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('isWorkspaceError', () => {
    it('should return true for WorkspaceError', () => {
      expect(isWorkspaceError(new WorkspaceError('test', 'CODE'))).toBe(true);
    });

    it('should return true for subclasses', () => {
      expect(isWorkspaceError(new ConfigError('test'))).toBe(true);
      expect(isWorkspaceError(new AuthError('test'))).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isWorkspaceError(new Error('test'))).toBe(false);
    });

    it('should return false for non-errors', () => {
      expect(isWorkspaceError('string')).toBe(false);
      expect(isWorkspaceError(null)).toBe(false);
      expect(isWorkspaceError(undefined)).toBe(false);
    });
  });

  describe('isErrorType', () => {
    it('should return true for matching type', () => {
      const error = new ConfigError('test');
      expect(isErrorType(error, ConfigError)).toBe(true);
    });

    it('should return false for non-matching type', () => {
      const error = new AuthError('test');
      expect(isErrorType(error, ConfigError)).toBe(false);
    });
  });
});
