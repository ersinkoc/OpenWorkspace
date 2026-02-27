/**
 * MCP Tool Registry for OpenWorkspace.
 * Manages tool registration, listing, and invocation.
 */

import type { Result } from '@openworkspace/core';
import { ok, err, ValidationError, NotFoundError } from '@openworkspace/core';

/**
 * Tool parameter type definition.
 */
export type ToolParameterType = 'string' | 'number' | 'boolean' | 'object' | 'array';

/**
 * Tool parameter definition.
 */
export type ToolParameter = {
  type: ToolParameterType;
  description: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
  items?: { type: string } | Record<string, unknown>;
};

/**
 * Tool definition with metadata and handler.
 */
export type Tool = {
  /**
   * Tool name (unique identifier).
   */
  name: string;

  /**
   * Human-readable description.
   */
  description: string;

  /**
   * Parameter definitions.
   */
  parameters: Record<string, ToolParameter>;

  /**
   * Tool handler function.
   */
  handler: (params: Record<string, unknown>) => Promise<unknown>;
};

/**
 * Tool listing entry (without handler).
 */
export type ToolListing = {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
};

/**
 * Tool invocation result.
 */
export type ToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

/**
 * Tool registry interface.
 */
export type ToolRegistry = {
  /**
   * Register a tool.
   */
  register(tool: Tool): Result<void, ValidationError>;

  /**
   * Unregister a tool by name.
   */
  unregister(name: string): boolean;

  /**
   * Get a tool by name.
   */
  get(name: string): Tool | undefined;

  /**
   * List all registered tools (without handlers).
   */
  list(): ToolListing[];

  /**
   * Check if a tool exists.
   */
  has(name: string): boolean;

  /**
   * Invoke a tool by name with parameters.
   */
  invoke(name: string, params: Record<string, unknown>): Promise<Result<ToolResult, NotFoundError | ValidationError>>;

  /**
   * Clear all registered tools.
   */
  clear(): void;

  /**
   * Get count of registered tools.
   */
  count(): number;
};

/**
 * Validates a parameter value against its definition.
 */
function validateParameter(
  name: string,
  value: unknown,
  param: ToolParameter
): string | undefined {
  // Check required
  if (param.required && (value === undefined || value === null)) {
    return `Parameter '${name}' is required`;
  }

  // Skip further validation if value is not provided and not required
  if (value === undefined || value === null) {
    return undefined;
  }

  // Type validation
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  const expectedType = param.type;

  if (actualType !== expectedType && !(expectedType === 'array' && Array.isArray(value))) {
    return `Parameter '${name}' must be of type ${expectedType}, got ${actualType}`;
  }

  // Enum validation
  if (param.enum && !param.enum.includes(value)) {
    return `Parameter '${name}' must be one of: ${param.enum.join(', ')}`;
  }

  return undefined;
}

/**
 * Validates all parameters against tool definition.
 */
function validateParameters(
  params: Record<string, unknown>,
  tool: Tool
): string[] {
  const errors: string[] = [];

  // Validate provided parameters
  for (const [key, value] of Object.entries(params)) {
    const param = tool.parameters[key];
    if (!param) {
      errors.push(`Unknown parameter: '${key}'`);
      continue;
    }

    const error = validateParameter(key, value, param);
    if (error) {
      errors.push(error);
    }
  }

  // Check for missing required parameters
  for (const [key, param] of Object.entries(tool.parameters)) {
    if (param.required && !(key in params)) {
      errors.push(`Parameter '${key}' is required`);
    }
  }

  // Apply defaults for missing optional parameters
  for (const [key, param] of Object.entries(tool.parameters)) {
    if (param.default !== undefined && !(key in params)) {
      params[key] = param.default;
    }
  }

  return errors;
}

/**
 * Creates a new tool registry.
 * @example
 * const registry = createToolRegistry();
 * registry.register({
 *   name: 'echo',
 *   description: 'Echoes the input',
 *   parameters: { message: { type: 'string', description: 'Message to echo', required: true } },
 *   handler: async (params) => params.message,
 * });
 * const result = await registry.invoke('echo', { message: 'Hello' });
 */
export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, Tool>();

  return {
    register(tool: Tool): Result<void, ValidationError> {
      if (!tool.name || typeof tool.name !== 'string') {
        return err(new ValidationError('Tool name is required and must be a string'));
      }

      if (!tool.description || typeof tool.description !== 'string') {
        return err(new ValidationError('Tool description is required and must be a string'));
      }

      if (typeof tool.handler !== 'function') {
        return err(new ValidationError('Tool handler must be a function'));
      }

      if (tools.has(tool.name)) {
        return err(new ValidationError(`Tool '${tool.name}' is already registered`));
      }

      tools.set(tool.name, tool);
      return ok(undefined);
    },

    unregister(name: string): boolean {
      return tools.delete(name);
    },

    get(name: string): Tool | undefined {
      return tools.get(name);
    },

    list(): ToolListing[] {
      return Array.from(tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));
    },

    has(name: string): boolean {
      return tools.has(name);
    },

    async invoke(
      name: string,
      params: Record<string, unknown>
    ): Promise<Result<ToolResult, NotFoundError | ValidationError>> {
      const tool = tools.get(name);

      if (!tool) {
        return err(new NotFoundError(`Tool '${name}' not found`));
      }

      const validationErrors = validateParameters(params, tool);

      if (validationErrors.length > 0) {
        return err(new ValidationError(validationErrors.join('; ')));
      }

      try {
        const data = await tool.handler(params);
        return ok({ success: true, data });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return ok({ success: false, error: message });
      }
    },

    clear(): void {
      tools.clear();
    },

    count(): number {
      return tools.size;
    },
  };
}
