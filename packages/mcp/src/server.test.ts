import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMcpServer } from './server.js';
import { createToolRegistry } from './registry.js';
import { createResourceRegistry, registerCalendarResources, registerDriveResources } from './resources.js';
import { createPromptRegistry, registerBuiltinPrompts } from './prompts.js';
import type { ToolRegistry } from './registry.js';
import type { ResourceRegistry } from './resources.js';
import type { PromptRegistry } from './prompts.js';
import type {
  McpServer,
  Transport,
  JsonRpcRequest,
  JsonRpcNotification,
  JsonRpcResponse,
  JsonRpcMessage,
} from './server.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockTransport(): Transport & { messages: JsonRpcResponse[] } {
  const messages: JsonRpcResponse[] = [];
  return {
    messages,
    onMessage: null,
    onClose: null,
    onError: null,
    async start() {},
    async close() {},
    async send(msg: JsonRpcResponse) {
      messages.push(msg);
    },
  };
}

async function sendRequest(
  server: McpServer,
  request: JsonRpcRequest | JsonRpcNotification,
): Promise<JsonRpcResponse | null> {
  return server.handleMessage(request);
}

function initializeRequest(id: string | number = 1): JsonRpcRequest {
  return {
    jsonrpc: '2.0',
    id,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0' },
    },
  };
}

