import { describe, it, expect, vi } from 'vitest';
import { createEventBus } from './events.js';

describe('events', () => {
  describe('createEventBus', () => {
    it('should create an event bus', () => {
      const bus = createEventBus();
      expect(bus).toBeDefined();
      expect(bus.on).toBeDefined();
      expect(bus.once).toBeDefined();
      expect(bus.emit).toBeDefined();
      expect(bus.off).toBeDefined();
      expect(bus.listenerCount).toBeDefined();
    });

    describe('on', () => {
      it('should subscribe to events', () => {
        const bus = createEventBus();
        const handler = vi.fn();
        bus.on('test', handler);
        bus.emit('test', 'data');
        expect(handler).toHaveBeenCalledWith('data');
      });

      it('should return unsubscribe function', () => {
        const bus = createEventBus();
        const handler = vi.fn();
        const sub = bus.on('test', handler);
        sub.unsubscribe();
        bus.emit('test', 'data');
        expect(handler).not.toHaveBeenCalled();
      });

      it('should support multiple handlers', () => {
        const bus = createEventBus();
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        bus.on('test', handler1);
        bus.on('test', handler2);
        bus.emit('test', 'data');
        expect(handler1).toHaveBeenCalledWith('data');
        expect(handler2).toHaveBeenCalledWith('data');
      });
    });

    describe('once', () => {
      it('should only trigger once', () => {
        const bus = createEventBus();
        const handler = vi.fn();
        bus.once('test', handler);
        bus.emit('test', 'first');
        bus.emit('test', 'second');
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith('first');
      });
    });

    describe('emit', () => {
      it('should emit to all handlers', () => {
        const bus = createEventBus();
        const handler = vi.fn();
        bus.on('test', handler);
        bus.emit('test', { key: 'value' });
        expect(handler).toHaveBeenCalledWith({ key: 'value' });
      });

      it('should not throw if no handlers', () => {
        const bus = createEventBus();
        expect(() => bus.emit('nonexistent', 'data')).not.toThrow();
      });

      it('should emit errors on error channel', () => {
        const bus = createEventBus();
        const errorHandler = vi.fn();
        const throwingHandler = vi.fn().mockImplementation(() => {
          throw new Error('test error');
        });
        bus.on('error', errorHandler);
        bus.on('test', throwingHandler);
        bus.emit('test', 'data');
        expect(throwingHandler).toHaveBeenCalled();
        expect(errorHandler).toHaveBeenCalled();
      });
    });

    describe('off', () => {
      it('should remove all handlers for event', () => {
        const bus = createEventBus();
        const handler = vi.fn();
        bus.on('test', handler);
        bus.off('test');
        bus.emit('test', 'data');
        expect(handler).not.toHaveBeenCalled();
      });

      it('should remove all handlers when no event specified', () => {
        const bus = createEventBus();
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        bus.on('test1', handler1);
        bus.on('test2', handler2);
        bus.off();
        bus.emit('test1', 'data');
        bus.emit('test2', 'data');
        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).not.toHaveBeenCalled();
      });
    });

    describe('listenerCount', () => {
      it('should return 0 for no listeners', () => {
        const bus = createEventBus();
        expect(bus.listenerCount('test')).toBe(0);
      });

      it('should return correct count', () => {
        const bus = createEventBus();
        bus.on('test', vi.fn());
        bus.on('test', vi.fn());
        expect(bus.listenerCount('test')).toBe(2);
      });

      it('should update after unsubscribe', () => {
        const bus = createEventBus();
        const sub = bus.on('test', vi.fn());
        expect(bus.listenerCount('test')).toBe(1);
        sub.unsubscribe();
        expect(bus.listenerCount('test')).toBe(0);
      });
    });
  });
});
