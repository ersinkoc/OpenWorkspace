/**
 * Tests for @openworkspace/keep.
 * Uses mock HttpClient to verify all operations without network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import { keep, keepPlugin } from './plugin.js';
import { listNotes, getNote, createNote, createListNote, deleteNote, searchNotes } from './notes.js';
import { getAttachment, downloadAttachment } from './attachments.js';
import type { Note, ListNotesResponse, Attachment } from './types.js';

// ---------------------------------------------------------------------------
// Mock HttpClient factory
// ---------------------------------------------------------------------------

type MockHttpClient = HttpClient & {
  _getHandler: ReturnType<typeof vi.fn>;
  _postHandler: ReturnType<typeof vi.fn>;
  _patchHandler: ReturnType<typeof vi.fn>;
  _putHandler: ReturnType<typeof vi.fn>;
  _deleteHandler: ReturnType<typeof vi.fn>;
};

function mockResponse<T>(data: T, status = 200): Result<HttpResponse<T>, NetworkError> {
  return ok({
    status,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    data,
  });
}

function mockError(message: string, status = 500): Result<never, NetworkError> {
  return err(new NetworkError(message, { status }, status));
}

function createMockHttp(): MockHttpClient {
  const getHandler = vi.fn();
  const postHandler = vi.fn();
  const patchHandler = vi.fn();
  const putHandler = vi.fn();
  const deleteHandler = vi.fn();

  return {
    request: vi.fn(),
    get: getHandler,
    post: postHandler,
    put: putHandler,
    patch: patchHandler,
    delete: deleteHandler,
    interceptors: { request: [], response: [], error: [] },
    _getHandler: getHandler,
    _postHandler: postHandler,
    _patchHandler: patchHandler,
    _putHandler: putHandler,
    _deleteHandler: deleteHandler,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOTE_FIXTURE: Note = {
  name: 'notes/abc123',
  createTime: '2025-01-01T10:00:00Z',
  updateTime: '2025-01-01T10:00:00Z',
  trashed: false,
  title: 'Meeting Notes',
  body: {
    text: { text: 'Discussed project timeline and deliverables.' },
  },
};

const LIST_NOTE_FIXTURE: Note = {
  name: 'notes/def456',
  createTime: '2025-01-02T10:00:00Z',
  updateTime: '2025-01-02T10:00:00Z',
  trashed: false,
  title: 'Shopping List',
  body: {
    list: {
      listItems: [
        { text: { text: 'Milk' }, checked: false },
        { text: { text: 'Eggs' }, checked: true },
        { text: { text: 'Bread' }, checked: false },
      ],
    },
  },
};

const TRASHED_NOTE_FIXTURE: Note = {
  name: 'notes/xyz789',
  createTime: '2025-01-03T10:00:00Z',
  updateTime: '2025-01-03T10:00:00Z',
  trashTime: '2025-01-03T12:00:00Z',
  trashed: true,
  title: 'Old Note',
  body: {
    text: { text: 'This note has been deleted.' },
  },
};

const LIST_NOTES_FIXTURE: ListNotesResponse = {
  notes: [NOTE_FIXTURE, LIST_NOTE_FIXTURE],
  nextPageToken: 'token123',
};

const ATTACHMENT_FIXTURE: Attachment = {
  name: 'notes/abc123/attachments/att001',
  mimeType: ['image/jpeg'],
};

// ---------------------------------------------------------------------------
// Tests: Plugin creation
// ---------------------------------------------------------------------------

describe('keep()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a KeepApi with all expected methods', () => {
    const api = keep(http);

    expect(typeof api.listNotes).toBe('function');
    expect(typeof api.getNote).toBe('function');
    expect(typeof api.createNote).toBe('function');
    expect(typeof api.createListNote).toBe('function');
    expect(typeof api.deleteNote).toBe('function');
    expect(typeof api.searchNotes).toBe('function');
    expect(typeof api.getAttachment).toBe('function');
    expect(typeof api.downloadAttachment).toBe('function');
  });
});

describe('keepPlugin()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a plugin with the correct name and version', () => {
    const plugin = keepPlugin(http);

    expect(plugin.name).toBe('keep');
    expect(plugin.version).toBe('0.1.0');
    expect(typeof plugin.setup).toBe('function');
    expect(typeof plugin.teardown).toBe('function');
  });

  it('stores KeepApi in metadata on setup', () => {
    const plugin = keepPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);

    expect(metadata.has('keep')).toBe(true);
    const api = metadata.get('keep') as ReturnType<typeof keep>;
    expect(typeof api.listNotes).toBe('function');
  });

  it('removes KeepApi from metadata on teardown', () => {
    const plugin = keepPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);
    expect(metadata.has('keep')).toBe(true);

    plugin.teardown!(ctx);
    expect(metadata.has('keep')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Note operations
// ---------------------------------------------------------------------------

describe('listNotes()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of notes on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_NOTES_FIXTURE));

    const result = await listNotes(http, {
      pageSize: 10,
      filter: 'trashed=false',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.notes).toHaveLength(2);
      const first = result.value.notes[0];
      expect(first?.title).toBe('Meeting Notes');
      expect(result.value.nextPageToken).toBe('token123');
    }

    expect(http._getHandler).toHaveBeenCalledOnce();
    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/notes');
    expect(url).toContain('pageSize=10');
    expect(url).toContain('filter=');
  });

  it('returns error on network failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Connection refused'));

    const result = await listNotes(http);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Connection refused');
    }
  });

  it('does not append query string when no options provided', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_NOTES_FIXTURE));

    await listNotes(http);

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toBe('https://keep.googleapis.com/v1/notes');
  });
});

describe('getNote()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a single note on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(NOTE_FIXTURE));

    const result = await getNote(http, 'notes/abc123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('notes/abc123');
      expect(result.value.title).toBe('Meeting Notes');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/notes/abc123');
  });

  it('returns error when note not found', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Not Found', 404));

    const result = await getNote(http, 'notes/nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not Found');
    }
  });
});

describe('createNote()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a text note and returns it', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(NOTE_FIXTURE));

    const result = await createNote(http, 'Meeting Notes', 'Discussed project timeline');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('notes/abc123');
      expect(result.value.title).toBe('Meeting Notes');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/notes');

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({
      title: 'Meeting Notes',
      body: {
        text: { text: 'Discussed project timeline' },
      },
    });
  });
});

describe('createListNote()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a checklist note and returns it', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(LIST_NOTE_FIXTURE));

    const result = await createListNote(http, 'Shopping List', ['Milk', 'Eggs', 'Bread']);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('notes/def456');
      expect(result.value.title).toBe('Shopping List');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({
      title: 'Shopping List',
      body: {
        list: {
          listItems: [
            { text: { text: 'Milk' }, checked: false },
            { text: { text: 'Eggs' }, checked: false },
            { text: { text: 'Bread' }, checked: false },
          ],
        },
      },
    });
  });

  it('creates an empty checklist when no items provided', async () => {
    const emptyListNote = { ...LIST_NOTE_FIXTURE, body: { list: { listItems: [] } } };
    http._postHandler.mockResolvedValueOnce(mockResponse(emptyListNote));

    const result = await createListNote(http, 'Empty List', []);

    expect(result.ok).toBe(true);
    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    const body = config.body as { body: { list: { listItems: unknown[] } } };
    expect(body.body.list.listItems).toHaveLength(0);
  });
});

describe('deleteNote()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('deletes a note successfully', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockResponse(null, 204));

    const result = await deleteNote(http, 'notes/abc123');

    expect(result.ok).toBe(true);
    expect(http._deleteHandler).toHaveBeenCalledOnce();

    const url = http._deleteHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/notes/abc123');
  });

  it('returns error when delete fails', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockError('Forbidden', 403));

    const result = await deleteNote(http, 'notes/abc123');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Forbidden');
    }
  });
});

describe('searchNotes()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates to listNotes with filter parameter', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_NOTES_FIXTURE));

    const result = await searchNotes(http, 'meeting');

    expect(result.ok).toBe(true);

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('filter=meeting');
  });

  it('allows additional options', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_NOTES_FIXTURE));

    await searchNotes(http, 'shopping', {
      pageSize: 5,
      pageToken: 'token456',
    });

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('filter=shopping');
    expect(url).toContain('pageSize=5');
    expect(url).toContain('pageToken=token456');
  });
});

// ---------------------------------------------------------------------------
// Tests: Attachment operations
// ---------------------------------------------------------------------------

describe('getAttachment()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns attachment metadata on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(ATTACHMENT_FIXTURE));

    const result = await getAttachment(http, 'notes/abc123/attachments/att001');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('notes/abc123/attachments/att001');
      expect(result.value.mimeType).toContain('image/jpeg');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/notes/abc123/attachments/att001');
  });

  it('returns error when attachment not found', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Not Found', 404));

    const result = await getAttachment(http, 'notes/abc123/attachments/nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not Found');
    }
  });
});

describe('downloadAttachment()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('downloads attachment content as ArrayBuffer', async () => {
    const buffer = new ArrayBuffer(1024);
    http._getHandler.mockResolvedValueOnce(mockResponse(buffer));

    const result = await downloadAttachment(http, 'notes/abc123/attachments/att001');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeInstanceOf(ArrayBuffer);
      expect(result.value.byteLength).toBe(1024);
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/notes/abc123/attachments/att001');
    expect(url).toContain('mimeType=*/*');
  });

  it('returns error when download fails', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Service Unavailable', 503));

    const result = await downloadAttachment(http, 'notes/abc123/attachments/att001');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Service Unavailable');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: KeepApi facade (via plugin)
// ---------------------------------------------------------------------------

describe('KeepApi facade', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates listNotes through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_NOTES_FIXTURE));

    const api = keep(http);
    const result = await api.listNotes({ pageSize: 5 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.notes).toHaveLength(2);
    }
  });

  it('delegates createNote through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(NOTE_FIXTURE));

    const api = keep(http);
    const result = await api.createNote('Test Note', 'Test content');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('notes/abc123');
    }
  });

  it('delegates createListNote through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(LIST_NOTE_FIXTURE));

    const api = keep(http);
    const result = await api.createListNote('Test List', ['Item 1', 'Item 2']);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('notes/def456');
    }
  });

  it('delegates getAttachment through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(ATTACHMENT_FIXTURE));

    const api = keep(http);
    const result = await api.getAttachment('notes/abc123/attachments/att001');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mimeType).toContain('image/jpeg');
    }
  });

  it('delegates downloadAttachment through the facade', async () => {
    const buffer = new ArrayBuffer(512);
    http._getHandler.mockResolvedValueOnce(mockResponse(buffer));

    const api = keep(http);
    const result = await api.downloadAttachment('notes/abc123/attachments/att001');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.byteLength).toBe(512);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: Resource name encoding
// ---------------------------------------------------------------------------

describe('Resource name encoding', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('handles note names with special characters', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(NOTE_FIXTURE));

    await getNote(http, 'notes/abc/123');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    // Resource names are not encoded in the path - they're used as-is
    expect(url).toContain('/notes/abc/123');
  });

  it('handles filter parameter with special characters', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_NOTES_FIXTURE));

    await listNotes(http, {
      filter: 'title:"test note"',
    });

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('filter=');
    // encodeURIComponent will encode quotes and spaces
    expect(url).toContain('title');
  });
});
