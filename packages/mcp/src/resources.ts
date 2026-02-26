/**
 * MCP Resources for OpenWorkspace.
 *
 * Resources are URI-addressable data that AI agents can read.
 * This module provides a resource registry with support for both
 * static resources (fixed URIs) and resource templates (parameterized URIs).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * MCP Resource definition.
 */
export type Resource = {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
};

/**
 * Resource template definition (parameterized URI).
 */
export type ResourceTemplate = {
  uriTemplate: string;
  name: string;
  description: string;
  mimeType: string;
};

/**
 * Resource read result.
 */
export type ResourceContent = {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string; // base64
};

/**
 * Resource handler function.
 */
export type ResourceHandler = (uri: string, params: Record<string, string>) => Promise<ResourceContent>;

/**
 * Resource registry.
 */
export type ResourceRegistry = {
  registerResource(resource: Resource, handler: ResourceHandler): void;
  registerTemplate(template: ResourceTemplate, handler: ResourceHandler): void;
  listResources(): Resource[];
  listTemplates(): ResourceTemplate[];
  read(uri: string): Promise<ResourceContent | null>;
};

// ---------------------------------------------------------------------------
// Template Matching Helpers
// ---------------------------------------------------------------------------

/**
 * Attempts to match a URI against a template URI pattern.
 * Template URIs use `{paramName}` placeholders.
 * Returns extracted params if matched, or null if no match.
 *
 * @example
 * matchTemplate('calendar://primary/events', 'calendar://{calendarId}/events')
 * // => { calendarId: 'primary' }
 */
function matchTemplate(
  uri: string,
  uriTemplate: string,
): Record<string, string> | null {
  // Split both the URI and template into segments by '/'
  const uriParts = uri.split('/');
  const templateParts = uriTemplate.split('/');

  if (uriParts.length !== templateParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < templateParts.length; i++) {
    const tPart = templateParts[i] as string;
    const uPart = uriParts[i] as string;

    // Check if this segment is a parameter placeholder
    const paramMatch = tPart.match(/^\{(\w+)\}$/);
    if (paramMatch) {
      params[paramMatch[1] as string] = uPart;
    } else if (tPart !== uPart) {
      return null;
    }
  }

  return params;
}

// ---------------------------------------------------------------------------
// Registry Factory
// ---------------------------------------------------------------------------

/**
 * Creates a new resource registry.
 *
 * @example
 * ```ts
 * const registry = createResourceRegistry();
 * registry.registerResource(
 *   { uri: 'drive://recent', name: 'Recent files', description: '...', mimeType: 'application/json' },
 *   async (uri) => ({ uri, mimeType: 'application/json', text: '[]' }),
 * );
 * const content = await registry.read('drive://recent');
 * ```
 */
export function createResourceRegistry(): ResourceRegistry {
  const resources = new Map<string, { resource: Resource; handler: ResourceHandler }>();
  const templates = new Map<string, { template: ResourceTemplate; handler: ResourceHandler }>();

  return {
    registerResource(resource: Resource, handler: ResourceHandler): void {
      resources.set(resource.uri, { resource, handler });
    },

    registerTemplate(template: ResourceTemplate, handler: ResourceHandler): void {
      templates.set(template.uriTemplate, { template, handler });
    },

    listResources(): Resource[] {
      return Array.from(resources.values()).map((entry) => entry.resource);
    },

    listTemplates(): ResourceTemplate[] {
      return Array.from(templates.values()).map((entry) => entry.template);
    },

    async read(uri: string): Promise<ResourceContent | null> {
      // First, try an exact match against static resources
      const staticEntry = resources.get(uri);
      if (staticEntry) {
        return staticEntry.handler(uri, {});
      }

      // Then, try matching against templates
      for (const [, entry] of templates) {
        const params = matchTemplate(uri, entry.template.uriTemplate);
        if (params !== null) {
          return entry.handler(uri, params);
        }
      }

      return null;
    },
  };
}

// ---------------------------------------------------------------------------
// Calendar Resources
// ---------------------------------------------------------------------------

