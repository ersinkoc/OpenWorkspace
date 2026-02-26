import { describe, it, expect } from 'vitest';
import {
  createPromptRegistry,
  registerBuiltinPrompts,
} from './prompts.js';
import { createMcpServer } from './server.js';
import { createToolRegistry } from './registry.js';
import { createResourceRegistry, registerCalendarResources } from './resources.js';
import type { JsonRpcMessage, JsonRpcResponse } from './server.js';

describe('createPromptRegistry', () => {
  it('creates an empty registry', () => {
    const registry = createPromptRegistry();
    expect(registry.list()).toEqual([]);
  });

  it('returns null for unknown prompt via get', () => {
    const registry = createPromptRegistry();
    expect(registry.get('nonexistent')).toBeNull();
  });

  it('returns null for unknown prompt via getWithArgs', () => {
    const registry = createPromptRegistry();
    expect(registry.getWithArgs('nonexistent', {})).toBeNull();
  });
});

describe('register and list', () => {
  it('registers and lists a prompt', () => {
    const registry = createPromptRegistry();
    registry.register(
      {
        name: 'test-prompt',
        description: 'A test prompt',
        arguments: [{ name: 'name', description: 'Name', required: true }],
      },
      (args) => [{ role: 'user', content: { type: 'text', text: `Hello ${args['name']}` } }],
    );

    const prompts = registry.list();
    expect(prompts).toHaveLength(1);
    expect(prompts[0]?.name).toBe('test-prompt');
    expect(prompts[0]?.description).toBe('A test prompt');
    expect(prompts[0]?.arguments).toHaveLength(1);
  });
});

describe('getWithArgs', () => {
  it('returns messages with arguments', () => {
    const registry = createPromptRegistry();
    registry.register(
      { name: 'greet', description: 'Greet', arguments: [{ name: 'name', description: 'Name' }] },
      (args) => [{ role: 'user', content: { type: 'text', text: `Hi ${args['name']}!` } }],
    );

    const messages = registry.getWithArgs('greet', { name: 'Alice' });
    expect(messages).not.toBeNull();
    expect(messages).toHaveLength(1);
    expect(messages![0]?.role).toBe('user');
    expect(messages![0]?.content.text).toBe('Hi Alice!');
  });
});

describe('get (no args)', () => {
  it('invokes handler with empty args', () => {
    const registry = createPromptRegistry();
    registry.register(
      { name: 'simple', description: 'Simple' },
      () => [{ role: 'user', content: { type: 'text', text: 'No args needed' } }],
    );

    const messages = registry.get('simple');
    expect(messages).not.toBeNull();
    expect(messages![0]?.content.text).toBe('No args needed');
  });
});

describe('registerBuiltinPrompts', () => {
  it('registers 3 built-in prompts', () => {
    const registry = createPromptRegistry();
    registerBuiltinPrompts(registry);

    const prompts = registry.list();
    expect(prompts).toHaveLength(3);

    const names = prompts.map(p => p.name).sort();
    expect(names).toEqual(['email-compose', 'file-summary', 'meeting-schedule']);
  });

  describe('email-compose', () => {
    it('returns messages with required args', () => {
      const registry = createPromptRegistry();
      registerBuiltinPrompts(registry);

      const messages = registry.getWithArgs('email-compose', {
        to: 'bob@example.com',
        subject: 'Hello',
      });
      expect(messages).not.toBeNull();
      expect(messages!.length).toBeGreaterThanOrEqual(1);
      expect(messages![0]?.role).toBe('user');
      expect(messages![0]?.content.text).toContain('bob@example.com');
      expect(messages![0]?.content.text).toContain('Hello');
    });

    it('includes tone when provided', () => {
      const registry = createPromptRegistry();
      registerBuiltinPrompts(registry);

      const messages = registry.getWithArgs('email-compose', {
        to: 'a@b.com',
        subject: 'Test',
        tone: 'formal',
      });
      expect(messages![0]?.content.text).toContain('formal');
    });

    it('includes context when provided', () => {
      const registry = createPromptRegistry();
      registerBuiltinPrompts(registry);

      const messages = registry.getWithArgs('email-compose', {
        to: 'a@b.com',
        subject: 'Test',
        context: 'Follow up on our meeting',
      });
      expect(messages![0]?.content.text).toContain('Follow up on our meeting');
    });
  });

  describe('meeting-schedule', () => {
    it('returns messages', () => {
      const registry = createPromptRegistry();
      registerBuiltinPrompts(registry);

      const messages = registry.getWithArgs('meeting-schedule', {
        attendees: 'alice@test.com, bob@test.com',
        topic: 'Sprint planning',
      });
      expect(messages).not.toBeNull();
      expect(messages!.length).toBe(2);
      expect(messages![0]?.role).toBe('user');
      expect(messages![1]?.role).toBe('assistant');
      expect(messages![0]?.content.text).toContain('Sprint planning');
      expect(messages![0]?.content.text).toContain('alice@test.com');
    });

    it('includes preferences when provided', () => {
      const registry = createPromptRegistry();
      registerBuiltinPrompts(registry);

      const messages = registry.getWithArgs('meeting-schedule', {
        attendees: 'a@b.com',
        topic: 'Test',
        preferences: 'Morning preferred',
      });
      expect(messages![0]?.content.text).toContain('Morning preferred');
    });
  });

  describe('file-summary', () => {
    it('returns messages', () => {
      const registry = createPromptRegistry();
      registerBuiltinPrompts(registry);

      const messages = registry.getWithArgs('file-summary', {
        fileId: 'doc123',
      });
      expect(messages).not.toBeNull();
      expect(messages!.length).toBe(1);
      expect(messages![0]?.content.text).toContain('doc123');
    });

    it('handles detailed format', () => {
      const registry = createPromptRegistry();
      registerBuiltinPrompts(registry);

      const messages = registry.getWithArgs('file-summary', {
        fileId: 'doc123',
        format: 'detailed',
      });
      expect(messages![0]?.content.text).toContain('detailed');
    });

    it('handles bullet-points format', () => {
      const registry = createPromptRegistry();
      registerBuiltinPrompts(registry);

      const messages = registry.getWithArgs('file-summary', {
        fileId: 'doc123',
        format: 'bullet-points',
      });
      expect(messages![0]?.content.text).toContain('bullet');
    });
  });
});

