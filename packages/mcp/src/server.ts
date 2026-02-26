/**
 * MCP (Model Context Protocol) server implementation.
 *
 * Implements a JSON-RPC 2.0 based MCP server with zero external dependencies.
 * Supports the MCP protocol methods: initialize, initialized, ping,
 * tools/list, and tools/call.
 *
 * The server uses a Transport interface for I/O abstraction, allowing it
 * to work with stdio, HTTP/SSE, or any other transport mechanism.
 */

import type { Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { ToolRegistry } from './registry.js';
import { toolListingToMcpTool } from './schema.js';
import type { ResourceRegistry } from './resources.js';
import type { PromptRegistry } from './prompts.js';

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 Types
// ---------------------------------------------------------------------------

/**
 * JSON-RPC 2.0 request message.
 */
export type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
};

/**
 * JSON-RPC 2.0 notification message (no id, no response expected).
 */
export type JsonRpcNotification = {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
};

/**
 * JSON-RPC 2.0 response message.
 */
export type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
};

/**
 * JSON-RPC 2.0 error object.
 */
export type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

/**
 * Any JSON-RPC 2.0 message.
 */
export type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;

// ---------------------------------------------------------------------------
// Transport Interface
// ---------------------------------------------------------------------------

/**
 * Transport interface for MCP server I/O abstraction.
 * Implementations handle the actual reading/writing of messages.
 */
export type Transport = {
  /** Start the transport (begin listening for messages). */
  start(): Promise<void>;
  /** Close the transport and release resources. */
  close(): Promise<void>;
  /** Send a JSON-RPC response message. */
  send(message: JsonRpcResponse): Promise<void>;
  /** Callback invoked when a message is received. */
  onMessage: ((message: JsonRpcMessage) => void) | null;
  /** Callback invoked when the transport connection closes. */
  onClose: (() => void) | null;
  /** Callback invoked on transport errors. */
  onError: ((error: Error) => void) | null;
};

// ---------------------------------------------------------------------------
// Server Types
// ---------------------------------------------------------------------------

/**
 * Server identification info returned during initialization.
 */
export type ServerInfo = {
  name: string;
  version: string;
};

/**
 * Server capabilities advertised during initialization.
 */
export type ServerCapabilities = {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  logging?: Record<string, never>;
};

/**
 * Options for creating an MCP server.
 */
export type McpServerOptions = {
  name: string;
  version: string;
  capabilities?: ServerCapabilities;
  resourceRegistry?: ResourceRegistry;
  promptRegistry?: PromptRegistry;
};

/**
 * MCP server instance returned by createMcpServer.
 */
export type McpServer = {
  /** Connect to a transport and start processing messages. */
  connect(transport: Transport): Promise<void>;
  /** Close the server and disconnect the transport. */
  close(): Promise<void>;
  /** Process a single JSON-RPC message and return the response (or null for notifications). */
  handleMessage(message: JsonRpcMessage): Promise<JsonRpcResponse | null>;
  /** Check whether the server is connected to a transport. */
  isConnected(): boolean;
  /** Get the server identification info. */
  getServerInfo(): ServerInfo;
};

// ---------------------------------------------------------------------------
// JSON-RPC Error Codes
// ---------------------------------------------------------------------------

/** JSON could not be parsed. */
const PARSE_ERROR = -32700;
/** The JSON sent is not a valid Request object. */
const INVALID_REQUEST = -32600;
/** The method does not exist or is not available. */
const METHOD_NOT_FOUND = -32601;
/** Invalid method parameters. */
const INVALID_PARAMS = -32602;
/** Internal JSON-RPC error. */
const INTERNAL_ERROR = -32603;

/** MCP protocol version supported by this server. */
const PROTOCOL_VERSION = '2024-11-05';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a JSON-RPC 2.0 error response.
 */
function errorResponse(
  id: string | number | null,
  code: number,
  message: string,
): JsonRpcResponse {
  const response: JsonRpcResponse = {
    jsonrpc: '2.0',
    id,
    error: { code, message },
  };
  return response;
}

/**
 * Creates a JSON-RPC 2.0 success response.
 */
