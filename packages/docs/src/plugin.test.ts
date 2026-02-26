/**
 * Tests for @openworkspace/docs.
 * Uses mock HttpClient to verify all operations without network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import { createDocsApi, docs } from './plugin.js';
import { getDocument, createDocument, copyDocument, getDocumentTabs } from './documents.js';
import { readText, batchUpdate, insertText, deleteContent, replaceAllText } from './content.js';
import { exportDocument } from './export.js';
import type {
  Document,
  DocumentTabsResponse,
  BatchUpdateResponse,
} from './types.js';

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

const DOCUMENT_FIXTURE: Document = {
  documentId: 'doc-123',
  title: 'Test Document',
  body: {
    content: [
      {
        startIndex: 0,
        endIndex: 1,
        paragraph: {
          elements: [
            {
              startIndex: 0,
              endIndex: 1,
              textRun: {
                content: '\n',
              },
            },
          ],
        },
      },
      {
        startIndex: 1,
        endIndex: 14,
        paragraph: {
          elements: [
            {
              startIndex: 1,
              endIndex: 14,
              textRun: {
                content: 'Hello, world!\n',
                textStyle: {
                  bold: true,
                },
              },
            },
          ],
        },
      },
    ],
  },
  revisionId: 'rev-456',
};

const TABS_FIXTURE: DocumentTabsResponse = {
  tabs: [
    {
      tabId: 'tab-1',
      tab: {
        tabProperties: {
          index: 0,
          title: 'Main Tab',
        },
      },
    },
    {
      tabId: 'tab-2',
      tab: {
        tabProperties: {
          index: 1,
          title: 'Second Tab',
        },
      },
    },
  ],
};

const BATCH_UPDATE_RESPONSE_FIXTURE: BatchUpdateResponse = {
  documentId: 'doc-123',
  revisionId: 'rev-789',
  replies: [],
};

// ---------------------------------------------------------------------------
// Tests: Plugin creation
// ---------------------------------------------------------------------------

describe('createDocsApi()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a DocsApi with all expected methods', () => {
    const api = createDocsApi(http);

    expect(typeof api.getDocument).toBe('function');
    expect(typeof api.createDocument).toBe('function');
    expect(typeof api.copyDocument).toBe('function');
    expect(typeof api.getDocumentTabs).toBe('function');
    expect(typeof api.readText).toBe('function');
    expect(typeof api.batchUpdate).toBe('function');
    expect(typeof api.insertText).toBe('function');
    expect(typeof api.deleteContent).toBe('function');
    expect(typeof api.replaceAllText).toBe('function');
    expect(typeof api.exportDocument).toBe('function');
  });
});

describe('docs()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a plugin with the correct name and version', () => {
    const plugin = docs(http);

    expect(plugin.name).toBe('docs');
    expect(plugin.version).toBe('0.1.0');
    expect(typeof plugin.setup).toBe('function');
    expect(typeof plugin.teardown).toBe('function');
  });

  it('stores DocsApi in metadata on setup', () => {
    const plugin = docs(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);

    expect(metadata.has('docs')).toBe(true);
    const api = metadata.get('docs') as ReturnType<typeof createDocsApi>;
    expect(typeof api.getDocument).toBe('function');
  });

  it('removes DocsApi from metadata on teardown', () => {
    const plugin = docs(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);
    expect(metadata.has('docs')).toBe(true);

    plugin.teardown!(ctx);
    expect(metadata.has('docs')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Document operations
// ---------------------------------------------------------------------------

describe('getDocument()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a document on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(DOCUMENT_FIXTURE));

    const result = await getDocument(http, 'doc-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.documentId).toBe('doc-123');
      expect(result.value.title).toBe('Test Document');
      expect(result.value.revisionId).toBe('rev-456');
    }

    expect(http._getHandler).toHaveBeenCalledOnce();
    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/documents/doc-123');
  });

  it('returns error on network failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Not found', 404));

    const result = await getDocument(http, 'nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not found');
    }
  });
});

describe('createDocument()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a new document with the given title', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(DOCUMENT_FIXTURE));

    const result = await createDocument(http, 'Test Document');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('Test Document');
      expect(result.value.documentId).toBe('doc-123');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/documents');

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({ title: 'Test Document' });
  });

  it('returns error when creation fails', async () => {
    http._postHandler.mockResolvedValueOnce(mockError('Forbidden', 403));

    const result = await createDocument(http, 'Test Document');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Forbidden');
    }
  });
});

describe('copyDocument()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('copies a document using Drive API', async () => {
    // Mock the Drive API copy response
    http._postHandler.mockResolvedValueOnce(mockResponse({ id: 'doc-copy-456' }));
    // Mock the Docs API get response
    http._getHandler.mockResolvedValueOnce(
      mockResponse({ ...DOCUMENT_FIXTURE, documentId: 'doc-copy-456', title: 'My Copy' }),
    );

    const result = await copyDocument(http, 'doc-123', 'My Copy');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.documentId).toBe('doc-copy-456');
      expect(result.value.title).toBe('My Copy');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const driveUrl = http._postHandler.mock.calls[0]?.[0] as string;
    expect(driveUrl).toContain('/drive/v3/files/doc-123/copy');

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({ name: 'My Copy' });
  });

  it('copies without a custom title', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse({ id: 'doc-copy-789' }));
    http._getHandler.mockResolvedValueOnce(
      mockResponse({ ...DOCUMENT_FIXTURE, documentId: 'doc-copy-789' }),
    );

    const result = await copyDocument(http, 'doc-123');

    expect(result.ok).toBe(true);

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toEqual({});
  });
});

describe('getDocumentTabs()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns document tabs on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(TABS_FIXTURE));

    const result = await getDocumentTabs(http, 'doc-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.tabs).toHaveLength(2);
      const firstTab = result.value.tabs[0];
      expect(firstTab?.tab.tabProperties.title).toBe('Main Tab');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/documents/doc-123/tabs');
  });

  it('returns error when tabs fetch fails', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Server error', 500));

    const result = await getDocumentTabs(http, 'doc-123');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Server error');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: Content operations
// ---------------------------------------------------------------------------

describe('readText()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('extracts plain text from document body', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(DOCUMENT_FIXTURE));

    const result = await readText(http, 'doc-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('\nHello, world!\n');
    }
  });

  it('returns error when document fetch fails', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Network error', 503));

    const result = await readText(http, 'doc-123');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Network error');
    }
  });
});

describe('batchUpdate()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('sends batch update requests successfully', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_RESPONSE_FIXTURE));

    const requests = [
      {
        insertText: {
          location: { index: 1 },
          text: 'New text',
        },
      },
    ];

    const result = await batchUpdate(http, 'doc-123', requests);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.documentId).toBe('doc-123');
      expect(result.value.revisionId).toBe('rev-789');
    }

    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/documents/doc-123:batchUpdate');

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toHaveProperty('requests');
  });

  it('returns error when batch update fails', async () => {
    http._postHandler.mockResolvedValueOnce(mockError('Invalid request', 400));

    const result = await batchUpdate(http, 'doc-123', []);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Invalid request');
    }
  });
});

describe('insertText()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('inserts text at the specified index', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_RESPONSE_FIXTURE));

    const result = await insertText(http, 'doc-123', 'Hello, world!', 1);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.revisionId).toBe('rev-789');
    }

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    const requestsArray = config.body.requests as Array<{ insertText?: { location: { index: number }; text: string } }>;
    expect(requestsArray[0]?.insertText?.location.index).toBe(1);
    expect(requestsArray[0]?.insertText?.text).toBe('Hello, world!');
  });
});

describe('deleteContent()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('deletes content in the specified range', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_RESPONSE_FIXTURE));

    const result = await deleteContent(http, 'doc-123', 10, 20);

    expect(result.ok).toBe(true);

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    const requestsArray = config.body.requests as Array<{ deleteContentRange?: { range: { startIndex: number; endIndex: number } } }>;
    expect(requestsArray[0]?.deleteContentRange?.range.startIndex).toBe(10);
    expect(requestsArray[0]?.deleteContentRange?.range.endIndex).toBe(20);
  });
});

describe('replaceAllText()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('replaces all occurrences of search text', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_RESPONSE_FIXTURE));

    const result = await replaceAllText(http, 'doc-123', 'foo', 'bar');

    expect(result.ok).toBe(true);

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    const requestsArray = config.body.requests as Array<{
      replaceAllText?: {
        containsText: { text: string; matchCase?: boolean };
        replaceText: string;
      };
    }>;
    expect(requestsArray[0]?.replaceAllText?.containsText.text).toBe('foo');
    expect(requestsArray[0]?.replaceAllText?.replaceText).toBe('bar');
    expect(requestsArray[0]?.replaceAllText?.containsText.matchCase).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Export operations
// ---------------------------------------------------------------------------

describe('exportDocument()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('exports document as PDF', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse('PDF_CONTENT_HERE'));

    const result = await exportDocument(http, 'doc-123', 'application/pdf');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('PDF_CONTENT_HERE');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/drive/v3/files/doc-123/export');
    expect(url).toContain('mimeType=application%2Fpdf');
  });

  it('exports document as DOCX', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse('DOCX_CONTENT_HERE'));

    const result = await exportDocument(
      http,
      'doc-123',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    expect(result.ok).toBe(true);

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('mimeType=application%2Fvnd.openxmlformats-officedocument.wordprocessingml.document');
  });

  it('exports document as plain text', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse('Plain text content'));

    const result = await exportDocument(http, 'doc-123', 'text/plain');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('Plain text content');
    }
  });

  it('exports document as HTML', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse('<html><body>HTML content</body></html>'));

    const result = await exportDocument(http, 'doc-123', 'text/html');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('<html><body>HTML content</body></html>');
    }
  });

  it('returns error when export fails', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Export failed', 403));

    const result = await exportDocument(http, 'doc-123', 'application/pdf');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Export failed');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: DocsApi facade
// ---------------------------------------------------------------------------

describe('DocsApi facade', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates getDocument through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(DOCUMENT_FIXTURE));

    const api = createDocsApi(http);
    const result = await api.getDocument('doc-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.documentId).toBe('doc-123');
    }
  });

  it('delegates createDocument through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(DOCUMENT_FIXTURE));

    const api = createDocsApi(http);
    const result = await api.createDocument('New Doc');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('Test Document');
    }
  });

  it('delegates readText through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(DOCUMENT_FIXTURE));

    const api = createDocsApi(http);
    const result = await api.readText('doc-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain('Hello, world!');
    }
  });

  it('delegates insertText through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_RESPONSE_FIXTURE));

    const api = createDocsApi(http);
    const result = await api.insertText('doc-123', 'Test', 1);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.documentId).toBe('doc-123');
    }
  });

  it('delegates exportDocument through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse('PDF_DATA'));

    const api = createDocsApi(http);
    const result = await api.exportDocument('doc-123', 'application/pdf');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('PDF_DATA');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: URL encoding
// ---------------------------------------------------------------------------

describe('URL encoding', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('encodes special characters in documentId', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(DOCUMENT_FIXTURE));

    await getDocument(http, 'doc/with/slashes');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/documents/doc%2Fwith%2Fslashes');
  });

  it('encodes MIME type in export URL', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse('data'));

    await exportDocument(http, 'doc-123', 'application/pdf');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('mimeType=application%2Fpdf');
  });
});