// ── Server Integration Tests ──────────────────────────

describe('MCP server with resources and prompts', () => {
  function createTestServer() {
    const toolRegistry = createToolRegistry();
    const resourceRegistry = createResourceRegistry();
    registerCalendarResources(resourceRegistry);
    const promptRegistry = createPromptRegistry();
    registerBuiltinPrompts(promptRegistry);

    return createMcpServer(toolRegistry, {
      name: 'test-server',
      version: '0.1.0',
      resourceRegistry,
      promptRegistry,
    });
  }

  async function initServer(server: ReturnType<typeof createTestServer>) {
    await server.handleMessage({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test' } },
    } as JsonRpcMessage);
  }

  it('returns resources and prompts capabilities on initialize', async () => {
    const server = createTestServer();
    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test' } },
    } as JsonRpcMessage);

    expect(response).not.toBeNull();
    const result = (response as JsonRpcResponse).result as Record<string, unknown>;
    const caps = result['capabilities'] as Record<string, unknown>;
    expect(caps).toHaveProperty('resources');
    expect(caps).toHaveProperty('prompts');
  });

  it('handles resources/list', async () => {
    const server = createTestServer();
    await initServer(server);

    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'resources/list',
    } as JsonRpcMessage);

    expect(response).not.toBeNull();
    const result = (response as JsonRpcResponse).result as Record<string, unknown>;
    expect(result['resources']).toBeDefined();
    expect(Array.isArray(result['resources'])).toBe(true);
    expect((result['resources'] as unknown[]).length).toBeGreaterThan(0);
  });

  it('handles resources/read', async () => {
    const server = createTestServer();
    await initServer(server);

    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'resources/read',
      params: { uri: 'calendar://primary/events' },
    } as JsonRpcMessage);

    expect(response).not.toBeNull();
    expect((response as JsonRpcResponse).error).toBeUndefined();
    const result = (response as JsonRpcResponse).result as Record<string, unknown>;
    expect(result['contents']).toBeDefined();
    const contents = result['contents'] as Array<Record<string, unknown>>;
    expect(contents).toHaveLength(1);
    expect(contents[0]?.['mimeType']).toBe('application/json');
  });

  it('handles resources/read with unknown URI', async () => {
    const server = createTestServer();
    await initServer(server);

    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 4,
      method: 'resources/read',
      params: { uri: 'nonexistent://foo' },
    } as JsonRpcMessage);

    expect(response).not.toBeNull();
    expect((response as JsonRpcResponse).error).toBeDefined();
  });

  it('handles resources/templates/list', async () => {
    const server = createTestServer();
    await initServer(server);

    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 5,
      method: 'resources/templates/list',
    } as JsonRpcMessage);

    expect(response).not.toBeNull();
    const result = (response as JsonRpcResponse).result as Record<string, unknown>;
    expect(result['resourceTemplates']).toBeDefined();
    expect(Array.isArray(result['resourceTemplates'])).toBe(true);
  });

  it('handles prompts/list', async () => {
    const server = createTestServer();
    await initServer(server);

    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 6,
      method: 'prompts/list',
    } as JsonRpcMessage);

    expect(response).not.toBeNull();
    const result = (response as JsonRpcResponse).result as Record<string, unknown>;
    const prompts = result['prompts'] as unknown[];
    expect(prompts).toBeDefined();
    expect(prompts.length).toBe(3);
  });

  it('handles prompts/get', async () => {
    const server = createTestServer();
    await initServer(server);

    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 7,
      method: 'prompts/get',
      params: { name: 'email-compose', arguments: { to: 'a@b.com', subject: 'Hi' } },
    } as JsonRpcMessage);

    expect(response).not.toBeNull();
    expect((response as JsonRpcResponse).error).toBeUndefined();
    const result = (response as JsonRpcResponse).result as Record<string, unknown>;
    const messages = result['messages'] as Array<Record<string, unknown>>;
    expect(messages).toBeDefined();
    expect(messages.length).toBeGreaterThan(0);
  });

  it('handles prompts/get with unknown prompt', async () => {
    const server = createTestServer();
    await initServer(server);

    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 8,
      method: 'prompts/get',
      params: { name: 'nonexistent' },
    } as JsonRpcMessage);

    expect(response).not.toBeNull();
    expect((response as JsonRpcResponse).error).toBeDefined();
  });

  it('returns method not found when no resource registry configured', async () => {
    const server = createMcpServer(createToolRegistry(), { name: 'test', version: '0.1.0' });
    await server.handleMessage({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {},
    } as JsonRpcMessage);

    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'resources/list',
    } as JsonRpcMessage);

    expect((response as JsonRpcResponse).error).toBeDefined();
    expect((response as JsonRpcResponse).error!.message).toContain('no resource registry');
  });

  it('returns method not found when no prompt registry configured', async () => {
    const server = createMcpServer(createToolRegistry(), { name: 'test', version: '0.1.0' });
    await server.handleMessage({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {},
    } as JsonRpcMessage);

    const response = await server.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'prompts/list',
    } as JsonRpcMessage);

    expect((response as JsonRpcResponse).error).toBeDefined();
    expect((response as JsonRpcResponse).error!.message).toContain('no prompt registry');
  });
});
