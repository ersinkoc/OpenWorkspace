import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createToolRegistry } from './registry.js';
import { registerServiceTools } from './tools.js';
import type { ToolRegistry } from './registry.js';
import type { HttpClient } from '@openworkspace/core';

// ---------------------------------------------------------------------------
// Mock all 15 service packages
// ---------------------------------------------------------------------------

vi.mock('@openworkspace/gmail', () => ({
  createGmailApi: vi.fn(),
}));
vi.mock('@openworkspace/calendar', () => ({
  calendar: vi.fn(),
}));
vi.mock('@openworkspace/drive', () => ({
  createDriveApi: vi.fn(),
}));
vi.mock('@openworkspace/sheets', () => ({
  createSheetsApi: vi.fn(),
}));
vi.mock('@openworkspace/tasks', () => ({
  tasks: vi.fn(),
}));
vi.mock('@openworkspace/contacts', () => ({
  contacts: vi.fn(),
}));
vi.mock('@openworkspace/docs', () => ({
  createDocsApi: vi.fn(),
}));
vi.mock('@openworkspace/slides', () => ({
  slides: vi.fn(),
}));
vi.mock('@openworkspace/classroom', () => ({
  classroom: vi.fn(),
}));
vi.mock('@openworkspace/forms', () => ({
  createFormsApi: vi.fn(),
}));
vi.mock('@openworkspace/chat', () => ({
  chat: vi.fn(),
}));
vi.mock('@openworkspace/keep', () => ({
  keep: vi.fn(),
}));
vi.mock('@openworkspace/appscript', () => ({
  appscript: vi.fn(),
}));
vi.mock('@openworkspace/people', () => ({
  people: vi.fn(),
}));
vi.mock('@openworkspace/groups', () => ({
  groups: vi.fn(),
}));

import { createGmailApi } from '@openworkspace/gmail';
import { calendar as createCalendarApi } from '@openworkspace/calendar';
import { createDriveApi } from '@openworkspace/drive';
import { createSheetsApi } from '@openworkspace/sheets';
import { tasks as createTasksApi } from '@openworkspace/tasks';
import { contacts as createContactsApi } from '@openworkspace/contacts';
import { createDocsApi } from '@openworkspace/docs';
import { slides as createSlidesApi } from '@openworkspace/slides';
import { classroom as createClassroomApi } from '@openworkspace/classroom';
import { createFormsApi } from '@openworkspace/forms';
import { chat as createChatApi } from '@openworkspace/chat';
import { keep as createKeepApi } from '@openworkspace/keep';
import { appscript as createAppScriptApi } from '@openworkspace/appscript';
import { people as createPeopleApi } from '@openworkspace/people';
import { groups as createGroupsApi } from '@openworkspace/groups';

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

// ---------------------------------------------------------------------------
// Authenticated handlers (HttpClient provided)
// ---------------------------------------------------------------------------

