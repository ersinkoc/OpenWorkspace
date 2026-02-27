/**
 * JSON Schema generation for MCP tool definitions.
 * Converts OpenWorkspace ToolParameter format to JSON Schema
 * as required by the MCP protocol's tools/list response.
 */

import type { ToolParameter, ToolListing } from './registry.js';

/**
 * JSON Schema property definition for a single tool parameter.
 */
export type JsonSchemaProperty = {
  type: string;
  description?: string;
  enum?: unknown[];
  items?: { type: string } | Record<string, unknown>;
};

/**
 * JSON Schema object definition for tool input.
 */
export type JsonSchema = {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
};

/**
 * MCP tool definition returned by tools/list.
 */
export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
};

/**
 * Converts a single ToolParameter to a JSON Schema property definition.
 */
function parameterToSchemaProperty(param: ToolParameter): JsonSchemaProperty {
  const prop: JsonSchemaProperty = {
    type: param.type,
    description: param.description,
  };

  if (param.enum !== undefined) {
    prop.enum = param.enum;
  }

  if (param.type === 'array') {
    prop.items = param.items ?? {};
  }

  return prop;
}

/**
 * Converts a record of ToolParameters to a JSON Schema object definition.
 *
 * Maps each parameter's type, description, enum, and required status
 * to the corresponding JSON Schema fields.
 *
 * @param parameters - Tool parameter definitions from the registry.
 * @returns A JSON Schema object suitable for MCP tools/list responses.
 */
export function toolParametersToJsonSchema(
  parameters: Record<string, ToolParameter>,
): JsonSchema {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const [name, param] of Object.entries(parameters)) {
    properties[name] = parameterToSchemaProperty(param);

    if (param.required === true) {
      required.push(name);
    }
  }

  const schema: JsonSchema = {
    type: 'object',
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

/**
 * Converts a ToolListing to an MCP tool definition.
 *
 * @param listing - Tool listing entry from the registry.
 * @returns MCP-compatible tool definition with JSON Schema inputSchema.
 */
export function toolListingToMcpTool(listing: ToolListing): McpToolDefinition {
  return {
    name: listing.name,
    description: listing.description,
    inputSchema: toolParametersToJsonSchema(listing.parameters),
  };
}
