/**
 * @openworkspace/mcp
 * MCP server and tool registry for OpenWorkspace.
 */

// Registry
export type {
  Tool,
  ToolListing,
  ToolParameter,
  ToolParameterType,
  ToolRegistry,
  ToolResult,
} from './registry.js';
export { createToolRegistry } from './registry.js';

// Service tools
export { registerServiceTools } from './tools.js';

// JSON Schema generation
export type { JsonSchema, JsonSchemaProperty, McpToolDefinition } from './schema.js';
export { toolParametersToJsonSchema, toolListingToMcpTool } from './schema.js';

// MCP server
export type {
  JsonRpcRequest,
  JsonRpcNotification,
  JsonRpcResponse,
  JsonRpcError,
  JsonRpcMessage,
  Transport,
  ServerInfo,
  ServerCapabilities,
  McpServerOptions,
  McpServer,
} from './server.js';
export { createMcpServer } from './server.js';

// Resources
export type {
  Resource,
  ResourceTemplate,
  ResourceContent,
  ResourceHandler,
  ResourceRegistry,
} from './resources.js';
export { createResourceRegistry, registerCalendarResources, registerDriveResources } from './resources.js';

// Prompts
export type {
  PromptArgument,
  PromptMessage,
  Prompt,
  PromptHandler,
  PromptRegistry,
} from './prompts.js';
export { createPromptRegistry, registerBuiltinPrompts } from './prompts.js';

// Transports
export { createStdioTransport } from './transport/stdio.js';
export type { HttpTransportOptions, HttpTransport } from './transport/http.js';
export { createHttpTransport } from './transport/http.js';