describe('tools with HttpClient (authenticated)', () => {
  let registry: ToolRegistry;
  const mockHttp = {} as HttpClient;

  // Mock API instances -- each service method is a vi.fn()
  const mockGmailApi = {
    searchMessages: vi.fn(),
    getThread: vi.fn(),
    sendMessage: vi.fn(),
    listLabels: vi.fn(),
  };

  const mockCalendarApi = {
    listEvents: vi.fn(),
    createEvent: vi.fn(),
    queryFreeBusy: vi.fn(),
    searchEvents: vi.fn(),
  };

  const mockDriveApi = {
    searchFiles: vi.fn(),
    getFile: vi.fn(),
    uploadFile: vi.fn(),
  };

  const mockSheetsApi = {
    getValues: vi.fn(),
    updateValues: vi.fn(),
  };

  const mockTasksApi = {
    listTasks: vi.fn(),
    createTask: vi.fn(),
    completeTask: vi.fn(),
  };

  const mockContactsApi = {
    searchContacts: vi.fn(),
  };

  const mockDocsApi = {
    getDocument: vi.fn(),
    createDocument: vi.fn(),
  };

  const mockSlidesApi = {
    getPresentation: vi.fn(),
    createPresentation: vi.fn(),
  };

  const mockClassroomApi = {
    listCourses: vi.fn(),
  };

  const mockFormsApi = {
    getForm: vi.fn(),
  };

  const mockChatApi = {
    sendMessage: vi.fn(),
  };

  const mockKeepApi = {
    listNotes: vi.fn(),
  };

  const mockAppScriptApi = {
    runFunction: vi.fn(),
  };

  const mockPeopleApi = {
    getProfile: vi.fn(),
  };

  const mockGroupsApi = {
    listGroups: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Wire mock factories to return our mock API objects
    vi.mocked(createGmailApi).mockReturnValue(mockGmailApi as any);
    vi.mocked(createCalendarApi).mockReturnValue(mockCalendarApi as any);
    vi.mocked(createDriveApi).mockReturnValue(mockDriveApi as any);
    vi.mocked(createSheetsApi).mockReturnValue(mockSheetsApi as any);
    vi.mocked(createTasksApi).mockReturnValue(mockTasksApi as any);
    vi.mocked(createContactsApi).mockReturnValue(mockContactsApi as any);
    vi.mocked(createDocsApi).mockReturnValue(mockDocsApi as any);
    vi.mocked(createSlidesApi).mockReturnValue(mockSlidesApi as any);
    vi.mocked(createClassroomApi).mockReturnValue(mockClassroomApi as any);
    vi.mocked(createFormsApi).mockReturnValue(mockFormsApi as any);
    vi.mocked(createChatApi).mockReturnValue(mockChatApi as any);
    vi.mocked(createKeepApi).mockReturnValue(mockKeepApi as any);
    vi.mocked(createAppScriptApi).mockReturnValue(mockAppScriptApi as any);
    vi.mocked(createPeopleApi).mockReturnValue(mockPeopleApi as any);
    vi.mocked(createGroupsApi).mockReturnValue(mockGroupsApi as any);

    registry = createToolRegistry();
    registerServiceTools(registry, mockHttp);
  });

  // -----------------------------------------------------------------------
  // Gmail
  // -----------------------------------------------------------------------

  describe('gmail tools', () => {
    it('gmail_search returns results on success', async () => {
      mockGmailApi.searchMessages.mockResolvedValue({
        ok: true,
        value: { messages: [{ id: 'm1' }] },
      });

      const result = await registry.invoke('gmail_search', { query: 'from:me' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
        expect(result.value.data).toEqual({ messages: [{ id: 'm1' }] });
      }
      expect(mockGmailApi.searchMessages).toHaveBeenCalledWith({
        q: 'from:me',
        maxResults: undefined,
      });
    });

    it('gmail_search returns error on failure', async () => {
      mockGmailApi.searchMessages.mockResolvedValue({
        ok: false,
        error: { message: 'Auth failed' },
      });

      const result = await registry.invoke('gmail_search', { query: 'test' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Auth failed' });
      }
    });

    it('gmail_search passes max parameter', async () => {
      mockGmailApi.searchMessages.mockResolvedValue({
        ok: true,
        value: { messages: [] },
      });

      await registry.invoke('gmail_search', { query: 'test', max: 5 });
      expect(mockGmailApi.searchMessages).toHaveBeenCalledWith({
        q: 'test',
        maxResults: 5,
      });
    });

    it('gmail_read calls getThread with format metadata', async () => {
      mockGmailApi.getThread.mockResolvedValue({
        ok: true,
        value: { id: 't1', messages: [] },
      });

      const result = await registry.invoke('gmail_read', { threadId: 't1' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ id: 't1', messages: [] });
      }
      expect(mockGmailApi.getThread).toHaveBeenCalledWith({
        id: 't1',
        format: 'metadata',
      });
    });

    it('gmail_read uses full format when includeBody is true', async () => {
      mockGmailApi.getThread.mockResolvedValue({
        ok: true,
        value: { id: 't1', messages: [] },
      });

      await registry.invoke('gmail_read', { threadId: 't1', includeBody: true });
      expect(mockGmailApi.getThread).toHaveBeenCalledWith({
        id: 't1',
        format: 'full',
      });
    });

    it('gmail_read returns error on failure', async () => {
      mockGmailApi.getThread.mockResolvedValue({
        ok: false,
        error: { message: 'Not found' },
      });

      const result = await registry.invoke('gmail_read', { threadId: 't1' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Not found' });
      }
    });

    it('gmail_send sends plain text email', async () => {
      mockGmailApi.sendMessage.mockResolvedValue({
        ok: true,
        value: { id: 'msg1' },
      });

      const result = await registry.invoke('gmail_send', {
        to: 'a@b.com',
        subject: 'Hi',
        body: 'Hello World',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ id: 'msg1' });
      }
      expect(mockGmailApi.sendMessage).toHaveBeenCalledWith({
        to: 'a@b.com',
        subject: 'Hi',
        body: 'Hello World',
      });
    });

    it('gmail_send sends HTML email when html=true', async () => {
      mockGmailApi.sendMessage.mockResolvedValue({
        ok: true,
        value: { id: 'msg2' },
      });

      await registry.invoke('gmail_send', {
        to: 'a@b.com',
        subject: 'Hi',
        body: '<h1>Hello</h1>',
        html: true,
      });
      expect(mockGmailApi.sendMessage).toHaveBeenCalledWith({
        to: 'a@b.com',
        subject: 'Hi',
        html: '<h1>Hello</h1>',
      });
    });

    it('gmail_send returns error on failure', async () => {
      mockGmailApi.sendMessage.mockResolvedValue({
        ok: false,
        error: { message: 'Send failed' },
      });

      const result = await registry.invoke('gmail_send', {
        to: 'a@b.com',
        subject: 'Hi',
        body: 'Hello',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Send failed' });
      }
    });

    it('gmail_labels returns labels on success', async () => {
      mockGmailApi.listLabels.mockResolvedValue({
        ok: true,
        value: { labels: [{ id: 'INBOX', name: 'INBOX' }] },
      });

      const result = await registry.invoke('gmail_labels', {});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ labels: [{ id: 'INBOX', name: 'INBOX' }] });
      }
    });

    it('gmail_labels returns error on failure', async () => {
      mockGmailApi.listLabels.mockResolvedValue({
        ok: false,
        error: { message: 'Forbidden' },
      });

      const result = await registry.invoke('gmail_labels', {});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Forbidden' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // Calendar
  // -----------------------------------------------------------------------

  describe('calendar tools', () => {
    it('calendar_events lists events with default calendarId', async () => {
      mockCalendarApi.listEvents.mockResolvedValue({
        ok: true,
        value: { items: [{ id: 'e1' }] },
      });

      const result = await registry.invoke('calendar_events', {});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ items: [{ id: 'e1' }] });
      }
      expect(mockCalendarApi.listEvents).toHaveBeenCalledWith('primary', expect.objectContaining({
        singleEvents: true,
        orderBy: 'startTime',
      }));
    });

    it('calendar_events uses provided calendarId', async () => {
      mockCalendarApi.listEvents.mockResolvedValue({
        ok: true,
        value: { items: [] },
      });

      await registry.invoke('calendar_events', { calendarId: 'work@group.calendar.google.com' });
      expect(mockCalendarApi.listEvents).toHaveBeenCalledWith(
        'work@group.calendar.google.com',
        expect.anything(),
      );
    });

    it('calendar_events returns error on failure', async () => {
      mockCalendarApi.listEvents.mockResolvedValue({
        ok: false,
        error: { message: 'Calendar error' },
      });

      const result = await registry.invoke('calendar_events', {});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Calendar error' });
      }
    });

    it('calendar_events computes time bounds for today=true', async () => {
      mockCalendarApi.listEvents.mockResolvedValue({
        ok: true,
        value: { items: [] },
      });

      await registry.invoke('calendar_events', { today: true });
      const call = mockCalendarApi.listEvents.mock.calls[0];
      expect(call[1]).toHaveProperty('timeMin');
      expect(call[1]).toHaveProperty('timeMax');
    });

    it('calendar_events computes time bounds for tomorrow=true', async () => {
      mockCalendarApi.listEvents.mockResolvedValue({
        ok: true,
        value: { items: [] },
      });

      await registry.invoke('calendar_events', { tomorrow: true });
      const call = mockCalendarApi.listEvents.mock.calls[0];
      expect(call[1]).toHaveProperty('timeMin');
      expect(call[1]).toHaveProperty('timeMax');
    });

    it('calendar_events computes time bounds for days=3', async () => {
      mockCalendarApi.listEvents.mockResolvedValue({
        ok: true,
        value: { items: [] },
      });

      await registry.invoke('calendar_events', { days: 3 });
      const call = mockCalendarApi.listEvents.mock.calls[0];
      expect(call[1]).toHaveProperty('timeMin');
      expect(call[1]).toHaveProperty('timeMax');
    });

    it('calendar_create creates event on success', async () => {
      mockCalendarApi.createEvent.mockResolvedValue({
        ok: true,
        value: { id: 'ev1', summary: 'Team Meeting' },
      });

      const result = await registry.invoke('calendar_create', {
        summary: 'Team Meeting',
        start: '2025-01-01T10:00:00Z',
        end: '2025-01-01T11:00:00Z',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ id: 'ev1', summary: 'Team Meeting' });
      }
      expect(mockCalendarApi.createEvent).toHaveBeenCalledWith('primary', {
        summary: 'Team Meeting',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' },
        attendees: undefined,
        location: undefined,
      });
    });

    it('calendar_create passes attendees and location', async () => {
      mockCalendarApi.createEvent.mockResolvedValue({
        ok: true,
        value: { id: 'ev2' },
      });

      await registry.invoke('calendar_create', {
        summary: 'Meeting',
        start: '2025-01-01T10:00:00Z',
        end: '2025-01-01T11:00:00Z',
        attendees: ['a@b.com', 'c@d.com'],
        location: 'Room 101',
      });
      expect(mockCalendarApi.createEvent).toHaveBeenCalledWith('primary', {
        summary: 'Meeting',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' },
        attendees: [{ email: 'a@b.com' }, { email: 'c@d.com' }],
        location: 'Room 101',
      });
    });

    it('calendar_create returns error on failure', async () => {
      mockCalendarApi.createEvent.mockResolvedValue({
        ok: false,
        error: { message: 'Create failed' },
      });

      const result = await registry.invoke('calendar_create', {
        summary: 'Meeting',
        start: '2025-01-01T10:00:00Z',
        end: '2025-01-01T11:00:00Z',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Create failed' });
      }
    });

    it('calendar_freebusy queries freebusy', async () => {
      mockCalendarApi.queryFreeBusy.mockResolvedValue({
        ok: true,
        value: { calendars: {} },
      });

      const result = await registry.invoke('calendar_freebusy', {
        calendars: ['primary', 'work'],
        from: '2025-01-01T00:00:00Z',
        to: '2025-01-02T00:00:00Z',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ calendars: {} });
      }
      expect(mockCalendarApi.queryFreeBusy).toHaveBeenCalledWith({
        timeMin: '2025-01-01T00:00:00Z',
        timeMax: '2025-01-02T00:00:00Z',
        items: [{ id: 'primary' }, { id: 'work' }],
      });
    });

    it('calendar_freebusy returns error on failure', async () => {
      mockCalendarApi.queryFreeBusy.mockResolvedValue({
        ok: false,
        error: { message: 'FreeBusy failed' },
      });

      const result = await registry.invoke('calendar_freebusy', {
        calendars: ['primary'],
        from: '2025-01-01T00:00:00Z',
        to: '2025-01-02T00:00:00Z',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'FreeBusy failed' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // Drive
  // -----------------------------------------------------------------------

  describe('drive tools', () => {
    it('drive_search returns results', async () => {
      mockDriveApi.searchFiles.mockResolvedValue({
        ok: true,
        value: { files: [{ id: 'f1', name: 'doc.txt' }] },
      });

      const result = await registry.invoke('drive_search', { query: 'budget' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ files: [{ id: 'f1', name: 'doc.txt' }] });
      }
      expect(mockDriveApi.searchFiles).toHaveBeenCalledWith('budget', {
        pageSize: undefined,
      });
    });

    it('drive_search passes max as pageSize', async () => {
      mockDriveApi.searchFiles.mockResolvedValue({
        ok: true,
        value: { files: [] },
      });

      await registry.invoke('drive_search', { query: 'test', max: 10 });
      expect(mockDriveApi.searchFiles).toHaveBeenCalledWith('test', { pageSize: 10 });
    });

    it('drive_search returns error on failure', async () => {
      mockDriveApi.searchFiles.mockResolvedValue({
        ok: false,
        error: { message: 'Drive error' },
      });

      const result = await registry.invoke('drive_search', { query: 'budget' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Drive error' });
      }
    });

    it('drive_read returns file metadata', async () => {
      mockDriveApi.getFile.mockResolvedValue({
        ok: true,
        value: { id: 'f1', name: 'readme.md' },
      });

      const result = await registry.invoke('drive_read', { fileId: 'f1' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ id: 'f1', name: 'readme.md' });
      }
    });

    it('drive_read returns error on failure', async () => {
      mockDriveApi.getFile.mockResolvedValue({
        ok: false,
        error: { message: 'File not found' },
      });

      const result = await registry.invoke('drive_read', { fileId: 'bad' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'File not found' });
      }
    });

    it('drive_upload uploads file content', async () => {
      mockDriveApi.uploadFile.mockResolvedValue({
        ok: true,
        value: { id: 'f2', name: 'file.txt' },
      });

      const result = await registry.invoke('drive_upload', {
        content: 'hello',
        name: 'file.txt',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ id: 'f2', name: 'file.txt' });
      }
      expect(mockDriveApi.uploadFile).toHaveBeenCalledWith({
        name: 'file.txt',
        mimeType: 'text/plain',
        body: new TextEncoder().encode('hello'),
        parents: undefined,
      });
    });

    it('drive_upload passes mimeType and parent', async () => {
      mockDriveApi.uploadFile.mockResolvedValue({
        ok: true,
        value: { id: 'f3' },
      });

      await registry.invoke('drive_upload', {
        content: 'data',
        name: 'report.csv',
        mimeType: 'text/csv',
        parent: 'folder1',
      });
      expect(mockDriveApi.uploadFile).toHaveBeenCalledWith({
        name: 'report.csv',
        mimeType: 'text/csv',
        body: new TextEncoder().encode('data'),
        parents: ['folder1'],
      });
    });

    it('drive_upload returns error on failure', async () => {
      mockDriveApi.uploadFile.mockResolvedValue({
        ok: false,
        error: { message: 'Upload failed' },
      });

      const result = await registry.invoke('drive_upload', {
        content: 'data',
        name: 'file.txt',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Upload failed' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // Sheets
  // -----------------------------------------------------------------------

  describe('sheets tools', () => {
    it('sheets_read returns values', async () => {
      mockSheetsApi.getValues.mockResolvedValue({
        ok: true,
        value: { values: [['a', 'b'], ['c', 'd']] },
      });

      const result = await registry.invoke('sheets_read', {
        spreadsheetId: 'sid1',
        range: 'Sheet1!A1:B2',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ values: [['a', 'b'], ['c', 'd']] });
      }
      expect(mockSheetsApi.getValues).toHaveBeenCalledWith('sid1', 'Sheet1!A1:B2');
    });

    it('sheets_read returns error on failure', async () => {
      mockSheetsApi.getValues.mockResolvedValue({
        ok: false,
        error: { message: 'Sheets error' },
      });

      const result = await registry.invoke('sheets_read', {
        spreadsheetId: 'sid1',
        range: 'A1',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Sheets error' });
      }
    });

    it('sheets_write updates values', async () => {
      mockSheetsApi.updateValues.mockResolvedValue({
        ok: true,
        value: { updatedCells: 2 },
      });

      const result = await registry.invoke('sheets_write', {
        spreadsheetId: 'sid1',
        range: 'Sheet1!A1',
        values: [['x', 'y']],
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ updatedCells: 2 });
      }
      expect(mockSheetsApi.updateValues).toHaveBeenCalledWith(
        'sid1',
        'Sheet1!A1',
        [['x', 'y']],
      );
    });

    it('sheets_write returns error on failure', async () => {
      mockSheetsApi.updateValues.mockResolvedValue({
        ok: false,
        error: { message: 'Write error' },
      });

      const result = await registry.invoke('sheets_write', {
        spreadsheetId: 'sid1',
        range: 'A1',
        values: [['x']],
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Write error' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // Tasks
  // -----------------------------------------------------------------------

  describe('tasks tools', () => {
    it('tasks_list returns tasks', async () => {
      mockTasksApi.listTasks.mockResolvedValue({
        ok: true,
        value: { items: [{ id: 't1', title: 'Buy milk' }] },
      });

      const result = await registry.invoke('tasks_list', { tasklistId: 'tl1' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ items: [{ id: 't1', title: 'Buy milk' }] });
      }
      expect(mockTasksApi.listTasks).toHaveBeenCalledWith('tl1', {
        maxResults: undefined,
      });
    });

    it('tasks_list returns error on failure', async () => {
      mockTasksApi.listTasks.mockResolvedValue({
        ok: false,
        error: { message: 'Tasks error' },
      });

      const result = await registry.invoke('tasks_list', { tasklistId: 'tl1' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Tasks error' });
      }
    });

    it('tasks_create creates a task', async () => {
      mockTasksApi.createTask.mockResolvedValue({
        ok: true,
        value: { id: 't2', title: 'New task' },
      });

      const result = await registry.invoke('tasks_create', {
        tasklistId: 'tl1',
        title: 'New task',
        due: '2025-06-01T00:00:00Z',
        notes: 'Some notes',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ id: 't2', title: 'New task' });
      }
      expect(mockTasksApi.createTask).toHaveBeenCalledWith('tl1', {
        title: 'New task',
        due: '2025-06-01T00:00:00Z',
        notes: 'Some notes',
      });
    });

    it('tasks_create returns error on failure', async () => {
      mockTasksApi.createTask.mockResolvedValue({
        ok: false,
        error: { message: 'Create failed' },
      });

      const result = await registry.invoke('tasks_create', {
        tasklistId: 'tl1',
        title: 'Task',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Create failed' });
      }
    });

    it('tasks_complete completes a task', async () => {
      mockTasksApi.completeTask.mockResolvedValue({
        ok: true,
        value: { id: 't1', status: 'completed' },
      });

      const result = await registry.invoke('tasks_complete', {
        tasklistId: 'tl1',
        taskId: 't1',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ id: 't1', status: 'completed' });
      }
      expect(mockTasksApi.completeTask).toHaveBeenCalledWith('tl1', 't1');
    });

    it('tasks_complete returns error on failure', async () => {
      mockTasksApi.completeTask.mockResolvedValue({
        ok: false,
        error: { message: 'Complete failed' },
      });

      const result = await registry.invoke('tasks_complete', {
        tasklistId: 'tl1',
        taskId: 't1',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Complete failed' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // Contacts
  // -----------------------------------------------------------------------

  describe('contacts tools', () => {
    it('contacts_search returns results', async () => {
      mockContactsApi.searchContacts.mockResolvedValue({
        ok: true,
        value: { results: [{ person: { names: [{ displayName: 'John' }] } }] },
      });

      const result = await registry.invoke('contacts_search', { query: 'John' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveProperty('results');
      }
      expect(mockContactsApi.searchContacts).toHaveBeenCalledWith('John', {
        pageSize: undefined,
      });
    });

    it('contacts_search returns error on failure', async () => {
      mockContactsApi.searchContacts.mockResolvedValue({
        ok: false,
        error: { message: 'Contacts error' },
      });

      const result = await registry.invoke('contacts_search', { query: 'John' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Contacts error' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // Docs
  // -----------------------------------------------------------------------

  describe('docs tools', () => {
    it('docs_get returns document', async () => {
      mockDocsApi.getDocument.mockResolvedValue({
        ok: true,
        value: { documentId: 'doc1', title: 'My Doc' },
      });

      const result = await registry.invoke('docs_get', { documentId: 'doc1' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ documentId: 'doc1', title: 'My Doc' });
      }
    });

    it('docs_get returns error on failure', async () => {
      mockDocsApi.getDocument.mockResolvedValue({
        ok: false,
        error: { message: 'Doc not found' },
      });

      const result = await registry.invoke('docs_get', { documentId: 'bad' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Doc not found' });
      }
    });

    it('docs_create creates document', async () => {
      mockDocsApi.createDocument.mockResolvedValue({
        ok: true,
        value: { documentId: 'doc2', title: 'New' },
      });

      const result = await registry.invoke('docs_create', { title: 'New' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ documentId: 'doc2', title: 'New' });
      }
      expect(mockDocsApi.createDocument).toHaveBeenCalledWith('New');
    });

    it('docs_create returns error on failure', async () => {
      mockDocsApi.createDocument.mockResolvedValue({
        ok: false,
        error: { message: 'Create failed' },
      });

      const result = await registry.invoke('docs_create', { title: 'New' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Create failed' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // Slides
  // -----------------------------------------------------------------------

  describe('slides tools', () => {
    it('slides_get returns presentation', async () => {
      mockSlidesApi.getPresentation.mockResolvedValue({
        ok: true,
        value: { presentationId: 'pres1', title: 'Deck' },
      });

      const result = await registry.invoke('slides_get', { presentationId: 'pres1' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ presentationId: 'pres1', title: 'Deck' });
      }
    });

    it('slides_get returns error on failure', async () => {
      mockSlidesApi.getPresentation.mockResolvedValue({
        ok: false,
        error: { message: 'Presentation not found' },
      });

      const result = await registry.invoke('slides_get', { presentationId: 'bad' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Presentation not found' });
      }
    });

    it('slides_create creates presentation', async () => {
      mockSlidesApi.createPresentation.mockResolvedValue({
        ok: true,
        value: { presentationId: 'pres2', title: 'New Deck' },
      });

      const result = await registry.invoke('slides_create', { title: 'New Deck' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ presentationId: 'pres2', title: 'New Deck' });
      }
      expect(mockSlidesApi.createPresentation).toHaveBeenCalledWith('New Deck');
    });

    it('slides_create returns error on failure', async () => {
      mockSlidesApi.createPresentation.mockResolvedValue({
        ok: false,
        error: { message: 'Slides error' },
      });

      const result = await registry.invoke('slides_create', { title: 'Deck' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Slides error' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // Classroom
  // -----------------------------------------------------------------------

  describe('classroom tools', () => {
    it('classroom_courses returns courses', async () => {
      mockClassroomApi.listCourses.mockResolvedValue({
        ok: true,
        value: { courses: [{ id: 'c1', name: 'Math' }] },
      });

      const result = await registry.invoke('classroom_courses', {});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ courses: [{ id: 'c1', name: 'Math' }] });
      }
      expect(mockClassroomApi.listCourses).toHaveBeenCalledWith({
        pageSize: undefined,
      });
    });

    it('classroom_courses passes max as pageSize', async () => {
      mockClassroomApi.listCourses.mockResolvedValue({
        ok: true,
        value: { courses: [] },
      });

      await registry.invoke('classroom_courses', { max: 5 });
      expect(mockClassroomApi.listCourses).toHaveBeenCalledWith({ pageSize: 5 });
    });

    it('classroom_courses returns error on failure', async () => {
      mockClassroomApi.listCourses.mockResolvedValue({
        ok: false,
        error: { message: 'Classroom error' },
      });

      const result = await registry.invoke('classroom_courses', {});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Classroom error' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // Forms
  // -----------------------------------------------------------------------

  describe('forms tools', () => {
    it('forms_get returns form', async () => {
      mockFormsApi.getForm.mockResolvedValue({
        ok: true,
        value: { formId: 'f1', info: { title: 'Survey' } },
      });

      const result = await registry.invoke('forms_get', { formId: 'f1' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ formId: 'f1', info: { title: 'Survey' } });
      }
    });

    it('forms_get returns error on failure', async () => {
      mockFormsApi.getForm.mockResolvedValue({
        ok: false,
        error: { message: 'Form not found' },
      });

      const result = await registry.invoke('forms_get', { formId: 'bad' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Form not found' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // Chat
  // -----------------------------------------------------------------------

  describe('chat tools', () => {
    it('chat_send sends message', async () => {
      mockChatApi.sendMessage.mockResolvedValue({
        ok: true,
        value: { name: 'spaces/abc/messages/m1', text: 'Hello' },
      });

      const result = await registry.invoke('chat_send', {
        spaceName: 'spaces/abc',
        text: 'Hello',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveProperty('name');
      }
      expect(mockChatApi.sendMessage).toHaveBeenCalledWith('spaces/abc', 'Hello');
    });

    it('chat_send returns error on failure', async () => {
      mockChatApi.sendMessage.mockResolvedValue({
        ok: false,
        error: { message: 'Chat error' },
      });

      const result = await registry.invoke('chat_send', {
        spaceName: 'spaces/abc',
        text: 'Hello',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Chat error' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // Keep
  // -----------------------------------------------------------------------

  describe('keep tools', () => {
    it('keep_list returns notes', async () => {
      mockKeepApi.listNotes.mockResolvedValue({
        ok: true,
        value: { notes: [{ name: 'notes/n1' }] },
      });

      const result = await registry.invoke('keep_list', {});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ notes: [{ name: 'notes/n1' }] });
      }
      expect(mockKeepApi.listNotes).toHaveBeenCalledWith({
        pageSize: undefined,
      });
    });

    it('keep_list returns error on failure', async () => {
      mockKeepApi.listNotes.mockResolvedValue({
        ok: false,
        error: { message: 'Keep error' },
      });

      const result = await registry.invoke('keep_list', {});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Keep error' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // Apps Script
  // -----------------------------------------------------------------------

  describe('appscript tools', () => {
    it('appscript_run runs function', async () => {
      mockAppScriptApi.runFunction.mockResolvedValue({
        ok: true,
        value: { done: true, response: { result: 42 } },
      });

      const result = await registry.invoke('appscript_run', {
        scriptId: 'script1',
        function: 'myFunc',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveProperty('done', true);
      }
      expect(mockAppScriptApi.runFunction).toHaveBeenCalledWith('script1', 'myFunc');
    });

    it('appscript_run returns error on failure', async () => {
      mockAppScriptApi.runFunction.mockResolvedValue({
        ok: false,
        error: { message: 'Script error' },
      });

      const result = await registry.invoke('appscript_run', {
        scriptId: 'script1',
        function: 'myFunc',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Script error' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // People
  // -----------------------------------------------------------------------

  describe('people tools', () => {
    it('people_me returns profile', async () => {
      mockPeopleApi.getProfile.mockResolvedValue({
        ok: true,
        value: { resourceName: 'people/me', names: [{ displayName: 'Test User' }] },
      });

      const result = await registry.invoke('people_me', {});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveProperty('resourceName', 'people/me');
      }
      expect(mockPeopleApi.getProfile).toHaveBeenCalledWith('people/me');
    });

    it('people_me returns error on failure', async () => {
      mockPeopleApi.getProfile.mockResolvedValue({
        ok: false,
        error: { message: 'Profile error' },
      });

      const result = await registry.invoke('people_me', {});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Profile error' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // Groups
  // -----------------------------------------------------------------------

  describe('groups tools', () => {
    it('groups_list returns groups', async () => {
      mockGroupsApi.listGroups.mockResolvedValue({
        ok: true,
        value: { groups: [{ name: 'groups/g1' }] },
      });

      const result = await registry.invoke('groups_list', {});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ groups: [{ name: 'groups/g1' }] });
      }
      expect(mockGroupsApi.listGroups).toHaveBeenCalledWith('customers/my_customer', {
        pageSize: undefined,
      });
    });

    it('groups_list passes max as pageSize', async () => {
      mockGroupsApi.listGroups.mockResolvedValue({
        ok: true,
        value: { groups: [] },
      });

      await registry.invoke('groups_list', { max: 3 });
      expect(mockGroupsApi.listGroups).toHaveBeenCalledWith('customers/my_customer', {
        pageSize: 3,
      });
    });

    it('groups_list returns error on failure', async () => {
      mockGroupsApi.listGroups.mockResolvedValue({
        ok: false,
        error: { message: 'Groups error' },
      });

      const result = await registry.invoke('groups_list', {});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toEqual({ error: 'Groups error' });
      }
    });
  });

  // -----------------------------------------------------------------------
  // Workspace (cross-service search)
  // -----------------------------------------------------------------------

  describe('workspace_search tool', () => {
    it('searches across gmail, drive, and calendar by default', async () => {
      mockGmailApi.searchMessages.mockResolvedValue({
        ok: true,
        value: { messages: [{ id: 'm1' }] },
      });
      mockDriveApi.searchFiles.mockResolvedValue({
        ok: true,
        value: { files: [{ id: 'f1' }] },
      });
      mockCalendarApi.searchEvents.mockResolvedValue({
        ok: true,
        value: { items: [{ id: 'e1' }] },
      });

      const result = await registry.invoke('workspace_search', { query: 'budget' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const data = result.value.data as Record<string, unknown>;
        expect(data).toHaveProperty('gmail');
        expect(data).toHaveProperty('drive');
        expect(data).toHaveProperty('calendar');
      }
    });

    it('only searches specified services', async () => {
      mockGmailApi.searchMessages.mockResolvedValue({
        ok: true,
        value: { messages: [] },
      });

      const result = await registry.invoke('workspace_search', {
        query: 'report',
        services: ['gmail'],
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const data = result.value.data as Record<string, unknown>;
        expect(data).toHaveProperty('gmail');
        expect(data).not.toHaveProperty('drive');
        expect(data).not.toHaveProperty('calendar');
      }
    });

    it('includes error results per service on failure', async () => {
      mockGmailApi.searchMessages.mockResolvedValue({
        ok: false,
        error: { message: 'Gmail failed' },
      });
      mockDriveApi.searchFiles.mockResolvedValue({
        ok: true,
        value: { files: [] },
      });
      mockCalendarApi.searchEvents.mockResolvedValue({
        ok: true,
        value: { items: [] },
      });

      const result = await registry.invoke('workspace_search', { query: 'test' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const data = result.value.data as Record<string, unknown>;
        expect(data.gmail).toEqual({ error: 'Gmail failed' });
        expect(data.drive).toEqual({ files: [] });
      }
    });

    it('handles thrown errors in workspace_search', async () => {
      mockGmailApi.searchMessages.mockRejectedValue(new Error('Network error'));
      mockDriveApi.searchFiles.mockResolvedValue({
        ok: true,
        value: { files: [] },
      });
      mockCalendarApi.searchEvents.mockResolvedValue({
        ok: true,
        value: { items: [] },
      });

      const result = await registry.invoke('workspace_search', { query: 'test' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const data = result.value.data as Record<string, unknown>;
        expect(data.gmail).toEqual({ error: 'Network error' });
      }
    });

    it('passes max to each service', async () => {
      mockGmailApi.searchMessages.mockResolvedValue({
        ok: true,
        value: { messages: [] },
      });
      mockDriveApi.searchFiles.mockResolvedValue({
        ok: true,
        value: { files: [] },
      });
      mockCalendarApi.searchEvents.mockResolvedValue({
        ok: true,
        value: { items: [] },
      });

      await registry.invoke('workspace_search', { query: 'test', max: 5 });
      expect(mockGmailApi.searchMessages).toHaveBeenCalledWith({ q: 'test', maxResults: 5 });
      expect(mockDriveApi.searchFiles).toHaveBeenCalledWith('test', { pageSize: 5 });
      expect(mockCalendarApi.searchEvents).toHaveBeenCalledWith('primary', 'test', { maxResults: 5 });
    });

    it('skips unknown service names gracefully', async () => {
      const result = await registry.invoke('workspace_search', {
        query: 'test',
        services: ['unknown_service'],
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const data = result.value.data as Record<string, unknown>;
        expect(Object.keys(data)).toHaveLength(0);
      }
    });
  });
});
