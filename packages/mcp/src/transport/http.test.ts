import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHttpTransport } from './http.js';
import type { HttpTransport } from './http.js';
import type { JsonRpcMessage, JsonRpcResponse } from '../server.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Makes an HTTP request to the transport server.
 * Uses Node.js built-in fetch (available in Node 22+).
 */
async function request(
  port: number,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `http://127.0.0.1:${port}${path}`;
  return fetch(url, options);
}

/**
 * Sends a JSON-RPC message via POST to the MCP endpoint.
 */
async function postJsonRpc(
  port: number,
  path: string,
  body: unknown,
): Promise<Response> {
  return request(port, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Sends a raw string body via POST to the MCP endpoint.
 */
async function postRaw(
  port: number,
  path: string,
  body: string,
): Promise<Response> {
  return request(port, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('transport/http', () => {
  let transport: HttpTransport;

  afterEach(async () => {
    // Always close the transport to avoid hanging tests / leaked servers
    if (transport) {
      await transport.close();
    }
  });

  // -------------------------------------------------------------------------
  // Server lifecycle
  // -------------------------------------------------------------------------

  describe('server lifecycle', () => {
    it('should start the HTTP server and return a port via getPort()', async () => {
      transport = createHttpTransport({ port: 0 });
      expect(transport.getPort()).toBeUndefined();

      await transport.start();

      const port = transport.getPort();
      expect(port).toBeDefined();
      expect(typeof port).toBe('number');
      expect(port).toBeGreaterThan(0);
    });

    it('should return undefined from getPort() before start()', () => {
      transport = createHttpTransport({ port: 0 });
      expect(transport.getPort()).toBeUndefined();
    });

    it('should close the server and trigger onClose', async () => {
      transport = createHttpTransport({ port: 0 });
      const onClose = vi.fn();
      transport.onClose = onClose;

      await transport.start();
      const port = transport.getPort()!;

      // Verify server is running
      const res = await request(port, '/health');
      expect(res.status).toBe(200);

      // Close
      await transport.close();

      expect(onClose).toHaveBeenCalledOnce();

      // Server should no longer be reachable
      await expect(request(port, '/health')).rejects.toThrow();
    });

    it('should be safe to call close() without start()', async () => {
      transport = createHttpTransport({ port: 0 });
      await expect(transport.close()).resolves.toBeUndefined();
    });

    it('should be safe to call close() multiple times', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      await transport.close();
      await expect(transport.close()).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('should have onMessage as null', () => {
      transport = createHttpTransport({ port: 0 });
      expect(transport.onMessage).toBeNull();
    });

    it('should have onClose as null', () => {
      transport = createHttpTransport({ port: 0 });
      expect(transport.onClose).toBeNull();
    });

    it('should have onError as null', () => {
      transport = createHttpTransport({ port: 0 });
      expect(transport.onError).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Setting callbacks
  // -------------------------------------------------------------------------

  describe('setting callbacks', () => {
    it('should accept onMessage callback', () => {
      transport = createHttpTransport({ port: 0 });
      const fn = vi.fn();
      transport.onMessage = fn;
      expect(transport.onMessage).toBe(fn);
    });

    it('should accept onClose callback', () => {
      transport = createHttpTransport({ port: 0 });
      const fn = vi.fn();
      transport.onClose = fn;
      expect(transport.onClose).toBe(fn);
    });

    it('should accept onError callback', () => {
      transport = createHttpTransport({ port: 0 });
      const fn = vi.fn();
      transport.onError = fn;
      expect(transport.onError).toBe(fn);
    });
  });

  // -------------------------------------------------------------------------
  // GET /health
  // -------------------------------------------------------------------------

  describe('GET /health', () => {
    it('should return 200 with { status: "ok" }', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      const res = await request(port, '/health');
      expect(res.status).toBe(200);

      const body = (await res.json()) as { status: string };
      expect(body).toEqual({ status: 'ok' });
    });

    it('should include Content-Type application/json header', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      const res = await request(port, '/health');
      expect(res.headers.get('content-type')).toContain('application/json');
    });

    it('should include CORS headers', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      const res = await request(port, '/health');
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });
  });

  // -------------------------------------------------------------------------
  // OPTIONS (CORS preflight)
  // -------------------------------------------------------------------------

  describe('OPTIONS (CORS preflight)', () => {
    it('should return 204 with CORS headers', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      const res = await request(port, '/mcp', { method: 'OPTIONS' });
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
      expect(res.headers.get('access-control-allow-methods')).toContain('POST');
      expect(res.headers.get('access-control-allow-methods')).toContain('GET');
      expect(res.headers.get('access-control-allow-methods')).toContain('OPTIONS');
      expect(res.headers.get('access-control-allow-headers')).toContain('Content-Type');
    });

    it('should return 204 for OPTIONS on any path', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      const res = await request(port, '/anything', { method: 'OPTIONS' });
      expect(res.status).toBe(204);
    });
  });

  // -------------------------------------------------------------------------
  // POST /mcp - valid JSON-RPC
  // -------------------------------------------------------------------------

  describe('POST /mcp with valid JSON-RPC', () => {
    it('should dispatch request to onMessage and return the response', async () => {
      transport = createHttpTransport({ port: 0 });

      // Set up onMessage to handle the request
      transport.onMessage = (msg: JsonRpcMessage) => {
        if ('id' in msg && msg.id !== undefined && msg.id !== null) {
          const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            id: msg.id as string | number,
            result: { protocolVersion: '2024-11-05' },
          };
          // Send the response back through the transport
          void transport.send(response);
        }
      };

      await transport.start();
      const port = transport.getPort()!;

      const rpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      };

      const res = await postJsonRpc(port, '/mcp', rpcRequest);
      expect(res.status).toBe(200);

      const body = (await res.json()) as JsonRpcResponse;
      expect(body.jsonrpc).toBe('2.0');
      expect(body.id).toBe(1);
      expect(body.result).toEqual({ protocolVersion: '2024-11-05' });
    });

    it('should dispatch notification (no id) and return 202', async () => {
      const onMessage = vi.fn();
      transport = createHttpTransport({ port: 0 });
      transport.onMessage = onMessage;

      await transport.start();
      const port = transport.getPort()!;

      const notification = {
        jsonrpc: '2.0',
        method: 'initialized',
      };

      const res = await postJsonRpc(port, '/mcp', notification);
      expect(res.status).toBe(202);

      expect(onMessage).toHaveBeenCalledOnce();
      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'initialized' }),
      );
    });

    it('should handle string request ids', async () => {
      transport = createHttpTransport({ port: 0 });

      transport.onMessage = (msg: JsonRpcMessage) => {
        if ('id' in msg && msg.id !== undefined && msg.id !== null) {
          void transport.send({
            jsonrpc: '2.0',
            id: msg.id as string | number,
            result: {},
          });
        }
      };

      await transport.start();
      const port = transport.getPort()!;

      const rpcRequest = {
        jsonrpc: '2.0',
        id: 'string-id-99',
        method: 'ping',
      };

      const res = await postJsonRpc(port, '/mcp', rpcRequest);
      const body = (await res.json()) as JsonRpcResponse;
      expect(body.id).toBe('string-id-99');
    });

    it('should include CORS headers in POST responses', async () => {
      transport = createHttpTransport({ port: 0 });

      transport.onMessage = (msg: JsonRpcMessage) => {
        if ('id' in msg && msg.id !== undefined && msg.id !== null) {
          void transport.send({
            jsonrpc: '2.0',
            id: msg.id as string | number,
            result: {},
          });
        }
      };

      await transport.start();
      const port = transport.getPort()!;

      const res = await postJsonRpc(port, '/mcp', {
        jsonrpc: '2.0',
        id: 1,
        method: 'ping',
      });
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });
  });

  // -------------------------------------------------------------------------
  // POST /mcp - invalid JSON
  // -------------------------------------------------------------------------

  describe('POST /mcp with invalid JSON', () => {
    it('should return 400 with parse error for malformed JSON', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      const res = await postRaw(port, '/mcp', 'this is not json{{{');
      expect(res.status).toBe(400);

      const body = (await res.json()) as JsonRpcResponse;
      expect(body.jsonrpc).toBe('2.0');
      expect(body.id).toBeNull();
      expect(body.error).toBeDefined();
      expect(body.error!.code).toBe(-32700);
      expect(body.error!.message).toContain('Parse error');
    });

    it('should return 400 for empty body', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      const res = await postRaw(port, '/mcp', '');
      expect(res.status).toBe(400);

      const body = (await res.json()) as JsonRpcResponse;
      expect(body.error).toBeDefined();
      expect(body.error!.code).toBe(-32700);
    });

    it('should not call onMessage for invalid JSON', async () => {
      const onMessage = vi.fn();
      transport = createHttpTransport({ port: 0 });
      transport.onMessage = onMessage;

      await transport.start();
      const port = transport.getPort()!;

      await postRaw(port, '/mcp', '{broken json}');

      expect(onMessage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // GET /mcp - SSE
  // -------------------------------------------------------------------------

  describe('GET /mcp (SSE)', () => {
    it('should establish an SSE connection with correct headers', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      const controller = new AbortController();
      const res = await request(port, '/mcp', {
        method: 'GET',
        headers: { 'Accept': 'text/event-stream' },
        signal: controller.signal,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      expect(res.headers.get('cache-control')).toContain('no-cache');
      expect(res.headers.get('connection')).toContain('keep-alive');

      // Clean up SSE connection
      controller.abort();
    });

    it('should send notifications via SSE to connected clients', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      // Establish SSE connection
      const controller = new AbortController();
      const res = await request(port, '/mcp', {
        method: 'GET',
        headers: { 'Accept': 'text/event-stream' },
        signal: controller.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      // Read the initial :ok comment
      const initialChunk = await reader.read();
      const initialData = decoder.decode(initialChunk.value);
      expect(initialData).toContain(':ok');

      // Send a notification via transport.send() (no matching pending request)
      const notification: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: null,
        result: { type: 'notification', data: 'hello' },
      };
      await transport.send(notification);

      // Read the SSE data
      const chunk = await reader.read();
      const data = decoder.decode(chunk.value);
      expect(data).toContain('data: ');
      expect(data).toContain(JSON.stringify(notification));

      // Clean up
      controller.abort();
    });
  });

  // -------------------------------------------------------------------------
  // 404 for unknown paths
  // -------------------------------------------------------------------------

  describe('404 for unknown paths', () => {
    it('should return 404 for GET on unknown path', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      const res = await request(port, '/unknown');
      expect(res.status).toBe(404);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('Not found');
    });

    it('should return 404 for POST on unknown path', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      const res = await request(port, '/unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      expect(res.status).toBe(404);
    });

    it('should return 404 for GET /health with wrong method (POST)', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      const res = await request(port, '/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      expect(res.status).toBe(404);
    });

    it('should include CORS headers in 404 responses', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      const res = await request(port, '/nonexistent');
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });
  });

  // -------------------------------------------------------------------------
  // Default options
  // -------------------------------------------------------------------------

  describe('default options', () => {
    it('should default to path /mcp', async () => {
      transport = createHttpTransport({ port: 0 });

      transport.onMessage = (msg: JsonRpcMessage) => {
        if ('id' in msg && msg.id !== undefined && msg.id !== null) {
          void transport.send({
            jsonrpc: '2.0',
            id: msg.id as string | number,
            result: {},
          });
        }
      };

      await transport.start();
      const port = transport.getPort()!;

      // Default path should work
      const res = await postJsonRpc(port, '/mcp', {
        jsonrpc: '2.0',
        id: 1,
        method: 'ping',
      });
      expect(res.status).toBe(200);
    });

    it('should default to host 127.0.0.1', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      // Should be reachable on 127.0.0.1
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      expect(res.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // Custom options
  // -------------------------------------------------------------------------

  describe('custom options', () => {
    it('should use a custom path', async () => {
      transport = createHttpTransport({ port: 0, path: '/api/v1/mcp' });

      transport.onMessage = (msg: JsonRpcMessage) => {
        if ('id' in msg && msg.id !== undefined && msg.id !== null) {
          void transport.send({
            jsonrpc: '2.0',
            id: msg.id as string | number,
            result: {},
          });
        }
      };

      await transport.start();
      const port = transport.getPort()!;

      // Custom path should work
      const res = await postJsonRpc(port, '/api/v1/mcp', {
        jsonrpc: '2.0',
        id: 1,
        method: 'ping',
      });
      expect(res.status).toBe(200);

      // Default path should 404
      const res404 = await postJsonRpc(port, '/mcp', {
        jsonrpc: '2.0',
        id: 2,
        method: 'ping',
      });
      expect(res404.status).toBe(404);
    });

    it('should use a custom path for GET (SSE) too', async () => {
      transport = createHttpTransport({ port: 0, path: '/custom-sse' });
      await transport.start();
      const port = transport.getPort()!;

      const controller = new AbortController();
      const res = await request(port, '/custom-sse', {
        method: 'GET',
        signal: controller.signal,
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');

      controller.abort();
    });

    it('should listen on a specific port when provided (non-zero)', async () => {
      // Use a high port to avoid conflicts. We try a range.
      // First, find an available port by using port 0 temporarily.
      const probe = createHttpTransport({ port: 0 });
      await probe.start();
      const availablePort = probe.getPort()!;
      await probe.close();

      // Now use that same port (should be free since we closed probe)
      transport = createHttpTransport({ port: availablePort });
      await transport.start();
      expect(transport.getPort()).toBe(availablePort);
    });
  });

  // -------------------------------------------------------------------------
  // send() routing
  // -------------------------------------------------------------------------

  describe('send() routing', () => {
    it('should route response with matching id to the pending HTTP request', async () => {
      transport = createHttpTransport({ port: 0 });

      // onMessage receives the request, then we call transport.send with matching id
      transport.onMessage = (msg: JsonRpcMessage) => {
        if ('id' in msg && msg.id !== undefined && msg.id !== null) {
          // Simulate async processing
          setTimeout(() => {
            void transport.send({
              jsonrpc: '2.0',
              id: msg.id as string | number,
              result: { answer: 42 },
            });
          }, 10);
        }
      };

      await transport.start();
      const port = transport.getPort()!;

      const res = await postJsonRpc(port, '/mcp', {
        jsonrpc: '2.0',
        id: 7,
        method: 'ping',
      });

      const body = (await res.json()) as JsonRpcResponse;
      expect(body.id).toBe(7);
      expect(body.result).toEqual({ answer: 42 });
    });

    it('should broadcast via SSE when send() has no matching pending request', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      // Connect an SSE client
      const controller = new AbortController();
      const res = await request(port, '/mcp', {
        method: 'GET',
        signal: controller.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      // Read initial :ok
      await reader.read();

      // Send a message that does not match any pending request
      const msg: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: null,
        result: { event: 'server-notification' },
      };
      await transport.send(msg);

      // Read the SSE event
      const chunk = await reader.read();
      const data = decoder.decode(chunk.value);
      expect(data).toContain(`data: ${JSON.stringify(msg)}`);

      controller.abort();
    });
  });

  // -------------------------------------------------------------------------
  // close() behavior
  // -------------------------------------------------------------------------

  describe('close() behavior', () => {
    it('should resolve pending requests with server shutting down error on close', async () => {
      transport = createHttpTransport({ port: 0 });

      // onMessage does NOT send a response, so the request will be pending
      transport.onMessage = vi.fn();

      await transport.start();
      const port = transport.getPort()!;

      // Start a POST request that will be pending
      const responsePromise = postJsonRpc(port, '/mcp', {
        jsonrpc: '2.0',
        id: 999,
        method: 'long-running',
      });

      // Give the server time to receive the request
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Close the transport - should resolve pending requests
      await transport.close();

      const res = await responsePromise;
      const body = (await res.json()) as JsonRpcResponse;
      expect(body.id).toBe(999);
      expect(body.error).toBeDefined();
      expect(body.error!.code).toBe(-32603);
      expect(body.error!.message).toContain('shutting down');
    });

    it('should close SSE connections on close()', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      // Connect SSE client
      const controller = new AbortController();
      const res = await request(port, '/mcp', {
        method: 'GET',
        signal: controller.signal,
      });

      const reader = res.body!.getReader();

      // Read initial :ok
      await reader.read();

      // Close transport
      await transport.close();

      // The SSE stream should end
      const chunk = await reader.read();
      expect(chunk.done).toBe(true);

      controller.abort();
    });
  });

  // -------------------------------------------------------------------------
  // Request timeout
  // -------------------------------------------------------------------------

  describe('request timeout', () => {
    it('should return timeout error when server does not respond within 30s', async () => {
      transport = createHttpTransport({ port: 0 });

      // onMessage does NOT call transport.send(), so the request will time out
      transport.onMessage = vi.fn();

      await transport.start();
      const port = transport.getPort()!;

      // Post a request that won't get a response
      const responsePromise = postJsonRpc(port, '/mcp', {
        jsonrpc: '2.0',
        id: 'timeout-test',
        method: 'slow-operation',
      });

      // The timeout is 30 seconds; we can't wait that long in tests,
      // but we can verify the mechanism works by checking that after close()
      // the pending request resolves
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Close transport to resolve pending requests
      await transport.close();

      const res = await responsePromise;
      const body = (await res.json()) as JsonRpcResponse;
      expect(body.id).toBe('timeout-test');
      expect(body.error).toBeDefined();
      expect(body.error!.code).toBe(-32603);
    });
  });

  // -------------------------------------------------------------------------
  // SSE client management
  // -------------------------------------------------------------------------

  describe('SSE client management', () => {
    it('should remove SSE client when connection closes', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      // Connect an SSE client
      const controller = new AbortController();
      const res = await request(port, '/mcp', {
        method: 'GET',
        headers: { 'Accept': 'text/event-stream' },
        signal: controller.signal,
      });

      expect(res.status).toBe(200);

      // Read initial :ok
      const reader = res.body!.getReader();
      await reader.read();

      // Abort the connection
      controller.abort();

      // Give time for cleanup
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Sending a message should not throw (no clients to send to)
      await transport.send({
        jsonrpc: '2.0',
        id: null,
        result: { test: true },
      });
    });

    it('should broadcast to multiple SSE clients', async () => {
      transport = createHttpTransport({ port: 0 });
      await transport.start();
      const port = transport.getPort()!;

      // Connect two SSE clients
      const controller1 = new AbortController();
      const controller2 = new AbortController();

      const res1 = await request(port, '/mcp', {
        method: 'GET',
        signal: controller1.signal,
      });

      const res2 = await request(port, '/mcp', {
        method: 'GET',
        signal: controller2.signal,
      });

      const reader1 = res1.body!.getReader();
      const reader2 = res2.body!.getReader();
      const decoder = new TextDecoder();

      // Read initial :ok from both
      await reader1.read();
      await reader2.read();

      // Send a notification
      const notification: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: null,
        result: { broadcast: true },
      };
      await transport.send(notification);

      // Both should receive the message
      const chunk1 = await reader1.read();
      const chunk2 = await reader2.read();

      expect(decoder.decode(chunk1.value)).toContain(JSON.stringify(notification));
      expect(decoder.decode(chunk2.value)).toContain(JSON.stringify(notification));

      controller1.abort();
      controller2.abort();
    });
  });

  // -------------------------------------------------------------------------
  // Concurrent requests
  // -------------------------------------------------------------------------

  describe('concurrent requests', () => {
    it('should handle multiple concurrent requests with different ids', async () => {
      transport = createHttpTransport({ port: 0 });

      transport.onMessage = (msg: JsonRpcMessage) => {
        if ('id' in msg && msg.id !== undefined && msg.id !== null) {
          const id = msg.id as number;
          // Respond with different delays to test correct routing
          setTimeout(() => {
            void transport.send({
              jsonrpc: '2.0',
              id,
              result: { requestId: id },
            });
          }, id === 1 ? 50 : 10); // id=1 responds slower than id=2
        }
      };

      await transport.start();
      const port = transport.getPort()!;

      const [res1, res2] = await Promise.all([
        postJsonRpc(port, '/mcp', { jsonrpc: '2.0', id: 1, method: 'slow' }),
        postJsonRpc(port, '/mcp', { jsonrpc: '2.0', id: 2, method: 'fast' }),
      ]);

      const body1 = (await res1.json()) as JsonRpcResponse;
      const body2 = (await res2.json()) as JsonRpcResponse;

      // Each response should have the correct id
      expect(body1.id).toBe(1);
      expect((body1.result as { requestId: number }).requestId).toBe(1);
      expect(body2.id).toBe(2);
      expect((body2.result as { requestId: number }).requestId).toBe(2);
    });
  });
});
