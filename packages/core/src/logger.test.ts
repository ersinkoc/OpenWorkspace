import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger, consoleSink, defaultLogger } from './logger.js';
import type { LogEntry, LogSink } from './logger.js';

describe('logger', () => {
  let mockSink: LogSink;
  let sinkCalls: LogEntry[];

  beforeEach(() => {
    sinkCalls = [];
    mockSink = vi.fn((entry: LogEntry) => {
      sinkCalls.push(entry);
    });
  });

  describe('createLogger', () => {
    it('should create a logger', () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.child).toBeDefined();
    });

    describe('log levels', () => {
      it('should log debug when level is debug', () => {
        const logger = createLogger({ level: 'debug', sink: mockSink });
        logger.debug('debug message');
        expect(sinkCalls).toHaveLength(1);
        expect(sinkCalls[0].level).toBe('debug');
        expect(sinkCalls[0].message).toBe('debug message');
      });

      it('should not log debug when level is info', () => {
        const logger = createLogger({ level: 'info', sink: mockSink });
        logger.debug('debug message');
        expect(sinkCalls).toHaveLength(0);
      });

      it('should log info when level is info', () => {
        const logger = createLogger({ level: 'info', sink: mockSink });
        logger.info('info message');
        expect(sinkCalls).toHaveLength(1);
        expect(sinkCalls[0].level).toBe('info');
      });

      it('should not log info when level is warn', () => {
        const logger = createLogger({ level: 'warn', sink: mockSink });
        logger.info('info message');
        expect(sinkCalls).toHaveLength(0);
      });

      it('should log warn when level is warn', () => {
        const logger = createLogger({ level: 'warn', sink: mockSink });
        logger.warn('warn message');
        expect(sinkCalls).toHaveLength(1);
        expect(sinkCalls[0].level).toBe('warn');
      });

      it('should not log warn when level is error', () => {
        const logger = createLogger({ level: 'error', sink: mockSink });
        logger.warn('warn message');
        expect(sinkCalls).toHaveLength(0);
      });

      it('should log error when level is error', () => {
        const logger = createLogger({ level: 'error', sink: mockSink });
        logger.error('error message');
        expect(sinkCalls).toHaveLength(1);
        expect(sinkCalls[0].level).toBe('error');
      });
    });

    describe('context', () => {
      it('should include context in log entry', () => {
        const logger = createLogger({ sink: mockSink });
        logger.info('message', { key: 'value', num: 123 });
        expect(sinkCalls[0].context).toEqual({ key: 'value', num: 123 });
      });

      it('should work without context', () => {
        const logger = createLogger({ sink: mockSink });
        logger.info('message');
        expect(sinkCalls[0].context).toBeUndefined();
      });
    });

    describe('timestamp', () => {
      it('should include timestamp', () => {
        const before = new Date();
        const logger = createLogger({ sink: mockSink });
        logger.info('message');
        const after = new Date();
        expect(sinkCalls[0].timestamp).toBeInstanceOf(Date);
        expect(sinkCalls[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(sinkCalls[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
      });
    });

    describe('prefix', () => {
      it('should add prefix to messages', () => {
        const logger = createLogger({ prefix: 'TEST', sink: mockSink });
        logger.info('message');
        expect(sinkCalls[0].message).toBe('[TEST] message');
      });

      it('should work without prefix', () => {
        const logger = createLogger({ sink: mockSink });
        logger.info('message');
        expect(sinkCalls[0].message).toBe('message');
      });
    });

    describe('child', () => {
      it('should create child logger with combined prefix', () => {
        const parent = createLogger({ prefix: 'PARENT', sink: mockSink });
        const child = parent.child('CHILD');
        child.info('message');
        expect(sinkCalls[0].message).toBe('[PARENT:CHILD] message');
      });

      it('should inherit log level', () => {
        const parent = createLogger({ level: 'error', sink: mockSink });
        const child = parent.child('CHILD');
        child.info('message');
        expect(sinkCalls).toHaveLength(0);
        child.error('error');
        expect(sinkCalls).toHaveLength(1);
      });

      it('should inherit sink', () => {
        const parent = createLogger({ sink: mockSink });
        const child = parent.child('CHILD');
        child.info('message');
        expect(sinkCalls).toHaveLength(1);
      });
    });
  });

  describe('consoleSink', () => {
    it('should be defined', () => {
      expect(consoleSink).toBeDefined();
      expect(typeof consoleSink).toBe('function');
    });
  });

  describe('defaultLogger', () => {
    it('should be defined', () => {
      expect(defaultLogger).toBeDefined();
      expect(defaultLogger.debug).toBeDefined();
      expect(defaultLogger.info).toBeDefined();
      expect(defaultLogger.warn).toBeDefined();
      expect(defaultLogger.error).toBeDefined();
    });
  });
});
