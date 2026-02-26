import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createKernel } from './kernel.js';
import type { Plugin } from './kernel.js';

describe('kernel', () => {
  describe('createKernel', () => {
    it('should create a kernel', () => {
      const kernel = createKernel();
      expect(kernel).toBeDefined();
      expect(kernel.state).toBe('created');
      expect(kernel.events).toBeDefined();
      expect(kernel.logger).toBeDefined();
      expect(kernel.use).toBeDefined();
      expect(kernel.init).toBeDefined();
      expect(kernel.shutdown).toBeDefined();
      expect(kernel.getPlugin).toBeDefined();
      expect(kernel.listPlugins).toBeDefined();
      expect(kernel.getCommands).toBeDefined();
      expect(kernel.getTools).toBeDefined();
    });

    describe('use', () => {
      it('should register a plugin', async () => {
        const kernel = createKernel();
        const plugin: Plugin = {
          name: 'test-plugin',
          setup: vi.fn(),
        };
        const result = await kernel.use(plugin);
        expect(result.ok).toBe(true);
        expect(kernel.listPlugins()).toContain('test-plugin');
      });

      it('should return error for duplicate plugin', async () => {
        const kernel = createKernel();
        const plugin: Plugin = {
          name: 'test-plugin',
          setup: vi.fn(),
        };
        await kernel.use(plugin);
        const result = await kernel.use(plugin);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('already registered');
        }
      });
    });

    describe('init', () => {
      it('should initialize plugins', async () => {
        const kernel = createKernel();
        const setupFn = vi.fn();
        const plugin: Plugin = {
          name: 'test-plugin',
          setup: setupFn,
        };
        await kernel.use(plugin);
        const result = await kernel.init();
        expect(result.ok).toBe(true);
        expect(setupFn).toHaveBeenCalled();
        expect(kernel.state).toBe('ready');
      });

      it('should emit kernel:ready event', async () => {
        const kernel = createKernel();
        const handler = vi.fn();
        kernel.events.on('kernel:ready', handler);
        await kernel.init();
        expect(handler).toHaveBeenCalled();
      });

      it('should return ok if already initialized', async () => {
        const kernel = createKernel();
        await kernel.init();
        const result = await kernel.init();
        expect(result.ok).toBe(true);
      });

      it('should return error if already initializing', async () => {
        const kernel = createKernel();
        const plugin: Plugin = {
          name: 'slow-plugin',
          setup: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
        };
        await kernel.use(plugin);
        const initPromise = kernel.init();
        const result = await kernel.init();
        await initPromise;
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('already initializing');
        }
      });

      it('should handle plugin setup errors', async () => {
        const kernel = createKernel();
        const plugin: Plugin = {
          name: 'failing-plugin',
          setup: vi.fn().mockRejectedValue(new Error('setup failed')),
        };
        await kernel.use(plugin);
        const result = await kernel.init();
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('setup failed');
        }
        expect(kernel.state).toBe('error');
      });
    });

    describe('shutdown', () => {
      it('should teardown plugins', async () => {
        const kernel = createKernel();
        const teardownFn = vi.fn();
        const plugin: Plugin = {
          name: 'test-plugin',
          setup: vi.fn(),
          teardown: teardownFn,
        };
        await kernel.use(plugin);
        await kernel.init();
        await kernel.shutdown();
        expect(teardownFn).toHaveBeenCalled();
        expect(kernel.state).toBe('shutdown');
      });

      it('should emit kernel:shutdown event', async () => {
        const kernel = createKernel();
        const handler = vi.fn();
        kernel.events.on('kernel:shutdown', handler);
        await kernel.init();
        await kernel.shutdown();
        expect(handler).toHaveBeenCalled();
      });

      it('should handle teardown errors gracefully', async () => {
        const kernel = createKernel();
        const plugin: Plugin = {
          name: 'failing-plugin',
          setup: vi.fn(),
          teardown: vi.fn().mockRejectedValue(new Error('teardown failed')),
        };
        await kernel.use(plugin);
        await kernel.init();
        await expect(kernel.shutdown()).resolves.not.toThrow();
        expect(kernel.state).toBe('shutdown');
      });

      it('should be safe to call multiple times', async () => {
        const kernel = createKernel();
        await kernel.init();
        await kernel.shutdown();
        await kernel.shutdown();
        expect(kernel.state).toBe('shutdown');
      });
    });

    describe('getPlugin', () => {
      it('should return plugin by name', async () => {
        const kernel = createKernel();
        const plugin: Plugin = {
          name: 'test-plugin',
          setup: vi.fn(),
        };
        await kernel.use(plugin);
        expect(kernel.getPlugin('test-plugin')).toBe(plugin);
      });

      it('should return undefined for unknown plugin', () => {
        const kernel = createKernel();
        expect(kernel.getPlugin('unknown')).toBeUndefined();
      });
    });

    describe('listPlugins', () => {
      it('should return empty array initially', () => {
        const kernel = createKernel();
        expect(kernel.listPlugins()).toEqual([]);
      });

      it('should return registered plugin names', async () => {
        const kernel = createKernel();
        await kernel.use({ name: 'plugin1', setup: vi.fn() });
        await kernel.use({ name: 'plugin2', setup: vi.fn() });
        expect(kernel.listPlugins()).toEqual(['plugin1', 'plugin2']);
      });
    });

    describe('getCommands', () => {
      it('should return empty map initially', () => {
        const kernel = createKernel();
        expect(kernel.getCommands().size).toBe(0);
      });

      it('should return registered commands', async () => {
        const kernel = createKernel();
        const handler = vi.fn();
        const plugin: Plugin = {
          name: 'test-plugin',
          setup: (ctx) => {
            ctx.registerCommand('test', handler);
          },
        };
        await kernel.use(plugin);
        await kernel.init();
        const commands = kernel.getCommands();
        expect(commands.has('test-plugin:test')).toBe(true);
        expect(commands.get('test-plugin:test')).toBe(handler);
      });
    });

    describe('getTools', () => {
      it('should return empty map initially', () => {
        const kernel = createKernel();
        expect(kernel.getTools().size).toBe(0);
      });

      it('should return registered tools', async () => {
        const kernel = createKernel();
        const toolDef = {
          description: 'Test tool',
          parameters: {},
          handler: vi.fn(),
        };
        const plugin: Plugin = {
          name: 'test-plugin',
          setup: (ctx) => {
            ctx.registerTool('test', toolDef);
          },
        };
        await kernel.use(plugin);
        await kernel.init();
        const tools = kernel.getTools();
        expect(tools.has('test-plugin:test')).toBe(true);
        expect(tools.get('test-plugin:test')).toBe(toolDef);
      });
    });

    describe('plugin context', () => {
      it('should provide events to plugin', async () => {
        const kernel = createKernel();
        let receivedEvents: unknown;
        const plugin: Plugin = {
          name: 'test-plugin',
          setup: (ctx) => {
            receivedEvents = ctx.events;
          },
        };
        await kernel.use(plugin);
        await kernel.init();
        expect(receivedEvents).toBe(kernel.events);
      });

      it('should provide logger to plugin', async () => {
        const kernel = createKernel();
        let receivedLogger: unknown;
        const plugin: Plugin = {
          name: 'test-plugin',
          setup: (ctx) => {
            receivedLogger = ctx.logger;
          },
        };
        await kernel.use(plugin);
        await kernel.init();
        expect(receivedLogger).toBeDefined();
      });

      it('should provide metadata map to plugin', async () => {
        const kernel = createKernel();
        let receivedMetadata: unknown;
        const plugin: Plugin = {
          name: 'test-plugin',
          setup: (ctx) => {
            receivedMetadata = ctx.metadata;
          },
        };
        await kernel.use(plugin);
        await kernel.init();
        expect(receivedMetadata).toBeInstanceOf(Map);
      });
    });
  });
});
