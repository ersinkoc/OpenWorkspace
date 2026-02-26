import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createResourceRegistry,
  registerCalendarResources,
  registerDriveResources,
} from './resources.js';
import type { Resource, ResourceTemplate, ResourceContent, ResourceRegistry } from './resources.js';
import type { HttpClient } from '@openworkspace/core';

// ---------------------------------------------------------------------------
// Mock service packages
// ---------------------------------------------------------------------------

vi.mock('@openworkspace/calendar', () => ({
  calendar: vi.fn(),
}));

vi.mock('@openworkspace/drive', () => ({
  createDriveApi: vi.fn(),
}));

import { calendar as createCalendarApi } from '@openworkspace/calendar';
import { createDriveApi } from '@openworkspace/drive';

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

// ---------------------------------------------------------------------------
// Authenticated Calendar Resources (HttpClient provided)
// ---------------------------------------------------------------------------

describe('registerCalendarResources with HttpClient', () => {
  const mockHttp = {} as HttpClient;
  const mockCalendarApi = {
    listEvents: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createCalendarApi).mockReturnValue(mockCalendarApi as any);
  });

  it('reads calendar://primary/events with real API on success', async () => {
    mockCalendarApi.listEvents.mockResolvedValue({
      ok: true,
      value: { items: [{ id: 'ev1', summary: 'Standup' }] },
    });

    const registry = createResourceRegistry();
    registerCalendarResources(registry, mockHttp);

    const result = await registry.read('calendar://primary/events');
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe('application/json');

    const data = JSON.parse(result!.text!);
    expect(data).toEqual({ items: [{ id: 'ev1', summary: 'Standup' }] });
    expect(mockCalendarApi.listEvents).toHaveBeenCalledWith('primary', expect.objectContaining({
      singleEvents: true,
      orderBy: 'startTime',
    }));
  });

  it('reads calendar://primary/events with real API on error', async () => {
    mockCalendarApi.listEvents.mockResolvedValue({
      ok: false,
      error: { message: 'Calendar auth failed' },
    });

    const registry = createResourceRegistry();
    registerCalendarResources(registry, mockHttp);

    const result = await registry.read('calendar://primary/events');
    expect(result).not.toBeNull();

    const data = JSON.parse(result!.text!);
    expect(data).toEqual({ error: 'Calendar auth failed' });
  });

  it('reads calendar://{calendarId}/events template with real API on success', async () => {
    mockCalendarApi.listEvents.mockResolvedValue({
      ok: true,
      value: { items: [{ id: 'ev2' }] },
    });

    const registry = createResourceRegistry();
    registerCalendarResources(registry, mockHttp);

    const result = await registry.read('calendar://work/events');
    expect(result).not.toBeNull();

    const data = JSON.parse(result!.text!);
    expect(data).toEqual({ items: [{ id: 'ev2' }] });
    expect(mockCalendarApi.listEvents).toHaveBeenCalledWith('work', expect.objectContaining({
      singleEvents: true,
      orderBy: 'startTime',
    }));
  });

  it('reads calendar://{calendarId}/events template with real API on error', async () => {
    mockCalendarApi.listEvents.mockResolvedValue({
      ok: false,
      error: { message: 'Not authorized' },
    });

    const registry = createResourceRegistry();
    registerCalendarResources(registry, mockHttp);

    const result = await registry.read('calendar://work/events');
    expect(result).not.toBeNull();

    const data = JSON.parse(result!.text!);
    expect(data).toEqual({ error: 'Not authorized' });
  });

  it('passes time bounds covering today', async () => {
    mockCalendarApi.listEvents.mockResolvedValue({
      ok: true,
      value: { items: [] },
    });

    const registry = createResourceRegistry();
    registerCalendarResources(registry, mockHttp);

    await registry.read('calendar://primary/events');

    const call = mockCalendarApi.listEvents.mock.calls[0];
    expect(call[1]).toHaveProperty('timeMin');
    expect(call[1]).toHaveProperty('timeMax');
    // timeMin and timeMax should be valid ISO strings
    expect(() => new Date(call[1].timeMin)).not.toThrow();
    expect(() => new Date(call[1].timeMax)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Authenticated Drive Resources (HttpClient provided)
// ---------------------------------------------------------------------------

describe('registerDriveResources with HttpClient', () => {
  const mockHttp = {} as HttpClient;
  const mockDriveApiObj = {
    listFiles: vi.fn(),
    searchFiles: vi.fn(),
    getFile: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createDriveApi).mockReturnValue(mockDriveApiObj as any);
  });

  // -- drive://recent -------------------------------------------------------

  it('reads drive://recent with real API on success', async () => {
    mockDriveApiObj.listFiles.mockResolvedValue({
      ok: true,
      value: { files: [{ id: 'f1', name: 'report.doc' }] },
    });

    const registry = createResourceRegistry();
    registerDriveResources(registry, mockHttp);

    const result = await registry.read('drive://recent');
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe('application/json');

    const data = JSON.parse(result!.text!);
    expect(data).toEqual({ files: [{ id: 'f1', name: 'report.doc' }] });
    expect(mockDriveApiObj.listFiles).toHaveBeenCalledWith({
      orderBy: 'modifiedTime desc',
      pageSize: 10,
    });
  });

  it('reads drive://recent with real API on error', async () => {
    mockDriveApiObj.listFiles.mockResolvedValue({
      ok: false,
      error: { message: 'Drive auth failed' },
    });

    const registry = createResourceRegistry();
    registerDriveResources(registry, mockHttp);

    const result = await registry.read('drive://recent');
    expect(result).not.toBeNull();

    const data = JSON.parse(result!.text!);
    expect(data).toEqual({ error: 'Drive auth failed' });
  });

  // -- drive://shared -------------------------------------------------------

  it('reads drive://shared with real API on success', async () => {
    mockDriveApiObj.searchFiles.mockResolvedValue({
      ok: true,
      value: { files: [{ id: 'f2', name: 'shared.doc' }] },
    });

    const registry = createResourceRegistry();
    registerDriveResources(registry, mockHttp);

    const result = await registry.read('drive://shared');
    expect(result).not.toBeNull();

    const data = JSON.parse(result!.text!);
    expect(data).toEqual({ files: [{ id: 'f2', name: 'shared.doc' }] });
    expect(mockDriveApiObj.searchFiles).toHaveBeenCalledWith('sharedWithMe=true', {
      pageSize: 10,
    });
  });

  it('reads drive://shared with real API on error', async () => {
    mockDriveApiObj.searchFiles.mockResolvedValue({
      ok: false,
      error: { message: 'Shared error' },
    });

    const registry = createResourceRegistry();
    registerDriveResources(registry, mockHttp);

    const result = await registry.read('drive://shared');
    expect(result).not.toBeNull();

    const data = JSON.parse(result!.text!);
    expect(data).toEqual({ error: 'Shared error' });
  });

  // -- drive://{fileId}/metadata --------------------------------------------

  it('reads drive://{fileId}/metadata with real API on success', async () => {
    mockDriveApiObj.getFile.mockResolvedValue({
      ok: true,
      value: { id: 'f3', name: 'readme.md', mimeType: 'text/markdown' },
    });

    const registry = createResourceRegistry();
    registerDriveResources(registry, mockHttp);

    const result = await registry.read('drive://f3/metadata');
    expect(result).not.toBeNull();

    const data = JSON.parse(result!.text!);
    expect(data).toEqual({ id: 'f3', name: 'readme.md', mimeType: 'text/markdown' });
    expect(mockDriveApiObj.getFile).toHaveBeenCalledWith('f3');
  });

  it('reads drive://{fileId}/metadata with real API on error', async () => {
    mockDriveApiObj.getFile.mockResolvedValue({
      ok: false,
      error: { message: 'File not found' },
    });

    const registry = createResourceRegistry();
    registerDriveResources(registry, mockHttp);

    const result = await registry.read('drive://badid/metadata');
    expect(result).not.toBeNull();

    const data = JSON.parse(result!.text!);
    expect(data).toEqual({ error: 'File not found' });
  });
});
