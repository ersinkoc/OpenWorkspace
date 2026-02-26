#!/usr/bin/env node
/**
 * MCP server CLI entry point.
 *
 * Usage:
 *   ows-mcp --stdio           Start with stdio transport (for Claude Desktop)
 *   ows-mcp --http            Start with HTTP/SSE transport (default port 3000)
 *   ows-mcp --http --port N   Start with HTTP/SSE transport on port N
 *
 * The server registers all OpenWorkspace service tools and exposes them
 * via the Model Context Protocol (MCP) over the selected transport.
 *
 * By default (no flags), the server starts in stdio mode.
 */

import { createToolRegistry } from './registry.js';
import { registerServiceTools } from './tools.js';
import { createMcpServer } from './server.js';
import { createStdioTransport } from './transport/stdio.js';
import { createHttpTransport } from './transport/http.js';

const args = process.argv.slice(2);
const useHttp = args.includes('--http');
const portFlagIndex = args.indexOf('--port');
const portArg = portFlagIndex !== -1 ? args[portFlagIndex + 1] : undefined;
const port = portArg !== undefined ? parseInt(portArg, 10) : 3000;

// Validate port if provided
if (portArg !== undefined && (Number.isNaN(port) || port < 0 || port > 65535)) {
  process.stderr.write(`Invalid port number: ${portArg}\n`);
  process.exit(1);
}

// Create the registry and register all service tools
const registry = createToolRegistry();
registerServiceTools(registry);

// Create the server
const server = createMcpServer(registry, {
  name: 'openworkspace',
  version: '0.1.0',
  capabilities: {
    tools: { listChanged: false },
  },
});

if (useHttp) {
  const transport = createHttpTransport({ port, host: '127.0.0.1' });
  await server.connect(transport);
  // Log to stderr so we don't pollute stdout (important for stdio-based clients)
  process.stderr.write(
    `OpenWorkspace MCP server listening on http://127.0.0.1:${port}/mcp\n`,
  );
} else {
  // Default to stdio transport
  const transport = createStdioTransport();
  await server.connect(transport);
}
