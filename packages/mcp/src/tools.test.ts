import { describe, it, expect, beforeEach } from 'vitest';
import { createToolRegistry } from './registry.js';
import { registerServiceTools } from './tools.js';
import type { ToolRegistry } from './registry.js';

/** The complete list of tools that registerServiceTools should register. */
const ALL_TOOL_NAMES = [
  // Gmail
  'gmail_search',
  'gmail_read',
  'gmail_send',
  'gmail_labels',
  // Calendar
  'calendar_events',
  'calendar_create',
  'calendar_freebusy',
  // Drive
  'drive_search',
  'drive_read',
  'drive_upload',
  // Sheets
  'sheets_read',
  'sheets_write',
  // Tasks
  'tasks_list',
  'tasks_create',
  'tasks_complete',
  // Contacts
  'contacts_search',
  // Docs
  'docs_get',
  'docs_create',
  // Slides
  'slides_get',
  'slides_create',
  // Classroom
  'classroom_courses',
  // Forms
  'forms_get',
  // Chat
  'chat_send',
  // Keep
  'keep_list',
  // Apps Script
  'appscript_run',
  // People
  'people_me',
  // Groups
  'groups_list',
  // Workspace
  'workspace_search',
] as const;

const STUB_MESSAGE = 'Tool requires authentication. Configure with ows auth add <email>.';

