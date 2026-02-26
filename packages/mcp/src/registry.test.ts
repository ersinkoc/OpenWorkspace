import { describe, it, expect, vi } from 'vitest';
import { createToolRegistry } from './registry.js';

describe('registry', () => {
  describe('createToolRegistry', () => {
    it('should create a registry', () => {
      const registry = createToolRegistry();
      expect(registry).toBeDefined();
      expect(registry.register).toBeDefined();
      expect(registry.unregister).toBeDefined();
      expect(registry.get).toBeDefined();
      expect(registry.list).toBeDefined();
      expect(registry.has).toBeDefined();
      expect(registry.invoke).toBeDefined();
      expect(registry.clear).toBeDefined();
      expect(registry.count).toBeDefined();
    });

    describe('register', () => {
      it('should register a valid tool', () => {
        const registry = createToolRegistry();
        const tool = {
          name: 'test-tool',
          description: 'A test tool',
          parameters: {},
          handler: vi.fn(),
        };
        const result = registry.register(tool);
        expect(result.ok).toBe(true);
        expect(registry.has('test-tool')).toBe(true);
      });

      it('should return error for missing name', () => {
        const registry = createToolRegistry();
        const tool = {
          name: '',
          description: 'A test tool',
          parameters: {},
          handler: vi.fn(),
        };
        const result = registry.register(tool);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('name is required');
        }
      });

      it('should return error for missing description', () => {
        const registry = createToolRegistry();
        const tool = {
          name: 'test-tool',
          description: '',
          parameters: {},
          handler: vi.fn(),
        };
        const result = registry.register(tool);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('description is required');
        }
      });

      it('should return error for non-function handler', () => {
        const registry = createToolRegistry();
        const tool = {
          name: 'test-tool',
          description: 'A test tool',
          parameters: {},
          handler: 'not a function',
        } as unknown as Parameters<typeof registry.register>[0];
        const result = registry.register(tool);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('handler must be a function');
        }
      });

      it('should return error for duplicate tool', () => {
        const registry = createToolRegistry();
        const tool = {
          name: 'test-tool',
          description: 'A test tool',
          parameters: {},
          handler: vi.fn(),
        };
        registry.register(tool);
        const result = registry.register(tool);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('already registered');
        }
      });
    });

    describe('unregister', () => {
      it('should unregister a tool', () => {
        const registry = createToolRegistry();
        const tool = {
          name: 'test-tool',
          description: 'A test tool',
          parameters: {},
          handler: vi.fn(),
        };
        registry.register(tool);
        expect(registry.has('test-tool')).toBe(true);
        const result = registry.unregister('test-tool');
        expect(result).toBe(true);
        expect(registry.has('test-tool')).toBe(false);
      });

      it('should return false for unknown tool', () => {
        const registry = createToolRegistry();
        const result = registry.unregister('unknown');
        expect(result).toBe(false);
      });
    });

    describe('get', () => {
      it('should return tool by name', () => {
        const registry = createToolRegistry();
        const tool = {
          name: 'test-tool',
          description: 'A test tool',
          parameters: {},
          handler: vi.fn(),
        };
        registry.register(tool);
        expect(registry.get('test-tool')).toBe(tool);
      });

      it('should return undefined for unknown tool', () => {
        const registry = createToolRegistry();
        expect(registry.get('unknown')).toBeUndefined();
      });
    });

    describe('list', () => {
      it('should return empty array initially', () => {
        const registry = createToolRegistry();
        expect(registry.list()).toEqual([]);
      });

      it('should return tool listings without handlers', () => {
        const registry = createToolRegistry();
        const tool = {
          name: 'test-tool',
          description: 'A test tool',
          parameters: { param1: { type: 'string' as const, description: 'Param 1' } },
          handler: vi.fn(),
        };
        registry.register(tool);
        const listings = registry.list();
        expect(listings).toHaveLength(1);
        expect(listings[0]).toEqual({
          name: 'test-tool',
          description: 'A test tool',
          parameters: { param1: { type: 'string', description: 'Param 1' } },
        });
        expect(listings[0]).not.toHaveProperty('handler');
      });
    });

    describe('has', () => {
      it('should return true for registered tool', () => {
        const registry = createToolRegistry();
        registry.register({
          name: 'test-tool',
          description: 'A test tool',
          parameters: {},
          handler: vi.fn(),
        });
        expect(registry.has('test-tool')).toBe(true);
      });

      it('should return false for unregistered tool', () => {
        const registry = createToolRegistry();
        expect(registry.has('unknown')).toBe(false);
      });
    });

    describe('invoke', () => {
      it('should invoke tool and return success result', async () => {
        const registry = createToolRegistry();
        const handler = vi.fn().mockResolvedValue('result');
        registry.register({
          name: 'test-tool',
          description: 'A test tool',
          parameters: {},
          handler,
        });
        const result = await registry.invoke('test-tool', {});
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.success).toBe(true);
          expect(result.value.data).toBe('result');
        }
        expect(handler).toHaveBeenCalledWith({});
      });

      it('should return error for unknown tool', async () => {
        const registry = createToolRegistry();
        const result = await registry.invoke('unknown', {});
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('not found');
        }
      });

      it('should validate required parameters', async () => {
        const registry = createToolRegistry();
        registry.register({
          name: 'test-tool',
          description: 'A test tool',
          parameters: {
            required: { type: 'string', description: 'Required param', required: true },
          },
          handler: vi.fn(),
        });
        const result = await registry.invoke('test-tool', {});
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("Parameter 'required' is required");
        }
      });

      it('should validate parameter types', async () => {
        const registry = createToolRegistry();
        registry.register({
          name: 'test-tool',
          description: 'A test tool',
          parameters: {
            num: { type: 'number', description: 'Number param', required: true },
          },
          handler: vi.fn(),
        });
        const result = await registry.invoke('test-tool', { num: 'not a number' });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("must be of type number");
        }
      });

      it('should reject unknown parameters', async () => {
        const registry = createToolRegistry();
        registry.register({
          name: 'test-tool',
          description: 'A test tool',
          parameters: {},
          handler: vi.fn(),
        });
        const result = await registry.invoke('test-tool', { unknown: 'value' });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("Unknown parameter: 'unknown'");
        }
      });

      it('should apply default values', async () => {
        const registry = createToolRegistry();
        const handler = vi.fn().mockResolvedValue('ok');
        registry.register({
          name: 'test-tool',
          description: 'A test tool',
          parameters: {
            withDefault: { type: 'string', description: 'Param with default', default: 'default_value' },
          },
          handler,
        });
        await registry.invoke('test-tool', {});
        expect(handler).toHaveBeenCalledWith({ withDefault: 'default_value' });
      });

      it('should validate enum values', async () => {
        const registry = createToolRegistry();
        registry.register({
          name: 'test-tool',
          description: 'A test tool',
          parameters: {
            choice: { type: 'string', description: 'Choice param', enum: ['a', 'b', 'c'], required: true },
          },
          handler: vi.fn(),
        });
        const result = await registry.invoke('test-tool', { choice: 'd' });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("must be one of: a, b, c");
        }
      });

      it('should handle handler errors gracefully', async () => {
        const registry = createToolRegistry();
        registry.register({
          name: 'test-tool',
          description: 'A test tool',
          parameters: {},
          handler: vi.fn().mockRejectedValue(new Error('Handler failed')),
        });
        const result = await registry.invoke('test-tool', {});
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.success).toBe(false);
          expect(result.value.error).toBe('Handler failed');
        }
      });

      it('should pass parameters to handler', async () => {
        const registry = createToolRegistry();
        const handler = vi.fn().mockResolvedValue('ok');
        registry.register({
          name: 'test-tool',
          description: 'A test tool',
          parameters: {
            str: { type: 'string', description: 'String param' },
            num: { type: 'number', description: 'Number param' },
            bool: { type: 'boolean', description: 'Boolean param' },
          },
          handler,
        });
        await registry.invoke('test-tool', { str: 'hello', num: 42, bool: true });
        expect(handler).toHaveBeenCalledWith({ str: 'hello', num: 42, bool: true });
      });
    });

    describe('clear', () => {
      it('should remove all tools', () => {
        const registry = createToolRegistry();
        registry.register({
          name: 'tool1',
          description: 'Tool 1',
          parameters: {},
          handler: vi.fn(),
        });
        registry.register({
          name: 'tool2',
          description: 'Tool 2',
          parameters: {},
          handler: vi.fn(),
        });
        expect(registry.count()).toBe(2);
        registry.clear();
        expect(registry.count()).toBe(0);
        expect(registry.has('tool1')).toBe(false);
        expect(registry.has('tool2')).toBe(false);
      });
    });

    describe('count', () => {
      it('should return 0 for empty registry', () => {
        const registry = createToolRegistry();
        expect(registry.count()).toBe(0);
      });

      it('should return correct count', () => {
        const registry = createToolRegistry();
        registry.register({
          name: 'tool1',
          description: 'Tool 1',
          parameters: {},
          handler: vi.fn(),
        });
        expect(registry.count()).toBe(1);
        registry.register({
          name: 'tool2',
          description: 'Tool 2',
          parameters: {},
          handler: vi.fn(),
        });
        expect(registry.count()).toBe(2);
      });
    });
  });
});