/**
 * Registers calendar-related resources.
 *
 * Static resources:
 * - `calendar://primary/events` — today's events from the primary calendar
 *
 * Template resources:
 * - `calendar://{calendarId}/events` — events for a specific calendar
 */
export function registerCalendarResources(registry: ResourceRegistry): void {
  // Static: primary calendar events
  registry.registerResource(
    {
      uri: 'calendar://primary/events',
      name: 'Primary Calendar Events',
      description: "Today's events from the primary Google Calendar",
      mimeType: 'application/json',
    },
    async (uri: string, _params: Record<string, string>): Promise<ResourceContent> => {
      // TODO: Replace with actual Google Calendar API call
      // e.g. calendar.events.list({ calendarId: 'primary', timeMin, timeMax })
      const placeholder = {
        calendarId: 'primary',
        date: new Date().toISOString().slice(0, 10),
        events: [],
        _note: 'Placeholder — wire up Google Calendar API here',
      };

      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(placeholder, null, 2),
      };
    },
  );

  // Template: events for any calendar
  registry.registerTemplate(
    {
      uriTemplate: 'calendar://{calendarId}/events',
      name: 'Calendar Events',
      description: 'Events for a specific Google Calendar',
      mimeType: 'application/json',
    },
    async (uri: string, params: Record<string, string>): Promise<ResourceContent> => {
      // TODO: Replace with actual Google Calendar API call
      // e.g. calendar.events.list({ calendarId: params.calendarId, timeMin, timeMax })
      const placeholder = {
        calendarId: params['calendarId'],
        date: new Date().toISOString().slice(0, 10),
        events: [],
        _note: 'Placeholder — wire up Google Calendar API here',
      };

      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(placeholder, null, 2),
      };
    },
  );
}

// ---------------------------------------------------------------------------
// Drive Resources
// ---------------------------------------------------------------------------

/**
 * Registers Google Drive-related resources.
 *
 * Static resources:
 * - `drive://recent` — recently modified files
 * - `drive://shared` — files shared with me
 *
 * Template resources:
 * - `drive://{fileId}/metadata` — metadata for a specific file
 */
export function registerDriveResources(registry: ResourceRegistry): void {
  // Static: recently modified files
  registry.registerResource(
    {
      uri: 'drive://recent',
      name: 'Recent Drive Files',
      description: 'Recently modified files in Google Drive',
      mimeType: 'application/json',
    },
    async (uri: string, _params: Record<string, string>): Promise<ResourceContent> => {
      // TODO: Replace with actual Google Drive API call
      // e.g. drive.files.list({ orderBy: 'modifiedTime desc', pageSize: 10 })
      const placeholder = {
        files: [],
        _note: 'Placeholder — wire up Google Drive API here',
      };

      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(placeholder, null, 2),
      };
    },
  );

  // Static: shared with me
  registry.registerResource(
    {
      uri: 'drive://shared',
      name: 'Shared Drive Files',
      description: 'Files shared with me in Google Drive',
      mimeType: 'application/json',
    },
    async (uri: string, _params: Record<string, string>): Promise<ResourceContent> => {
      // TODO: Replace with actual Google Drive API call
      // e.g. drive.files.list({ q: "sharedWithMe=true", pageSize: 10 })
      const placeholder = {
        files: [],
        _note: 'Placeholder — wire up Google Drive API here',
      };

      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(placeholder, null, 2),
      };
    },
  );

  // Template: file metadata by ID
  registry.registerTemplate(
    {
      uriTemplate: 'drive://{fileId}/metadata',
      name: 'Drive File Metadata',
      description: 'Metadata for a specific Google Drive file',
      mimeType: 'application/json',
    },
    async (uri: string, params: Record<string, string>): Promise<ResourceContent> => {
      // TODO: Replace with actual Google Drive API call
      // e.g. drive.files.get({ fileId: params.fileId, fields: '*' })
      const placeholder = {
        fileId: params['fileId'],
        name: null,
        mimeType: null,
        modifiedTime: null,
        _note: 'Placeholder — wire up Google Drive API here',
      };

      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(placeholder, null, 2),
      };
    },
  );
}
