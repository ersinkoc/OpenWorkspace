/**
 * HTTP/SSE transport for the MCP server.
 *
 * Provides an HTTP server with:
 * - POST /mcp  - receive JSON-RPC requests, return JSON-RPC responses
 * - GET  /mcp  - Server-Sent Events for server-to-client notifications
 * - GET  /health - health check endpoint
 *
 * Uses only Node.js built-in `node:http` module (zero dependencies).
 */

import { createServer } from 'node:http';
import type { Server, IncomingMessage, ServerResponse } from 'node:http';
import type { Transport, JsonRpcMessage, JsonRpcResponse } from '../server.js';

/**
 * Configuration options for the HTTP transport.
 */
export type HttpTransportOptions = {
  /** Port to listen on. Defaults to 3000. */
  port?: number;
  /** Host to bind to. Defaults to '127.0.0.1'. */
  host?: string;
  /** Base path for the MCP endpoint. Defaults to '/mcp'. */
  path?: string;
  /** Optional auth token. If set, requires Authorization: Bearer <token> on each request. */
  authToken?: string;
};

/**
 * Extended Transport interface with HTTP-specific methods.
 */
export type HttpTransport = Transport & {
  /** Returns the port the server is listening on, or undefined if not started. */
  getPort(): number | undefined;
};

/**
 * Sets CORS headers on the response to allow cross-origin requests.
 * Uses strict validation to prevent CORS misconfiguration attacks.
 * Only allows localhost and 127.0.0.1 origins with specific ports.
 */
function setCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = req?.headers?.origin;
  // Validate origin strictly - only allow localhost and 127.0.0.1
  const allowed = origin && (
    /^http:\/\/localhost(:\d+)?$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
  );
  // Default to localhost if origin is not allowed
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'http://localhost');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Prevent credentials from being sent to arbitrary origins
  res.setHeader('Vary', 'Origin');
}

/**
 * Reads the entire request body as a UTF-8 string.
 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const MAX_BODY_SIZE = 1024 * 1024; // 1MB
    let totalSize = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

/**
 * Creates an HTTP/SSE-based MCP transport.
 *
 * For POST requests to the MCP endpoint, the transport parses the JSON-RPC
 * message, dispatches it to the server via `onMessage`, and waits for the
 * server to call `send()` to write the response back in the HTTP body.
 *
 * For GET requests to the MCP endpoint, a Server-Sent Events stream is
 * established for server-initiated notifications.
 *
 * @param options - HTTP transport configuration.
 * @returns An HttpTransport instance.
 *
 * @example
 * ```ts
 * const transport = createHttpTransport({ port: 8080 });
 * const server = createMcpServer(registry, options);
 * await server.connect(transport);
 * ```
 */
