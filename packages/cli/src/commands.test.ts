import { describe, it, expect } from 'vitest';
import { createCommandRegistry } from './commands.js';
import type { ParsedArgs } from './parser.js';

function makeArgs(positional: string[] = [], flags: Record<string, string | boolean | string[]> = {}): ParsedArgs {
  return { _: positional, flags, raw: [] };
}

describe('commands', () => {
  describe('createCommandRegistry', () => {
    it('should create an empty registry', () => {
      const registry = createCommandRegistry();
      expect(registry.list()).toEqual([]);
    });

    it('should register a command', () => {
      const registry = createCommandRegistry();
      const result = registry.register({
        name: 'test',
        description: 'Test command',
        handler: async () => 0,
      });
      expect(result.ok).toBe(true);
      expect(registry.list()).toHaveLength(1);
    });

    it('should reject command without name', () => {
      const registry = createCommandRegistry();
      const result = registry.register({
        name: '',
        description: 'Test',
        handler: async () => 0,
      });
      expect(result.ok).toBe(false);
    });

    it('should reject command without description', () => {
      const registry = createCommandRegistry();
      const result = registry.register({
        name: 'test',
        description: '',
        handler: async () => 0,
      });
      expect(result.ok).toBe(false);
    });

    it('should reject command without handler', () => {
      const registry = createCommandRegistry();
      const result = registry.register({
        name: 'test',
        description: 'Test',
        handler: null as unknown as (args: ParsedArgs) => Promise<number>,
      });
      expect(result.ok).toBe(false);
    });

    it('should reject duplicate command', () => {
      const registry = createCommandRegistry();
      registry.register({ name: 'test', description: 'Test', handler: async () => 0 });
      const result = registry.register({ name: 'test', description: 'Test2', handler: async () => 0 });
      expect(result.ok).toBe(false);
    });

    it('should get a command by name', () => {
      const registry = createCommandRegistry();
      registry.register({ name: 'test', description: 'Test command', handler: async () => 0 });
      const cmd = registry.get('test');
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe('test');
    });

    it('should return undefined for unknown command', () => {
      const registry = createCommandRegistry();
      expect(registry.get('unknown')).toBeUndefined();
    });

    it('should execute a command', async () => {
      const registry = createCommandRegistry();
      let executed = false;
      registry.register({
        name: 'test',
        description: 'Test',
        handler: async () => { executed = true; return 0; },
      });
      const code = await registry.execute('test', makeArgs());
      expect(code).toBe(0);
      expect(executed).toBe(true);
    });

    it('should return 1 for unknown command execution', async () => {
      const registry = createCommandRegistry();
      const code = await registry.execute('unknown', makeArgs());
      expect(code).toBe(1);
    });

    it('should return 1 when command handler throws', async () => {
      const registry = createCommandRegistry();
      registry.register({
        name: 'fail',
        description: 'Failing command',
        handler: async () => { throw new Error('test error'); },
      });
      const code = await registry.execute('fail', makeArgs());
      expect(code).toBe(1);
    });

    it('should show general help', () => {
      const registry = createCommandRegistry();
      registry.register({ name: 'test', description: 'Test command', handler: async () => 0 });
      const help = registry.showHelp();
      expect(help).toContain('test');
      expect(help).toContain('Test command');
      expect(help).toContain('--help');
    });

    it('should show command-specific help', () => {
      const registry = createCommandRegistry();
      const cmd = {
        name: 'test',
        description: 'Test command',
        usage: 'ows test <args>',
        handler: async () => 0,
        subcommands: [
          { name: 'sub', description: 'Sub command', handler: async () => 0 },
        ],
      };
      registry.register(cmd);
      const help = registry.showHelp(cmd);
      expect(help).toContain('test');
      expect(help).toContain('ows test <args>');
      expect(help).toContain('sub');
    });
  });
});