function successResponse(
  id: string | number,
  result: unknown,
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

/**
 * Type guard: checks whether a JSON-RPC message is a request (has id).
 */
function isRequest(msg: JsonRpcMessage): msg is JsonRpcRequest {
  return 'id' in msg && 'method' in msg && msg.id !== undefined && msg.id !== null;
}

/**
 * Type guard: checks whether a JSON-RPC message is a notification (no id, has method).
 */
function isNotification(msg: JsonRpcMessage): msg is JsonRpcNotification {
  return 'method' in msg && !('id' in msg && (msg as JsonRpcRequest).id !== undefined);
}

// ---------------------------------------------------------------------------
// Server Factory
// ---------------------------------------------------------------------------

/**
 * Creates a new MCP server instance.
 *
 * The server handles JSON-RPC 2.0 messages over a pluggable Transport,
 * converting between the MCP protocol and the OpenWorkspace ToolRegistry.
 *
 * @param registry - The tool registry containing available tools.
 * @param options - Server configuration (name, version, capabilities).
 * @returns An McpServer instance.
 *
 * @example
 * ```ts
 * const registry = createToolRegistry();
 * registerServiceTools(registry);
 * const server = createMcpServer(registry, {
 *   name: 'openworkspace',
 *   version: '0.1.0',
 *   capabilities: { tools: { listChanged: false } },
 * });
 * const transport = createStdioTransport();
 * await server.connect(transport);
 * ```
 */
export function createMcpServer(
  registry: ToolRegistry,
  options: McpServerOptions,
): McpServer {
  const serverInfo: ServerInfo = {
    name: options.name,
    version: options.version,
  };

  const resourceRegistry = options.resourceRegistry ?? null;
  const promptRegistry = options.promptRegistry ?? null;

  // Build capabilities, merging explicit options with auto-detected registries
  const capabilities: ServerCapabilities = { ...options.capabilities };
  if (resourceRegistry && !capabilities.resources) {
    capabilities.resources = { subscribe: false, listChanged: false };
  }
  if (promptRegistry && !capabilities.prompts) {
    capabilities.prompts = { listChanged: false };
  }

  let transport: Transport | null = null;
  let initialized = false;

  // -----------------------------------------------------------------------
  // Method Handlers
  // -----------------------------------------------------------------------

  /**
   * Handles the 'initialize' method.
   * Sets the initialized flag and returns server info + capabilities.
   */
  function handleInitialize(
    id: string | number,
    _params: Record<string, unknown> | undefined,
  ): JsonRpcResponse {
    initialized = true;

    return successResponse(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities,
      serverInfo,
    });
  }

  /**
   * Handles the 'ping' method.
   * Returns an empty object to confirm the server is alive.
   */
  function handlePing(id: string | number): JsonRpcResponse {
    return successResponse(id, {});
  }

  /**
   * Handles the 'tools/list' method.
   * Returns all registered tools with their JSON Schema input definitions.
   */
  function handleToolsList(id: string | number): JsonRpcResponse {
    const listings = registry.list();
    const tools = listings.map(toolListingToMcpTool);
    return successResponse(id, { tools });
  }

  /**
   * Handles the 'tools/call' method.
   * Invokes a tool from the registry and returns the result.
   */
  async function handleToolsCall(
    id: string | number,
    params: Record<string, unknown> | undefined,
  ): Promise<JsonRpcResponse> {
    if (!params) {
      return errorResponse(id, INVALID_PARAMS, 'Missing params for tools/call');
    }

    const toolName = params['name'];
    if (typeof toolName !== 'string') {
      return errorResponse(id, INVALID_PARAMS, 'Missing or invalid "name" parameter');
    }

    const toolArgs = (params['arguments'] ?? {}) as Record<string, unknown>;
    if (typeof toolArgs !== 'object' || toolArgs === null || Array.isArray(toolArgs)) {
      return errorResponse(id, INVALID_PARAMS, '"arguments" must be an object');
    }

    const result = await registry.invoke(toolName, toolArgs);

    if (!result.ok) {
      return successResponse(id, {
        content: [{ type: 'text', text: result.error.message }],
        isError: true,
      });
    }

    const toolResult = result.value;

    if (!toolResult.success) {
      return successResponse(id, {
        content: [{ type: 'text', text: toolResult.error ?? 'Tool execution failed' }],
        isError: true,
      });
    }

    return successResponse(id, {
      content: [{ type: 'text', text: JSON.stringify(toolResult.data) }],
    });
  }

  // -----------------------------------------------------------------------
  // Resource Handlers
  // -----------------------------------------------------------------------

  /**
   * Handles the 'resources/list' method.
   * Returns all registered static resources and resource templates.
   */
  function handleResourcesList(id: string | number): JsonRpcResponse {
    if (!resourceRegistry) {
      return errorResponse(id, METHOD_NOT_FOUND, 'Method not available: resources/list (no resource registry configured)');
    }
    return successResponse(id, {
      resources: resourceRegistry.listResources(),
      resourceTemplates: resourceRegistry.listTemplates(),
    });
  }

  /**
   * Handles the 'resources/templates/list' method.
   * Returns all registered resource templates.
   */
  function handleResourcesTemplatesList(id: string | number): JsonRpcResponse {
    if (!resourceRegistry) {
      return errorResponse(id, METHOD_NOT_FOUND, 'Method not available: resources/templates/list (no resource registry configured)');
    }
    return successResponse(id, {
      resourceTemplates: resourceRegistry.listTemplates(),
    });
  }

  /**
   * Handles the 'resources/read' method.
   * Reads the content of a resource identified by URI.
   */
  async function handleResourcesRead(
    id: string | number,
    params: Record<string, unknown> | undefined,
  ): Promise<JsonRpcResponse> {
    if (!resourceRegistry) {
      return errorResponse(id, METHOD_NOT_FOUND, 'Method not available: resources/read (no resource registry configured)');
    }

    if (!params) {
      return errorResponse(id, INVALID_PARAMS, 'Missing params for resources/read');
    }

    const uri = params['uri'];
    if (typeof uri !== 'string') {
      return errorResponse(id, INVALID_PARAMS, 'Missing or invalid "uri" parameter');
    }

    const content = await resourceRegistry.read(uri);

    if (content === null) {
      return errorResponse(id, INVALID_PARAMS, `Resource not found: ${uri}`);
    }

    return successResponse(id, { contents: [content] });
  }

  // -----------------------------------------------------------------------
  // Prompt Handlers
  // -----------------------------------------------------------------------

  /**
   * Handles the 'prompts/list' method.
   * Returns all registered prompts.
   */
  function handlePromptsList(id: string | number): JsonRpcResponse {
    if (!promptRegistry) {
      return errorResponse(id, METHOD_NOT_FOUND, 'Method not available: prompts/list (no prompt registry configured)');
    }
    return successResponse(id, { prompts: promptRegistry.list() });
  }

  /**
   * Handles the 'prompts/get' method.
   * Returns messages for a prompt, resolved with the given arguments.
   */
  function handlePromptsGet(
    id: string | number,
    params: Record<string, unknown> | undefined,
  ): JsonRpcResponse {
    if (!promptRegistry) {
      return errorResponse(id, METHOD_NOT_FOUND, 'Method not available: prompts/get (no prompt registry configured)');
    }

    if (!params) {
      return errorResponse(id, INVALID_PARAMS, 'Missing params for prompts/get');
    }

    const name = params['name'];
    if (typeof name !== 'string') {
      return errorResponse(id, INVALID_PARAMS, 'Missing or invalid "name" parameter');
    }

    const promptArgs = (params['arguments'] ?? {}) as Record<string, string>;

    const messages = promptRegistry.getWithArgs(name, promptArgs);

    if (messages === null) {
      return errorResponse(id, INVALID_PARAMS, `Prompt not found: ${name}`);
    }

    return successResponse(id, { messages });
  }

  // -----------------------------------------------------------------------
  // Message Router
  // -----------------------------------------------------------------------

  /**
   * Processes a single JSON-RPC message and returns the appropriate response.
   * Returns null for notifications (no response expected).
   */
  async function handleMessage(
    message: JsonRpcMessage,
  ): Promise<JsonRpcResponse | null> {
    // Handle notifications (no response expected)
    if (isNotification(message)) {
      // 'initialized' is the only notification we explicitly handle
      // All other notifications are silently acknowledged
      return null;
    }

    // Handle requests (response required)
    if (isRequest(message)) {
      const { id, method, params } = message;

      // 'initialize' is the only method allowed before initialization
      if (method === 'initialize') {
        return handleInitialize(id, params);
      }

      // All other methods require initialization
      if (!initialized) {
        return errorResponse(
          id,
          INVALID_REQUEST,
          'Server not initialized. Send "initialize" first.',
        );
      }

      switch (method) {
        case 'ping':
          return handlePing(id);
        case 'tools/list':
          return handleToolsList(id);
        case 'tools/call':
          return handleToolsCall(id, params);
        case 'resources/list':
          return handleResourcesList(id);
        case 'resources/templates/list':
          return handleResourcesTemplatesList(id);
        case 'resources/read':
          return handleResourcesRead(id, params);
        case 'prompts/list':
          return handlePromptsList(id);
        case 'prompts/get':
          return handlePromptsGet(id, params);
        default:
          return errorResponse(id, METHOD_NOT_FOUND, `Unknown method: ${method}`);
      }
    }

    // If it's a response message (has id but no method), ignore it
    // This shouldn't normally happen on the server side
    return null;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  const server: McpServer = {
    async connect(t: Transport): Promise<void> {
      transport = t;

      transport.onMessage = (message: JsonRpcMessage) => {
        handleMessage(message)
          .then((response) => {
            if (response !== null && transport !== null) {
              return transport.send(response);
            }
          })
          .catch((error) => {
            // Unexpected error in message handling
            const errorMsg = error instanceof Error ? error.message : String(error);
            process.stderr.write(`MCP server error: ${errorMsg}\n`);
          });
      };

      transport.onClose = () => {
        initialized = false;
        transport = null;
      };

      transport.onError = (error: Error) => {
        process.stderr.write(`MCP transport error: ${error.message}\n`);
      };

      await transport.start();
    },

    async close(): Promise<void> {
      initialized = false;
      if (transport !== null) {
        await transport.close();
        transport = null;
      }
    },

    handleMessage,

    isConnected(): boolean {
      return transport !== null;
    },

    getServerInfo(): ServerInfo {
      return { ...serverInfo };
    },
  };

  return server;
}