export function createHttpTransport(
  options: HttpTransportOptions = {},
): HttpTransport {
  const port = options.port ?? 3000;
  const host = options.host ?? '127.0.0.1';
  const basePath = options.path ?? '/mcp';
  const authToken = options.authToken;

  let server: Server | null = null;
  let sseClients: ServerResponse[] = [];
  let onMessage: ((msg: JsonRpcMessage) => void) | null = null;
  let onClose: (() => void) | null = null;
  let onError: ((err: Error) => void) | null = null;

  /**
   * Map of pending request IDs to their HTTP response writers.
   * When a JSON-RPC request arrives via POST, we store the response
   * writer here so that when the server calls transport.send() with
   * the matching id, we can write it back to the HTTP response.
   */
  const pendingResponses = new Map<
    string | number,
    (response: JsonRpcResponse) => void
  >();

  /**
   * Handles an incoming HTTP request.
   */
  async function handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    setCorsHeaders(req, res);

    const url = req.url ?? '/';
    const method = req.method ?? 'GET';

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Verify auth token if configured
    if (authToken) {
      const authHeader = req.headers['authorization'];
      if (!authHeader || authHeader !== 'Bearer ' + authToken) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    }

    // Health check endpoint
    if (url === '/health' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // MCP POST endpoint - receive JSON-RPC messages
    if (url === basePath && method === 'POST') {
      await handleMcpPost(req, res);
      return;
    }

    // MCP GET endpoint - SSE for server notifications
    if (url === basePath && method === 'GET') {
      handleMcpSse(req, res);
      return;
    }

    // Not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  /**
   * Handles a POST request to the MCP endpoint.
   * Parses the JSON-RPC message, dispatches it, and returns the response.
   */
  async function handleMcpPost(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    let body: string;
    try {
      body = await readBody(req);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Failed to read request body' },
        }),
      );
      return;
    }

    let message: JsonRpcMessage;
    try {
      message = JSON.parse(body) as JsonRpcMessage;
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' },
        }),
      );
      return;
    }

    // For requests (with id), we need to return the response in the HTTP body
    if ('id' in message && message.id !== undefined && message.id !== null) {
      const requestId = message.id as string | number;

      // Create a promise that will resolve when the server sends the response
      const responsePromise = new Promise<JsonRpcResponse>((resolve) => {
        pendingResponses.set(requestId, resolve);
      });

      // Dispatch the message to the server
      onMessage?.(message);

      // Wait for the response (with a timeout)
      const timeoutMs = 30_000;
      let timeoutId: NodeJS.Timeout;
      const timeout = new Promise<JsonRpcResponse>((resolve) => {
        timeoutId = setTimeout(() => {
          pendingResponses.delete(requestId);
          resolve({
            jsonrpc: '2.0',
            id: requestId,
            error: { code: -32603, message: 'Request timed out' },
          });
        }, timeoutMs);
      });

      const response = await Promise.race([responsePromise, timeout]);
      clearTimeout(timeoutId!);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } else {
      // Notification - no response expected
      onMessage?.(message);
      res.writeHead(202);
      res.end();
    }
  }

  /**
   * Handles a GET request to the MCP endpoint for SSE.
   */
  function handleMcpSse(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(':ok\n\n');

    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter((c) => c !== res);
    });
  }

  // -----------------------------------------------------------------------
  // Transport Implementation
  // -----------------------------------------------------------------------

  const transport: HttpTransport = {
    get onMessage() {
      return onMessage;
    },
    set onMessage(fn) {
      onMessage = fn;
    },
    get onClose() {
      return onClose;
    },
    set onClose(fn) {
      onClose = fn;
    },
    get onError() {
      return onError;
    },
    set onError(fn) {
      onError = fn;
    },

    async start(): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        server = createServer((req, res) => {
          handleRequest(req, res).catch((e) => {
            onError?.(e instanceof Error ? e : new Error(String(e)));
          });
        });

        server.on('error', (e: Error) => {
          onError?.(e);
          reject(e);
        });

        server.listen(port, host, () => resolve());
      });
    },

    async close(): Promise<void> {
      // Close all SSE clients
      for (const client of sseClients) {
        client.end();
      }
      sseClients = [];

      // Resolve any pending requests with an error
      for (const [id, resolve] of pendingResponses.entries()) {
        resolve({
          jsonrpc: '2.0',
          id,
          error: { code: -32603, message: 'Server shutting down' },
        });
      }
      pendingResponses.clear();

      return new Promise<void>((resolve) => {
        if (server !== null) {
          server.close(() => {
            server = null;
            onClose?.();
            resolve();
          });
        } else {
          resolve();
        }
      });
    },

    async send(message: JsonRpcResponse): Promise<void> {
      // Check if this response matches a pending HTTP request
      if (
        message.id !== null &&
        message.id !== undefined &&
        pendingResponses.has(message.id)
      ) {
        const resolve = pendingResponses.get(message.id)!;
        pendingResponses.delete(message.id);
        resolve(message);
        return;
      }

      // Otherwise, broadcast via SSE to all connected clients
      const data = JSON.stringify(message);
      for (const client of sseClients) {
        client.write(`data: ${data}\n\n`);
      }
    },

    getPort(): number | undefined {
      const addr = server?.address();
      if (addr !== null && addr !== undefined && typeof addr === 'object') {
        return addr.port;
      }
      return undefined;
    },
  };

  return transport;
}
