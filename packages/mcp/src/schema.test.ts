import { describe, it, expect } from 'vitest';
import { toolParametersToJsonSchema, toolListingToMcpTool } from './schema.js';
import type { ToolParameter, ToolListing } from './registry.js';

describe('schema', () => {
  // ---------------------------------------------------------------------------
  // toolParametersToJsonSchema
  // ---------------------------------------------------------------------------

  describe('toolParametersToJsonSchema', () => {
    it('should return object schema with empty properties for no parameters', () => {
      const schema = toolParametersToJsonSchema({});
      expect(schema).toEqual({ type: 'object', properties: {} });
      expect(schema.required).toBeUndefined();
    });

    it('should convert a string parameter', () => {
      const params: Record<string, ToolParameter> = {
        name: { type: 'string', description: 'The name' },
      };
      const schema = toolParametersToJsonSchema(params);
      expect(schema.properties['name']).toEqual({
        type: 'string',
        description: 'The name',
      });
    });

    it('should convert a number parameter', () => {
      const params: Record<string, ToolParameter> = {
        count: { type: 'number', description: 'Total count' },
      };
      const schema = toolParametersToJsonSchema(params);
      expect(schema.properties['count']).toEqual({
        type: 'number',
        description: 'Total count',
      });
    });

    it('should convert a boolean parameter', () => {
      const params: Record<string, ToolParameter> = {
        verbose: { type: 'boolean', description: 'Enable verbose output' },
      };
      const schema = toolParametersToJsonSchema(params);
      expect(schema.properties['verbose']).toEqual({
        type: 'boolean',
        description: 'Enable verbose output',
      });
    });

    it('should convert an object parameter', () => {
      const params: Record<string, ToolParameter> = {
        config: { type: 'object', description: 'Configuration object' },
      };
      const schema = toolParametersToJsonSchema(params);
      expect(schema.properties['config']).toEqual({
        type: 'object',
        description: 'Configuration object',
      });
    });

    it('should convert an array parameter with items type', () => {
      const params: Record<string, ToolParameter> = {
        tags: { type: 'array', description: 'List of tags' },
      };
      const schema = toolParametersToJsonSchema(params);
      expect(schema.properties['tags']).toEqual({
        type: 'array',
        description: 'List of tags',
        items: {},
      });
    });

    it('should include required parameter in required array', () => {
      const params: Record<string, ToolParameter> = {
        query: { type: 'string', description: 'Search query', required: true },
      };
      const schema = toolParametersToJsonSchema(params);
      expect(schema.required).toEqual(['query']);
    });

    it('should not include optional parameter in required array', () => {
      const params: Record<string, ToolParameter> = {
        limit: { type: 'number', description: 'Max results' },
      };
      const schema = toolParametersToJsonSchema(params);
      expect(schema.required).toBeUndefined();
    });

    it('should not include explicitly non-required parameter in required array', () => {
      const params: Record<string, ToolParameter> = {
        limit: { type: 'number', description: 'Max results', required: false },
      };
      const schema = toolParametersToJsonSchema(params);
      expect(schema.required).toBeUndefined();
    });

    it('should include enum values in schema property', () => {
      const params: Record<string, ToolParameter> = {
        format: {
          type: 'string',
          description: 'Output format',
          enum: ['json', 'csv', 'xml'],
        },
      };
      const schema = toolParametersToJsonSchema(params);
      expect(schema.properties['format']).toEqual({
        type: 'string',
        description: 'Output format',
        enum: ['json', 'csv', 'xml'],
      });
    });

    it('should include multiple required params in required array', () => {
      const params: Record<string, ToolParameter> = {
        to: { type: 'string', description: 'Recipient', required: true },
        subject: { type: 'string', description: 'Subject line', required: true },
        body: { type: 'string', description: 'Email body', required: true },
      };
      const schema = toolParametersToJsonSchema(params);
      expect(schema.required).toEqual(['to', 'subject', 'body']);
    });

    it('should handle mixed required and optional params', () => {
      const params: Record<string, ToolParameter> = {
        query: { type: 'string', description: 'Search query', required: true },
        max: { type: 'number', description: 'Max results' },
        format: { type: 'string', description: 'Output format', required: true },
        verbose: { type: 'boolean', description: 'Verbose output' },
      };
      const schema = toolParametersToJsonSchema(params);
      expect(schema.required).toEqual(['query', 'format']);
      expect(Object.keys(schema.properties)).toHaveLength(4);
      expect(schema.properties['query']).toBeDefined();
      expect(schema.properties['max']).toBeDefined();
      expect(schema.properties['format']).toBeDefined();
      expect(schema.properties['verbose']).toBeDefined();
    });

    it('should not add items for non-array types', () => {
      const params: Record<string, ToolParameter> = {
        name: { type: 'string', description: 'A name' },
      };
      const schema = toolParametersToJsonSchema(params);
      expect(schema.properties['name'].items).toBeUndefined();
    });

    it('should not include enum when not defined', () => {
      const params: Record<string, ToolParameter> = {
        name: { type: 'string', description: 'A name' },
      };
      const schema = toolParametersToJsonSchema(params);
      expect(schema.properties['name'].enum).toBeUndefined();
    });

    it('should always set type to "object"', () => {
      const schema = toolParametersToJsonSchema({});
      expect(schema.type).toBe('object');
    });

    it('should handle enum with a required parameter', () => {
      const params: Record<string, ToolParameter> = {
        color: {
          type: 'string',
          description: 'Favorite color',
          enum: ['red', 'green', 'blue'],
          required: true,
        },
      };
      const schema = toolParametersToJsonSchema(params);
      expect(schema.required).toEqual(['color']);
      expect(schema.properties['color'].enum).toEqual(['red', 'green', 'blue']);
    });
  });

  // ---------------------------------------------------------------------------
  // toolListingToMcpTool
  // ---------------------------------------------------------------------------

  describe('toolListingToMcpTool', () => {
    it('should convert a tool listing to an MCP tool definition', () => {
      const listing: ToolListing = {
        name: 'gmail_search',
        description: 'Search Gmail threads by query',
        parameters: {
          query: { type: 'string', description: 'Search query', required: true },
          max: { type: 'number', description: 'Max results' },
        },
      };
      const mcpTool = toolListingToMcpTool(listing);
      expect(mcpTool.name).toBe('gmail_search');
      expect(mcpTool.description).toBe('Search Gmail threads by query');
      expect(mcpTool.inputSchema).toBeDefined();
      expect(mcpTool.inputSchema.type).toBe('object');
      expect(mcpTool.inputSchema.properties['query']).toEqual({
        type: 'string',
        description: 'Search query',
      });
      expect(mcpTool.inputSchema.properties['max']).toEqual({
        type: 'number',
        description: 'Max results',
      });
      expect(mcpTool.inputSchema.required).toEqual(['query']);
    });

    it('should produce an MCP tool with empty properties for no parameters', () => {
      const listing: ToolListing = {
        name: 'gmail_labels',
        description: 'List Gmail labels',
        parameters: {},
      };
      const mcpTool = toolListingToMcpTool(listing);
      expect(mcpTool.name).toBe('gmail_labels');
      expect(mcpTool.description).toBe('List Gmail labels');
      expect(mcpTool.inputSchema).toEqual({ type: 'object', properties: {} });
      expect(mcpTool.inputSchema.required).toBeUndefined();
    });

    it('should preserve array items in the MCP tool inputSchema', () => {
      const listing: ToolListing = {
        name: 'calendar_freebusy',
        description: 'Check availability',
        parameters: {
          calendars: { type: 'array', description: 'Calendar IDs', required: true },
        },
      };
      const mcpTool = toolListingToMcpTool(listing);
      expect(mcpTool.inputSchema.properties['calendars']).toEqual({
        type: 'array',
        description: 'Calendar IDs',
        items: {},
      });
      expect(mcpTool.inputSchema.required).toEqual(['calendars']);
    });
  });
});