async function initializeServer(server: McpServer): Promise<JsonRpcResponse | null> {
  return sendRequest(server, initializeRequest());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('server', () => {
  describe('createMcpServer', () => {
    let registry: ToolRegistry;

    beforeEach(() => {
      registry = createToolRegistry();
    });

    // -----------------------------------------------------------------------
    // Server creation
    // -----------------------------------------------------------------------

    describe('server creation', () => {
      it('should create a server', () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        expect(server).toBeDefined();
        expect(server.connect).toBeDefined();
        expect(server.close).toBeDefined();
        expect(server.handleMessage).toBeDefined();
        expect(server.isConnected).toBeDefined();
        expect(server.getServerInfo).toBeDefined();
      });

      it('should return server info', () => {
        const server = createMcpServer(registry, { name: 'my-server', version: '2.5.0' });
        const info = server.getServerInfo();
        expect(info).toEqual({ name: 'my-server', version: '2.5.0' });
      });

      it('should return a copy of server info (not a reference)', () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const info1 = server.getServerInfo();
        const info2 = server.getServerInfo();
        expect(info1).toEqual(info2);
        expect(info1).not.toBe(info2);
      });

      it('should not be connected initially', () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        expect(server.isConnected()).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // Connection
    // -----------------------------------------------------------------------

    describe('connection', () => {
      it('should connect to transport', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const transport = createMockTransport();
        await server.connect(transport);
        expect(server.isConnected()).toBe(true);
      });

      it('should be connected after connect', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const transport = createMockTransport();
        await server.connect(transport);
        expect(server.isConnected()).toBe(true);
      });

      it('should not be connected after close', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const transport = createMockTransport();
        await server.connect(transport);
        expect(server.isConnected()).toBe(true);
        await server.close();
        expect(server.isConnected()).toBe(false);
      });

      it('should call transport.start() on connect', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const transport = createMockTransport();
        const startSpy = vi.spyOn(transport, 'start');
        await server.connect(transport);
        expect(startSpy).toHaveBeenCalledOnce();
      });

      it('should call transport.close() on close', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const transport = createMockTransport();
        const closeSpy = vi.spyOn(transport, 'close');
        await server.connect(transport);
        await server.close();
        expect(closeSpy).toHaveBeenCalledOnce();
      });

      it('should handle close when not connected', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        // Should not throw
        await server.close();
        expect(server.isConnected()).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // Initialize
    // -----------------------------------------------------------------------

    describe('initialize', () => {
      it('should respond to initialize with protocol version, capabilities, serverInfo', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const response = await sendRequest(server, initializeRequest());
        expect(response).not.toBeNull();
        expect(response!.jsonrpc).toBe('2.0');
        expect(response!.id).toBe(1);
        expect(response!.result).toBeDefined();
        const result = response!.result as Record<string, unknown>;
        expect(result.protocolVersion).toBe('2024-11-05');
        expect(result.serverInfo).toEqual({ name: 'test', version: '1.0' });
        expect(result.capabilities).toBeDefined();
      });

      it('should respond with the capabilities passed in options', async () => {
        const capabilities = { tools: { listChanged: true } };
        const server = createMcpServer(registry, {
          name: 'test',
          version: '1.0',
          capabilities,
        });
        const response = await initializeServer(server);
        const result = response!.result as Record<string, unknown>;
        expect(result.capabilities).toEqual({ tools: { listChanged: true } });
      });

      it('should respond with empty capabilities when none provided', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const response = await initializeServer(server);
        const result = response!.result as Record<string, unknown>;
        expect(result.capabilities).toEqual({});
      });

      it('should accept initialize params (protocolVersion, capabilities, clientInfo)', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 42,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            clientInfo: { name: 'custom-client', version: '3.0' },
          },
        });
        expect(response).not.toBeNull();
        expect(response!.id).toBe(42);
        expect(response!.result).toBeDefined();
      });

      it('should use the request id in the response', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const response = await sendRequest(server, initializeRequest(99));
        expect(response!.id).toBe(99);
      });

      it('should have correct result structure', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const response = await initializeServer(server);
        expect(response!.error).toBeUndefined();
        expect(response!.result).toBeDefined();
        const result = response!.result as Record<string, unknown>;
        expect(result).toHaveProperty('protocolVersion');
        expect(result).toHaveProperty('capabilities');
        expect(result).toHaveProperty('serverInfo');
      });
    });

    // -----------------------------------------------------------------------
    // Pre-initialization guard
    // -----------------------------------------------------------------------

    describe('pre-initialization guard', () => {
      it('should return error for ping before initialize', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 1,
          method: 'ping',
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32600);
        expect(response!.error!.message).toContain('not initialized');
      });

      it('should return error for tools/list before initialize', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32600);
        expect(response!.error!.message).toContain('not initialized');
      });

      it('should return error for tools/call before initialize', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'some_tool', arguments: {} },
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32600);
      });

      it('should allow initialize before initialization', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const response = await initializeServer(server);
        expect(response).not.toBeNull();
        expect(response!.error).toBeUndefined();
        expect(response!.result).toBeDefined();
      });
    });

    // -----------------------------------------------------------------------
    // Ping
    // -----------------------------------------------------------------------

    describe('ping', () => {
      it('should respond to ping with empty object after initialize', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 2,
          method: 'ping',
        });
        expect(response).not.toBeNull();
        expect(response!.jsonrpc).toBe('2.0');
        expect(response!.id).toBe(2);
        expect(response!.result).toEqual({});
        expect(response!.error).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // Tools/list
    // -----------------------------------------------------------------------

    describe('tools/list', () => {
      it('should return empty tools list if registry is empty', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
        });
        expect(response).not.toBeNull();
        const result = response!.result as { tools: unknown[] };
        expect(result.tools).toEqual([]);
      });

      it('should return tools list with JSON Schema after initialize', async () => {
        registry.register({
          name: 'echo',
          description: 'Echo input',
          parameters: {
            message: { type: 'string', description: 'Message to echo', required: true },
          },
          handler: async (params) => params['message'],
        });

        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
        });
        expect(response).not.toBeNull();
        const result = response!.result as { tools: Array<Record<string, unknown>> };
        expect(result.tools).toHaveLength(1);
        expect(result.tools[0]!.name).toBe('echo');
        expect(result.tools[0]!.description).toBe('Echo input');
      });

      it('should include inputSchema with properties and required', async () => {
        registry.register({
          name: 'test_tool',
          description: 'A test tool',
          parameters: {
            query: { type: 'string', description: 'Search query', required: true },
            limit: { type: 'number', description: 'Max results' },
          },
          handler: async () => ({}),
        });

        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
        });
        const result = response!.result as {
          tools: Array<{
            name: string;
            inputSchema: {
              type: string;
              properties: Record<string, unknown>;
              required?: string[];
            };
          }>;
        };
        const tool = result.tools[0]!;
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties['query']).toEqual({
          type: 'string',
          description: 'Search query',
        });
        expect(tool.inputSchema.properties['limit']).toEqual({
          type: 'number',
          description: 'Max results',
        });
        expect(tool.inputSchema.required).toEqual(['query']);
      });

      it('should list multiple tools', async () => {
        registry.register({
          name: 'tool_a',
          description: 'Tool A',
          parameters: {},
          handler: async () => ({}),
        });
        registry.register({
          name: 'tool_b',
          description: 'Tool B',
          parameters: {},
          handler: async () => ({}),
        });

        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
        });
        const result = response!.result as { tools: Array<Record<string, unknown>> };
        expect(result.tools).toHaveLength(2);
        const names = result.tools.map((t) => t.name);
        expect(names).toContain('tool_a');
        expect(names).toContain('tool_b');
      });
    });

    // -----------------------------------------------------------------------
    // Tools/call
    // -----------------------------------------------------------------------

    describe('tools/call', () => {
      it('should invoke a tool successfully', async () => {
        registry.register({
          name: 'echo',
          description: 'Echo input',
          parameters: {
            message: { type: 'string', description: 'Message', required: true },
          },
          handler: async (params) => params['message'],
        });

        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'echo', arguments: { message: 'hello' } },
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeUndefined();
        const result = response!.result as {
          content: Array<{ type: string; text: string }>;
          isError?: boolean;
        };
        expect(result.content).toHaveLength(1);
        expect(result.content[0]!.type).toBe('text');
        expect(result.content[0]!.text).toBe('"hello"');
        expect(result.isError).toBeUndefined();
      });

      it('should return error content for unknown tool', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'nonexistent', arguments: {} },
        });
        expect(response).not.toBeNull();
        // The server wraps registry errors as success with isError: true
        const result = response!.result as {
          content: Array<{ type: string; text: string }>;
          isError: boolean;
        };
        expect(result.isError).toBe(true);
        expect(result.content[0]!.text).toContain('not found');
      });

      it('should return error for missing tool name', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { arguments: {} },
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32602);
        expect(response!.error!.message).toContain('name');
      });

      it('should return error for missing params', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32602);
        expect(response!.error!.message).toContain('Missing params');
      });

      it('should handle tool execution errors gracefully', async () => {
        registry.register({
          name: 'failing_tool',
          description: 'A tool that fails',
          parameters: {},
          handler: async () => {
            throw new Error('Unexpected failure');
          },
        });

        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'failing_tool', arguments: {} },
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeUndefined();
        const result = response!.result as {
          content: Array<{ type: string; text: string }>;
          isError: boolean;
        };
        expect(result.isError).toBe(true);
        expect(result.content[0]!.text).toContain('Unexpected failure');
      });

      it('should pass arguments to tool handler', async () => {
        const handler = vi.fn().mockResolvedValue({ status: 'ok' });
        registry.register({
          name: 'tool_with_args',
          description: 'Accepts arguments',
          parameters: {
            x: { type: 'number', description: 'X value', required: true },
            y: { type: 'number', description: 'Y value', required: true },
          },
          handler,
        });

        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        await sendRequest(server, {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'tool_with_args', arguments: { x: 10, y: 20 } },
        });
        expect(handler).toHaveBeenCalledWith({ x: 10, y: 20 });
      });

      it('should default arguments to empty object when not provided', async () => {
        registry.register({
          name: 'no_args_tool',
          description: 'No arguments needed',
          parameters: {},
          handler: async () => 'done',
        });

        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'no_args_tool' },
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeUndefined();
        const result = response!.result as {
          content: Array<{ type: string; text: string }>;
        };
        expect(result.content[0]!.text).toBe('"done"');
      });

      it('should return isError:true when tool handler returns error result', async () => {
        registry.register({
          name: 'bad_args_tool',
          description: 'Needs required param',
          parameters: {
            required_field: { type: 'string', description: 'Required', required: true },
          },
          handler: async () => 'ok',
        });

        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'bad_args_tool', arguments: {} },
        });
        expect(response).not.toBeNull();
        // Registry validation fails -> result.ok is false -> isError: true
        const result = response!.result as {
          content: Array<{ type: string; text: string }>;
          isError: boolean;
        };
        expect(result.isError).toBe(true);
      });

      it('should serialize tool result data as JSON string', async () => {
        registry.register({
          name: 'json_tool',
          description: 'Returns object',
          parameters: {},
          handler: async () => ({ key: 'value', num: 42 }),
        });

        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'json_tool', arguments: {} },
        });
        const result = response!.result as {
          content: Array<{ type: string; text: string }>;
        };
        const parsed = JSON.parse(result.content[0]!.text);
        expect(parsed).toEqual({ key: 'value', num: 42 });
      });
    });

    // -----------------------------------------------------------------------
    // Notifications
    // -----------------------------------------------------------------------

    describe('notifications', () => {
      it('should return null for initialized notification', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          method: 'initialized',
        } as JsonRpcNotification);
        expect(response).toBeNull();
      });

      it('should return null for any notification', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          method: 'some/random/notification',
        } as JsonRpcNotification);
        expect(response).toBeNull();
      });

      it('should return null for notification even before initialization', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          method: 'notifications/cancelled',
          params: { requestId: 1 },
        } as JsonRpcNotification);
        expect(response).toBeNull();
      });
    });

    // -----------------------------------------------------------------------
    // Unknown methods
    // -----------------------------------------------------------------------

    describe('unknown methods', () => {
      it('should return MethodNotFound for unknown method after initialize', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 10,
          method: 'unknown/method',
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32601);
        expect(response!.error!.message).toContain('Unknown method');
        expect(response!.error!.message).toContain('unknown/method');
      });

      it('should include the method name in the error message', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 10,
          method: 'resources/list',
        });
        expect(response!.error!.message).toContain('resources/list');
      });
    });

    // -----------------------------------------------------------------------
    // JSON-RPC response messages (no method)
    // -----------------------------------------------------------------------

    describe('JSON-RPC response messages', () => {
      it('should return null for response messages (no method)', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        // A response message has id but no method
        const responseMsg: JsonRpcMessage = {
          jsonrpc: '2.0',
          id: 1,
          result: {},
        } as JsonRpcResponse;
        const result = await server.handleMessage(responseMsg);
        expect(result).toBeNull();
      });
    });

    // -----------------------------------------------------------------------
    // Transport integration (connected server processing via onMessage)
    // -----------------------------------------------------------------------

    describe('transport integration', () => {
      it('should send responses through transport when connected', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const transport = createMockTransport();
        await server.connect(transport);

        // Simulate an incoming message via onMessage callback
        transport.onMessage!(initializeRequest(1));

        // Give the async handler time to process
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(transport.messages).toHaveLength(1);
        expect(transport.messages[0]!.id).toBe(1);
        const result = transport.messages[0]!.result as Record<string, unknown>;
        expect(result.protocolVersion).toBe('2024-11-05');
      });

      it('should not send response for notifications via transport', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const transport = createMockTransport();
        await server.connect(transport);

        // Initialize first
        transport.onMessage!(initializeRequest(1));
        await new Promise((resolve) => setTimeout(resolve, 10));

        const msgCountAfterInit = transport.messages.length;

        // Send a notification (no id)
        transport.onMessage!({
          jsonrpc: '2.0',
          method: 'initialized',
        } as JsonRpcNotification);
        await new Promise((resolve) => setTimeout(resolve, 10));

        // No new message should be sent
        expect(transport.messages).toHaveLength(msgCountAfterInit);
      });

      it('should disconnect when transport calls onClose', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const transport = createMockTransport();
        await server.connect(transport);
        expect(server.isConnected()).toBe(true);

        // Simulate transport close
        transport.onClose!();
        expect(server.isConnected()).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // Error codes
    // -----------------------------------------------------------------------

    describe('error codes', () => {
      it('should use INVALID_REQUEST (-32600) for pre-init requests', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
        });
        expect(response!.error!.code).toBe(-32600);
      });

      it('should use METHOD_NOT_FOUND (-32601) for unknown methods', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 2,
          method: 'bogus/method',
        });
        expect(response!.error!.code).toBe(-32601);
      });

      it('should use INVALID_PARAMS (-32602) for tools/call without params', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
        });
        expect(response!.error!.code).toBe(-32602);
      });

      it('should use INVALID_PARAMS (-32602) for tools/call with invalid name type', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(server);
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 123, arguments: {} },
        });
        expect(response!.error!.code).toBe(-32602);
        expect(response!.error!.message).toContain('name');
      });

      it('should preserve request id in error responses', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 'string-id-123',
          method: 'ping',
        });
        expect(response!.id).toBe('string-id-123');
        expect(response!.error).toBeDefined();
      });

      it('should support string request ids', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 'abc-def',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0' },
          },
        });
        expect(response!.id).toBe('abc-def');
        expect(response!.result).toBeDefined();
      });
    });

    // -----------------------------------------------------------------------
    // Resources support
    // -----------------------------------------------------------------------

    describe('resources', () => {
      let resourceRegistry: ResourceRegistry;
      let server: McpServer;

      beforeEach(async () => {
        resourceRegistry = createResourceRegistry();
        resourceRegistry.registerResource(
          {
            uri: 'test://static',
            name: 'Static Test',
            description: 'A static test resource',
            mimeType: 'application/json',
          },
          async (uri) => ({ uri, mimeType: 'application/json', text: '{"ok":true}' }),
        );
        resourceRegistry.registerTemplate(
          {
            uriTemplate: 'test://{id}/details',
            name: 'Test Details',
            description: 'Details by ID',
            mimeType: 'application/json',
          },
          async (uri, params) => ({
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ id: params['id'] }),
          }),
        );

        server = createMcpServer(registry, {
          name: 'test',
          version: '1.0',
          resourceRegistry,
        });
        await initializeServer(server);
      });

      it('should auto-detect resources capability when resourceRegistry is provided', async () => {
        const srv = createMcpServer(registry, {
          name: 'test',
          version: '1.0',
          resourceRegistry,
        });
        const response = await initializeServer(srv);
        const result = response!.result as Record<string, unknown>;
        expect(result.capabilities).toHaveProperty('resources');
      });

      it('should not override explicit resources capability', async () => {
        const srv = createMcpServer(registry, {
          name: 'test',
          version: '1.0',
          resourceRegistry,
          capabilities: { resources: { subscribe: true, listChanged: true } },
        });
        const response = await initializeServer(srv);
        const result = response!.result as Record<string, unknown>;
        expect((result.capabilities as any).resources).toEqual({ subscribe: true, listChanged: true });
      });

      it('resources/list should return static resources and templates', async () => {
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 10,
          method: 'resources/list',
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeUndefined();
        const result = response!.result as {
          resources: Array<Record<string, unknown>>;
          resourceTemplates: Array<Record<string, unknown>>;
        };
        expect(result.resources).toHaveLength(1);
        expect(result.resources[0]!.uri).toBe('test://static');
        expect(result.resourceTemplates).toHaveLength(1);
        expect(result.resourceTemplates[0]!.uriTemplate).toBe('test://{id}/details');
      });

      it('resources/templates/list should return templates', async () => {
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 11,
          method: 'resources/templates/list',
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeUndefined();
        const result = response!.result as {
          resourceTemplates: Array<Record<string, unknown>>;
        };
        expect(result.resourceTemplates).toHaveLength(1);
      });

      it('resources/read should return static resource content', async () => {
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 12,
          method: 'resources/read',
          params: { uri: 'test://static' },
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeUndefined();
        const result = response!.result as { contents: Array<Record<string, unknown>> };
        expect(result.contents).toHaveLength(1);
        expect(result.contents[0]!.text).toBe('{"ok":true}');
      });

      it('resources/read should return template resource content', async () => {
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 13,
          method: 'resources/read',
          params: { uri: 'test://42/details' },
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeUndefined();
        const result = response!.result as { contents: Array<{ text: string }> };
        const parsed = JSON.parse(result.contents[0]!.text);
        expect(parsed.id).toBe('42');
      });

      it('resources/read should return error for unknown URI', async () => {
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 14,
          method: 'resources/read',
          params: { uri: 'test://nonexistent' },
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32602);
        expect(response!.error!.message).toContain('Resource not found');
      });

      it('resources/read should return error when missing params', async () => {
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 15,
          method: 'resources/read',
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32602);
        expect(response!.error!.message).toContain('Missing params');
      });

      it('resources/read should return error when uri is not a string', async () => {
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 16,
          method: 'resources/read',
          params: { uri: 123 },
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32602);
        expect(response!.error!.message).toContain('uri');
      });
    });

    describe('resources without registry', () => {
      it('resources/list should return error when no registry', async () => {
        const srv = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(srv);
        const response = await sendRequest(srv, {
          jsonrpc: '2.0',
          id: 20,
          method: 'resources/list',
        });
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32601);
      });

      it('resources/templates/list should return error when no registry', async () => {
        const srv = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(srv);
        const response = await sendRequest(srv, {
          jsonrpc: '2.0',
          id: 21,
          method: 'resources/templates/list',
        });
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32601);
      });

      it('resources/read should return error when no registry', async () => {
        const srv = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(srv);
        const response = await sendRequest(srv, {
          jsonrpc: '2.0',
          id: 22,
          method: 'resources/read',
          params: { uri: 'test://something' },
        });
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32601);
      });
    });

    // -----------------------------------------------------------------------
    // Prompts support
    // -----------------------------------------------------------------------

    describe('prompts', () => {
      let promptRegistry: PromptRegistry;
      let server: McpServer;

      beforeEach(async () => {
        promptRegistry = createPromptRegistry();
        promptRegistry.register(
          {
            name: 'greet',
            description: 'Greet someone',
            arguments: [{ name: 'name', description: 'Name to greet', required: true }],
          },
          (args) => [
            { role: 'user', content: { type: 'text', text: `Hello, ${args['name']}!` } },
          ],
        );

        server = createMcpServer(registry, {
          name: 'test',
          version: '1.0',
          promptRegistry,
        });
        await initializeServer(server);
      });

      it('should auto-detect prompts capability when promptRegistry is provided', async () => {
        const srv = createMcpServer(registry, {
          name: 'test',
          version: '1.0',
          promptRegistry,
        });
        const response = await initializeServer(srv);
        const result = response!.result as Record<string, unknown>;
        expect(result.capabilities).toHaveProperty('prompts');
      });

      it('prompts/list should return registered prompts', async () => {
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 30,
          method: 'prompts/list',
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeUndefined();
        const result = response!.result as { prompts: Array<Record<string, unknown>> };
        expect(result.prompts).toHaveLength(1);
        expect(result.prompts[0]!.name).toBe('greet');
      });

      it('prompts/get should return messages for a prompt', async () => {
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 31,
          method: 'prompts/get',
          params: { name: 'greet', arguments: { name: 'Alice' } },
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeUndefined();
        const result = response!.result as { messages: Array<{ role: string; content: { text: string } }> };
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0]!.content.text).toBe('Hello, Alice!');
      });

      it('prompts/get should return error for unknown prompt', async () => {
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 32,
          method: 'prompts/get',
          params: { name: 'nonexistent' },
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32602);
        expect(response!.error!.message).toContain('Prompt not found');
      });

      it('prompts/get should return error when missing params', async () => {
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 33,
          method: 'prompts/get',
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32602);
        expect(response!.error!.message).toContain('Missing params');
      });

      it('prompts/get should return error when name is not a string', async () => {
        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 34,
          method: 'prompts/get',
          params: { name: 123 },
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32602);
        expect(response!.error!.message).toContain('name');
      });

      it('prompts/get should default arguments to empty object', async () => {
        // Register a prompt that uses no arguments
        promptRegistry.register(
          { name: 'simple', description: 'Simple prompt' },
          () => [{ role: 'user', content: { type: 'text', text: 'Simple!' } }],
        );

        const response = await sendRequest(server, {
          jsonrpc: '2.0',
          id: 35,
          method: 'prompts/get',
          params: { name: 'simple' },
        });
        expect(response).not.toBeNull();
        expect(response!.error).toBeUndefined();
        const result = response!.result as { messages: Array<{ content: { text: string } }> };
        expect(result.messages[0]!.content.text).toBe('Simple!');
      });
    });

    describe('prompts without registry', () => {
      it('prompts/list should return error when no registry', async () => {
        const srv = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(srv);
        const response = await sendRequest(srv, {
          jsonrpc: '2.0',
          id: 40,
          method: 'prompts/list',
        });
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32601);
      });

      it('prompts/get should return error when no registry', async () => {
        const srv = createMcpServer(registry, { name: 'test', version: '1.0' });
        await initializeServer(srv);
        const response = await sendRequest(srv, {
          jsonrpc: '2.0',
          id: 41,
          method: 'prompts/get',
          params: { name: 'greet' },
        });
        expect(response!.error).toBeDefined();
        expect(response!.error!.code).toBe(-32601);
      });
    });

    // -----------------------------------------------------------------------
    // Transport error & message handling edge cases
    // -----------------------------------------------------------------------

    describe('transport error handling', () => {
      it('should handle transport onError callback', async () => {
        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const transport = createMockTransport();
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
        await server.connect(transport);

        // Trigger onError
        transport.onError!(new Error('transport broke'));

        expect(stderrSpy).toHaveBeenCalledWith(
          expect.stringContaining('transport broke'),
        );
        stderrSpy.mockRestore();
      });

      it('should handle errors thrown by handleMessage during transport processing', async () => {
        // Register a tool that throws synchronously during handler resolution
        registry.register({
          name: 'crash_tool',
          description: 'Crashes',
          parameters: {},
          handler: async () => { throw new Error('crash'); },
        });

        const server = createMcpServer(registry, { name: 'test', version: '1.0' });
        const transport = createMockTransport();
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
        await server.connect(transport);

        // Initialize first
        transport.onMessage!(initializeRequest(1));
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Call the crashing tool via transport
        transport.onMessage!({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: { name: 'crash_tool', arguments: {} },
        } as JsonRpcRequest);
        await new Promise((resolve) => setTimeout(resolve, 10));

        // The tool error should be handled gracefully (returned as isError result, not crashing server)
        expect(transport.messages.length).toBeGreaterThanOrEqual(2);
        stderrSpy.mockRestore();
      });
    });
  });
});
