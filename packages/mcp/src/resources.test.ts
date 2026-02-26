import { describe, it, expect } from 'vitest';
import {
  createResourceRegistry,
  registerCalendarResources,
  registerDriveResources,
} from './resources.js';
import type { Resource, ResourceTemplate, ResourceContent } from './resources.js';

describe('createResourceRegistry', () => {
  it('creates an empty registry', () => {
    const registry = createResourceRegistry();
    expect(registry.listResources()).toEqual([]);
    expect(registry.listTemplates()).toEqual([]);
  });

  it('returns null when reading unknown URI', async () => {
    const registry = createResourceRegistry();
    const result = await registry.read('unknown://foo');
    expect(result).toBeNull();
  });
});

describe('registerResource', () => {
  it('registers a static resource', () => {
    const registry = createResourceRegistry();
    const resource: Resource = {
      uri: 'test://data',
      name: 'Test',
      description: 'Test resource',
      mimeType: 'application/json',
    };
    registry.registerResource(resource, async (uri) => ({
      uri,
      mimeType: 'application/json',
      text: '{"ok":true}',
    }));

    expect(registry.listResources()).toHaveLength(1);
    expect(registry.listResources()[0]?.uri).toBe('test://data');
  });

  it('reads a static resource by exact URI', async () => {
    const registry = createResourceRegistry();
    registry.registerResource(
      { uri: 'test://hello', name: 'Hello', description: 'Greeting', mimeType: 'text/plain' },
      async (uri) => ({ uri, mimeType: 'text/plain', text: 'Hello!' }),
    );

    const result = await registry.read('test://hello');
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Hello!');
    expect(result!.mimeType).toBe('text/plain');
  });
});

describe('registerTemplate', () => {
  it('registers a template', () => {
    const registry = createResourceRegistry();
    const template: ResourceTemplate = {
      uriTemplate: 'items://{itemId}/details',
      name: 'Item Details',
      description: 'Get item details',
      mimeType: 'application/json',
    };
    registry.registerTemplate(template, async (uri, params) => ({
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(params),
    }));

    expect(registry.listTemplates()).toHaveLength(1);
    expect(registry.listTemplates()[0]?.uriTemplate).toBe('items://{itemId}/details');
  });

  it('matches a concrete URI against template and extracts params', async () => {
    const registry = createResourceRegistry();
    registry.registerTemplate(
      {
        uriTemplate: 'users://{userId}/profile',
        name: 'User Profile',
        description: 'User profile',
        mimeType: 'application/json',
      },
      async (uri, params) => ({
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ userId: params['userId'] }),
      }),
    );

    const result = await registry.read('users://42/profile');
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!.text!);
    expect(parsed.userId).toBe('42');
  });

  it('returns null for non-matching URIs', async () => {
    const registry = createResourceRegistry();
    registry.registerTemplate(
      {
        uriTemplate: 'a://{id}/b',
        name: 'Test',
        description: 'Test',
        mimeType: 'text/plain',
      },
      async (uri) => ({ uri, mimeType: 'text/plain', text: '' }),
    );

    expect(await registry.read('a://x/c')).toBeNull();
    expect(await registry.read('a://x/b/extra')).toBeNull();
  });

  it('static resource takes priority over template', async () => {
    const registry = createResourceRegistry();
    registry.registerResource(
      { uri: 'ns://primary/items', name: 'Static', description: 'Static', mimeType: 'text/plain' },
      async (uri) => ({ uri, mimeType: 'text/plain', text: 'static' }),
    );
    registry.registerTemplate(
      { uriTemplate: 'ns://{id}/items', name: 'Template', description: 'Template', mimeType: 'text/plain' },
      async (uri) => ({ uri, mimeType: 'text/plain', text: 'template' }),
    );

    const result = await registry.read('ns://primary/items');
    expect(result!.text).toBe('static');
  });

  it('multiple templates can coexist', () => {
    const registry = createResourceRegistry();
    registry.registerTemplate(
      { uriTemplate: 'a://{x}', name: 'A', description: 'A', mimeType: 'text/plain' },
      async (uri) => ({ uri, mimeType: 'text/plain', text: '' }),
    );
    registry.registerTemplate(
      { uriTemplate: 'b://{y}/info', name: 'B', description: 'B', mimeType: 'text/plain' },
      async (uri) => ({ uri, mimeType: 'text/plain', text: '' }),
    );
    expect(registry.listTemplates()).toHaveLength(2);
  });
});

describe('registerCalendarResources', () => {
  it('registers calendar resources', () => {
    const registry = createResourceRegistry();
    registerCalendarResources(registry);

    const resources = registry.listResources();
    const templates = registry.listTemplates();

    expect(resources.length).toBeGreaterThanOrEqual(1);
    expect(templates.length).toBeGreaterThanOrEqual(1);
  });

  it('can read calendar://primary/events', async () => {
    const registry = createResourceRegistry();
    registerCalendarResources(registry);

    const result = await registry.read('calendar://primary/events');
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe('application/json');
    expect(result!.text).toBeDefined();

    const data = JSON.parse(result!.text!);
    expect(data.calendarId).toBe('primary');
  });

  it('can read calendar://work/events via template', async () => {
    const registry = createResourceRegistry();
    registerCalendarResources(registry);

    const result = await registry.read('calendar://work/events');
    expect(result).not.toBeNull();
    const data = JSON.parse(result!.text!);
    expect(data.calendarId).toBe('work');
  });
});

describe('registerDriveResources', () => {
  it('registers drive resources', () => {
    const registry = createResourceRegistry();
    registerDriveResources(registry);

    const resources = registry.listResources();
    const templates = registry.listTemplates();

    expect(resources.length).toBeGreaterThanOrEqual(2);
    expect(templates.length).toBeGreaterThanOrEqual(1);
  });

  it('can read drive://recent', async () => {
    const registry = createResourceRegistry();
    registerDriveResources(registry);

    const result = await registry.read('drive://recent');
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe('application/json');
    const data = JSON.parse(result!.text!);
    expect(data).toHaveProperty('files');
  });

  it('can read drive://shared', async () => {
    const registry = createResourceRegistry();
    registerDriveResources(registry);

    const result = await registry.read('drive://shared');
    expect(result).not.toBeNull();
    const data = JSON.parse(result!.text!);
    expect(data).toHaveProperty('files');
  });

  it('can read drive://abc123/metadata via template', async () => {
    const registry = createResourceRegistry();
    registerDriveResources(registry);

    const result = await registry.read('drive://abc123/metadata');
    expect(result).not.toBeNull();
    const data = JSON.parse(result!.text!);
    expect(data.fileId).toBe('abc123');
  });
});