describe('tools', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = createToolRegistry();
    registerServiceTools(registry);
  });

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  describe('registration', () => {
    it('should register exactly 28 tools', () => {
      expect(registry.count()).toBe(28);
    });

    it.each(ALL_TOOL_NAMES)('should register %s', (name) => {
      expect(registry.has(name)).toBe(true);
    });

    it('should expose all tools via list()', () => {
      const names = registry.list().map((t) => t.name).sort();
      expect(names).toEqual([...ALL_TOOL_NAMES].sort());
    });
  });

  // ---------------------------------------------------------------------------
  // Stub handler invocations
  // ---------------------------------------------------------------------------

  describe('stub handlers', () => {
    it.each([
      ['gmail_search', { query: 'from:me' }],
      ['gmail_read', { threadId: '12345' }],
      ['gmail_send', { to: 'a@b.com', subject: 'Hi', body: 'Hello' }],
      ['gmail_labels', {}],
      ['calendar_events', {}],
      ['calendar_create', { summary: 'Meeting', start: '2025-01-01T10:00:00Z', end: '2025-01-01T11:00:00Z' }],
      ['calendar_freebusy', { calendars: ['primary'], from: '2025-01-01T00:00:00Z', to: '2025-01-02T00:00:00Z' }],
      ['drive_search', { query: 'budget' }],
      ['drive_read', { fileId: 'abc123' }],
      ['drive_upload', { content: 'data', name: 'file.txt' }],
      ['sheets_read', { spreadsheetId: 'sid1', range: 'Sheet1!A1:B2' }],
      ['sheets_write', { spreadsheetId: 'sid1', range: 'Sheet1!A1', values: [['a', 'b']] }],
      // Tasks
      ['tasks_list', { tasklistId: 'tl1' }],
      ['tasks_create', { tasklistId: 'tl1', title: 'Buy milk' }],
      ['tasks_complete', { tasklistId: 'tl1', taskId: 't1' }],
      // Contacts
      ['contacts_search', { query: 'John' }],
      // Docs
      ['docs_get', { documentId: 'doc1' }],
      ['docs_create', { title: 'My Doc' }],
      // Slides
      ['slides_get', { presentationId: 'pres1' }],
      ['slides_create', { title: 'My Slides' }],
      // Classroom
      ['classroom_courses', {}],
      // Forms
      ['forms_get', { formId: 'form1' }],
      // Chat
      ['chat_send', { spaceName: 'spaces/abc', text: 'Hello' }],
      // Keep
      ['keep_list', {}],
      // Apps Script
      ['appscript_run', { scriptId: 'script1', function: 'myFunc' }],
      // People
      ['people_me', {}],
      // Groups
      ['groups_list', {}],
      // Workspace
      ['workspace_search', { query: 'budget report' }],
    ] as const)('%s should return stub message', async (name, params) => {
      const result = await registry.invoke(name, { ...params });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
        expect(result.value.data).toEqual({ message: STUB_MESSAGE });
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Parameter validation
  // ---------------------------------------------------------------------------

  describe('parameter validation', () => {
    // Gmail
    it('gmail_search should fail without query', async () => {
      const result = await registry.invoke('gmail_search', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'query' is required");
      }
    });

    it('gmail_read should fail without threadId', async () => {
      const result = await registry.invoke('gmail_read', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'threadId' is required");
      }
    });

    it('gmail_send should fail without to', async () => {
      const result = await registry.invoke('gmail_send', { subject: 'Hi', body: 'Hello' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'to' is required");
      }
    });

    it('gmail_send should fail without subject', async () => {
      const result = await registry.invoke('gmail_send', { to: 'a@b.com', body: 'Hello' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'subject' is required");
      }
    });

    it('gmail_send should fail without body', async () => {
      const result = await registry.invoke('gmail_send', { to: 'a@b.com', subject: 'Hi' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'body' is required");
      }
    });

    // Calendar
    it('calendar_create should fail without summary', async () => {
      const result = await registry.invoke('calendar_create', {
        start: '2025-01-01T10:00:00Z',
        end: '2025-01-01T11:00:00Z',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'summary' is required");
      }
    });

    it('calendar_create should fail without start', async () => {
      const result = await registry.invoke('calendar_create', {
        summary: 'Meeting',
        end: '2025-01-01T11:00:00Z',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'start' is required");
      }
    });

    it('calendar_create should fail without end', async () => {
      const result = await registry.invoke('calendar_create', {
        summary: 'Meeting',
        start: '2025-01-01T10:00:00Z',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'end' is required");
      }
    });

    it('calendar_freebusy should fail without calendars', async () => {
      const result = await registry.invoke('calendar_freebusy', {
        from: '2025-01-01T00:00:00Z',
        to: '2025-01-02T00:00:00Z',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'calendars' is required");
      }
    });

    it('calendar_freebusy should fail without from', async () => {
      const result = await registry.invoke('calendar_freebusy', {
        calendars: ['primary'],
        to: '2025-01-02T00:00:00Z',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'from' is required");
      }
    });

    it('calendar_freebusy should fail without to', async () => {
      const result = await registry.invoke('calendar_freebusy', {
        calendars: ['primary'],
        from: '2025-01-01T00:00:00Z',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'to' is required");
      }
    });

    // Drive
    it('drive_search should fail without query', async () => {
      const result = await registry.invoke('drive_search', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'query' is required");
      }
    });

    it('drive_read should fail without fileId', async () => {
      const result = await registry.invoke('drive_read', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'fileId' is required");
      }
    });

    it('drive_upload should fail without content', async () => {
      const result = await registry.invoke('drive_upload', { name: 'file.txt' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'content' is required");
      }
    });

    it('drive_upload should fail without name', async () => {
      const result = await registry.invoke('drive_upload', { content: 'data' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'name' is required");
      }
    });

    // Sheets
    it('sheets_read should fail without spreadsheetId', async () => {
      const result = await registry.invoke('sheets_read', { range: 'A1:B2' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'spreadsheetId' is required");
      }
    });

    it('sheets_read should fail without range', async () => {
      const result = await registry.invoke('sheets_read', { spreadsheetId: 'sid1' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'range' is required");
      }
    });

    it('sheets_write should fail without spreadsheetId', async () => {
      const result = await registry.invoke('sheets_write', { range: 'A1', values: [['x']] });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'spreadsheetId' is required");
      }
    });

    it('sheets_write should fail without range', async () => {
      const result = await registry.invoke('sheets_write', { spreadsheetId: 'sid1', values: [['x']] });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'range' is required");
      }
    });

    it('sheets_write should fail without values', async () => {
      const result = await registry.invoke('sheets_write', { spreadsheetId: 'sid1', range: 'A1' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'values' is required");
      }
    });

    // Tasks
    it('tasks_list should fail without tasklistId', async () => {
      const result = await registry.invoke('tasks_list', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'tasklistId' is required");
      }
    });

    it('tasks_create should fail without tasklistId', async () => {
      const result = await registry.invoke('tasks_create', { title: 'Buy milk' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'tasklistId' is required");
      }
    });

    it('tasks_create should fail without title', async () => {
      const result = await registry.invoke('tasks_create', { tasklistId: 'tl1' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'title' is required");
      }
    });

    it('tasks_complete should fail without tasklistId', async () => {
      const result = await registry.invoke('tasks_complete', { taskId: 't1' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'tasklistId' is required");
      }
    });

    it('tasks_complete should fail without taskId', async () => {
      const result = await registry.invoke('tasks_complete', { tasklistId: 'tl1' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'taskId' is required");
      }
    });

    // Contacts
    it('contacts_search should fail without query', async () => {
      const result = await registry.invoke('contacts_search', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'query' is required");
      }
    });

    // Docs
    it('docs_get should fail without documentId', async () => {
      const result = await registry.invoke('docs_get', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'documentId' is required");
      }
    });

    it('docs_create should fail without title', async () => {
      const result = await registry.invoke('docs_create', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'title' is required");
      }
    });

    // Slides
    it('slides_get should fail without presentationId', async () => {
      const result = await registry.invoke('slides_get', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'presentationId' is required");
      }
    });

    it('slides_create should fail without title', async () => {
      const result = await registry.invoke('slides_create', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'title' is required");
      }
    });

    // Forms
    it('forms_get should fail without formId', async () => {
      const result = await registry.invoke('forms_get', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'formId' is required");
      }
    });

    // Chat
    it('chat_send should fail without spaceName', async () => {
      const result = await registry.invoke('chat_send', { text: 'Hello' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'spaceName' is required");
      }
    });

    it('chat_send should fail without text', async () => {
      const result = await registry.invoke('chat_send', { spaceName: 'spaces/abc' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'text' is required");
      }
    });

    // Apps Script
    it('appscript_run should fail without scriptId', async () => {
      const result = await registry.invoke('appscript_run', { function: 'myFunc' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'scriptId' is required");
      }
    });

    it('appscript_run should fail without function', async () => {
      const result = await registry.invoke('appscript_run', { scriptId: 'script1' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'function' is required");
      }
    });

    // Workspace
    it('workspace_search should fail without query', async () => {
      const result = await registry.invoke('workspace_search', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("'query' is required");
      }
    });

    // Type validation
    it('gmail_search should fail with wrong type for query', async () => {
      const result = await registry.invoke('gmail_search', { query: 123 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('must be of type string');
      }
    });

    it('gmail_search should fail with wrong type for max', async () => {
      const result = await registry.invoke('gmail_search', { query: 'test', max: 'ten' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('must be of type number');
      }
    });

    it('gmail_read should fail with wrong type for includeBody', async () => {
      const result = await registry.invoke('gmail_read', { threadId: '123', includeBody: 'yes' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('must be of type boolean');
      }
    });

    it('calendar_freebusy should fail with wrong type for calendars', async () => {
      const result = await registry.invoke('calendar_freebusy', {
        calendars: 'primary',
        from: '2025-01-01T00:00:00Z',
        to: '2025-01-02T00:00:00Z',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('must be of type array');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Optional parameters
  // ---------------------------------------------------------------------------

  describe('optional parameters', () => {
    it('gmail_search should accept optional max', async () => {
      const result = await registry.invoke('gmail_search', { query: 'test', max: 5 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
      }
    });

    it('gmail_read should accept optional includeBody', async () => {
      const result = await registry.invoke('gmail_read', { threadId: '123', includeBody: true });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
      }
    });

    it('gmail_send should accept optional html', async () => {
      const result = await registry.invoke('gmail_send', {
        to: 'a@b.com',
        subject: 'Hi',
        body: '<h1>Hello</h1>',
        html: true,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
      }
    });

    it('calendar_events should work with no parameters', async () => {
      const result = await registry.invoke('calendar_events', {});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
      }
    });

    it('calendar_create should accept optional attendees and location', async () => {
      const result = await registry.invoke('calendar_create', {
        summary: 'Meeting',
        start: '2025-01-01T10:00:00Z',
        end: '2025-01-01T11:00:00Z',
        attendees: ['a@b.com'],
        location: 'Room 101',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
      }
    });

    it('drive_upload should accept optional mimeType and parent', async () => {
      const result = await registry.invoke('drive_upload', {
        content: 'data',
        name: 'file.txt',
        mimeType: 'text/plain',
        parent: 'folder123',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Tool metadata
  // ---------------------------------------------------------------------------

  describe('tool metadata', () => {
    it('each tool should have a non-empty description', () => {
      for (const name of ALL_TOOL_NAMES) {
        const tool = registry.get(name);
        expect(tool).toBeDefined();
        expect(tool!.description.length).toBeGreaterThan(0);
      }
    });

    it('required parameters should be marked required', () => {
      const tool = registry.get('gmail_send')!;
      expect(tool.parameters.to.required).toBe(true);
      expect(tool.parameters.subject.required).toBe(true);
      expect(tool.parameters.body.required).toBe(true);
      expect(tool.parameters.html?.required).toBeUndefined();
    });

    it('gmail_labels should have no parameters', () => {
      const tool = registry.get('gmail_labels')!;
      expect(Object.keys(tool.parameters)).toHaveLength(0);
    });
  });
});
