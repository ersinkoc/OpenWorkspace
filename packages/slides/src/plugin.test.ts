/**
 * Tests for @openworkspace/slides.
 * Uses mock HttpClient to verify all operations without network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import { slides, slidesPlugin } from './plugin.js';
import {
  getPresentation,
  createPresentation,
  getSlide,
} from './presentations.js';
import {
  batchUpdate,
  addSlide,
  deleteSlide,
  replaceAllText,
  updateSpeakerNotes,
} from './slide-ops.js';
import { exportPresentation } from './export.js';
import type {
  Presentation,
  Page,
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

const PRESENTATION_FIXTURE: Presentation = {
  presentationId: 'pres-1',
  title: 'My Presentation',
  slides: [
    {
      objectId: 'slide-1',
      pageType: 'SLIDE',
      pageElements: [
        {
          objectId: 'shape-1',
          shape: {
            shapeType: 'TEXT_BOX',
            text: {
              textElements: [
                {
                  startIndex: 0,
                  endIndex: 5,
                  textRun: {
                    content: 'Hello',
                    style: {
                      bold: true,
                    },
                  },
                },
              ],
            },
          },
        },
      ],
      slideProperties: {
        layoutObjectId: 'layout-1',
      },
    },
  ],
  masters: [],
  layouts: [],
  pageSize: {
    width: { magnitude: 10, unit: 'EMU' },
    height: { magnitude: 5.625, unit: 'EMU' },
  },
  locale: 'en-US',
};

const SLIDE_FIXTURE: Page = {
  objectId: 'slide-1',
  pageType: 'SLIDE',
  pageElements: [
    {
      objectId: 'shape-1',
      shape: {
        shapeType: 'TEXT_BOX',
        text: {
          textElements: [
            {
              startIndex: 0,
              endIndex: 5,
              textRun: {
                content: 'Hello',
                style: {
                  bold: true,
                },
              },
            },
          ],
        },
      },
    },
  ],
  slideProperties: {
    layoutObjectId: 'layout-1',
  },
};

const BATCH_UPDATE_FIXTURE: BatchUpdateResponse = {
  presentationId: 'pres-1',
  replies: [
    {
      createSlide: {
        objectId: 'new-slide-1',
      },
    },
  ],
};

const REPLACE_ALL_TEXT_FIXTURE: BatchUpdateResponse = {
  presentationId: 'pres-1',
  replies: [
    {
      replaceAllText: {
        occurrencesChanged: 3,
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests: Plugin creation
// ---------------------------------------------------------------------------

describe('slides()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a SlidesApi with all expected methods', () => {
    const api = slides(http);

    expect(typeof api.getPresentation).toBe('function');
    expect(typeof api.createPresentation).toBe('function');
    expect(typeof api.getSlide).toBe('function');
    expect(typeof api.batchUpdate).toBe('function');
    expect(typeof api.addSlide).toBe('function');
    expect(typeof api.deleteSlide).toBe('function');
    expect(typeof api.replaceAllText).toBe('function');
    expect(typeof api.updateSpeakerNotes).toBe('function');
    expect(typeof api.exportPresentation).toBe('function');
  });
});

describe('slidesPlugin()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a plugin with the correct name and version', () => {
    const plugin = slidesPlugin(http);

    expect(plugin.name).toBe('slides');
    expect(plugin.version).toBe('0.1.0');
    expect(typeof plugin.setup).toBe('function');
    expect(typeof plugin.teardown).toBe('function');
  });

  it('stores SlidesApi in metadata on setup', () => {
    const plugin = slidesPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);

    expect(metadata.has('slides')).toBe(true);
    const api = metadata.get('slides') as ReturnType<typeof slides>;
    expect(typeof api.getPresentation).toBe('function');
  });

  it('removes SlidesApi from metadata on teardown', () => {
    const plugin = slidesPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);
    expect(metadata.has('slides')).toBe(true);

    plugin.teardown!(ctx);
    expect(metadata.has('slides')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Presentation operations
// ---------------------------------------------------------------------------

describe('getPresentation()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a presentation on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PRESENTATION_FIXTURE));

    const result = await getPresentation(http, 'pres-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.presentationId).toBe('pres-1');
      expect(result.value.title).toBe('My Presentation');
      expect(result.value.slides).toHaveLength(1);
    }

    expect(http._getHandler).toHaveBeenCalledOnce();
    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/presentations/pres-1');
  });

  it('returns error on network failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Connection refused'));

    const result = await getPresentation(http, 'pres-1');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Connection refused');
    }
  });
});

describe('createPresentation()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a presentation and returns it', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(PRESENTATION_FIXTURE));

    const result = await createPresentation(http, 'My Presentation');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.presentationId).toBe('pres-1');
      expect(result.value.title).toBe('My Presentation');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/presentations');

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({ title: 'My Presentation' });
  });

  it('returns error on failure', async () => {
    http._postHandler.mockResolvedValueOnce(mockError('Forbidden', 403));

    const result = await createPresentation(http, 'Test');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Forbidden');
    }
  });
});

describe('getSlide()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a single slide on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SLIDE_FIXTURE));

    const result = await getSlide(http, 'pres-1', 'slide-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.objectId).toBe('slide-1');
      expect(result.value.pageType).toBe('SLIDE');
      expect(result.value.pageElements).toHaveLength(1);
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/presentations/pres-1/pages/slide-1');
  });

  it('returns error when slide not found', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Not Found', 404));

    const result = await getSlide(http, 'pres-1', 'nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not Found');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: Slide operations
// ---------------------------------------------------------------------------

describe('batchUpdate()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('sends a batch update request successfully', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_FIXTURE));

    const result = await batchUpdate(http, 'pres-1', [
      { createSlide: { insertionIndex: 0 } },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.presentationId).toBe('pres-1');
      expect(result.value.replies).toHaveLength(1);
      expect(result.value.replies?.[0]?.createSlide?.objectId).toBe('new-slide-1');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain(':batchUpdate');
  });

  it('sends request body with requests array', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_FIXTURE));

    await batchUpdate(http, 'pres-1', [
      { createSlide: { insertionIndex: 0 } },
    ]);

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toHaveProperty('requests');
    expect(Array.isArray((config.body as { requests: unknown[] }).requests)).toBe(true);
  });

  it('returns error on failure', async () => {
    http._postHandler.mockResolvedValueOnce(mockError('Bad Request', 400));

    const result = await batchUpdate(http, 'pres-1', [
      { createSlide: { insertionIndex: 0 } },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Bad Request');
    }
  });
});

describe('addSlide()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('adds a blank slide successfully', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_FIXTURE));

    const result = await addSlide(http, 'pres-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('new-slide-1');
    }

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    const requests = (config.body as { requests: Array<{ createSlide?: unknown }> }).requests;
    expect(requests[0]?.createSlide).toBeDefined();
  });

  it('adds a slide with specified layout', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_FIXTURE));

    await addSlide(http, 'pres-1', 'layout-2');

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    const requests = (config.body as { requests: Array<{ createSlide?: { slideLayoutReference?: { layoutId?: string } } }> }).requests;
    expect(requests[0]?.createSlide?.slideLayoutReference?.layoutId).toBe('layout-2');
  });

  it('adds a slide at specified index', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_FIXTURE));

    await addSlide(http, 'pres-1', undefined, 2);

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    const requests = (config.body as { requests: Array<{ createSlide?: { insertionIndex?: number } }> }).requests;
    expect(requests[0]?.createSlide?.insertionIndex).toBe(2);
  });

  it('returns error when no objectId is returned', async () => {
    const emptyResponse: BatchUpdateResponse = {
      presentationId: 'pres-1',
      replies: [],
    };
    http._postHandler.mockResolvedValueOnce(mockResponse(emptyResponse));

    const result = await addSlide(http, 'pres-1');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('no objectId returned');
    }
  });
});

describe('deleteSlide()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('deletes a slide successfully', async () => {
    const response: BatchUpdateResponse = {
      presentationId: 'pres-1',
      replies: [],
    };
    http._postHandler.mockResolvedValueOnce(mockResponse(response));

    const result = await deleteSlide(http, 'pres-1', 'slide-1');

    expect(result.ok).toBe(true);
    expect(http._postHandler).toHaveBeenCalledOnce();

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    const requests = (config.body as { requests: Array<{ deleteObject?: { objectId: string } }> }).requests;
    expect(requests[0]?.deleteObject?.objectId).toBe('slide-1');
  });

  it('returns error on failure', async () => {
    http._postHandler.mockResolvedValueOnce(mockError('Not Found', 404));

    const result = await deleteSlide(http, 'pres-1', 'nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not Found');
    }
  });
});

describe('replaceAllText()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('replaces text and returns occurrence count', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(REPLACE_ALL_TEXT_FIXTURE));

    const result = await replaceAllText(http, 'pres-1', '{{name}}', 'John Doe');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(3);
    }

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    const requests = (config.body as { requests: Array<{ replaceAllText?: { containsText: { text: string }; replaceText: string } }> }).requests;
    expect(requests[0]?.replaceAllText?.containsText.text).toBe('{{name}}');
    expect(requests[0]?.replaceAllText?.replaceText).toBe('John Doe');
  });

  it('returns 0 when no occurrences found', async () => {
    const noMatches: BatchUpdateResponse = {
      presentationId: 'pres-1',
      replies: [
        {
          replaceAllText: {
            occurrencesChanged: 0,
          },
        },
      ],
    };
    http._postHandler.mockResolvedValueOnce(mockResponse(noMatches));

    const result = await replaceAllText(http, 'pres-1', '{{missing}}', 'Replacement');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(0);
    }
  });

  it('returns error on failure', async () => {
    http._postHandler.mockResolvedValueOnce(mockError('Bad Request', 400));

    const result = await replaceAllText(http, 'pres-1', 'search', 'replace');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Bad Request');
    }
  });
});

describe('updateSpeakerNotes()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('updates speaker notes successfully', async () => {
    const presentationWithNotes: Presentation = {
      ...PRESENTATION_FIXTURE,
      slides: [
        {
          ...SLIDE_FIXTURE,
          slideProperties: {
            notesPage: {
              objectId: 'notes-1',
              notesProperties: {
                speakerNotesObjectId: 'notes-shape-1',
              },
            },
          },
        },
      ],
    };
    http._getHandler.mockResolvedValueOnce(mockResponse(presentationWithNotes));

    const updateResponse: BatchUpdateResponse = {
      presentationId: 'pres-1',
      replies: [],
    };
    http._postHandler.mockResolvedValueOnce(mockResponse(updateResponse));

    const result = await updateSpeakerNotes(http, 'pres-1', 'slide-1', 'Remember to smile!');

    expect(result.ok).toBe(true);
    expect(http._getHandler).toHaveBeenCalledOnce();
    expect(http._postHandler).toHaveBeenCalledOnce();
  });

  it('returns error when slide not found', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PRESENTATION_FIXTURE));

    const result = await updateSpeakerNotes(http, 'pres-1', 'nonexistent', 'Notes');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('not found');
    }
  });

  it('returns error when notes object not found', async () => {
    const presentationNoNotes: Presentation = {
      ...PRESENTATION_FIXTURE,
      slides: [
        {
          ...SLIDE_FIXTURE,
          slideProperties: {},
        },
      ],
    };
    http._getHandler.mockResolvedValueOnce(mockResponse(presentationNoNotes));

    const result = await updateSpeakerNotes(http, 'pres-1', 'slide-1', 'Notes');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('No speaker notes object');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: Export operations
// ---------------------------------------------------------------------------

describe('exportPresentation()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('exports presentation as PDF', async () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
    http._getHandler.mockResolvedValueOnce(mockResponse(mockBlob));

    const result = await exportPresentation(http, 'pres-1', 'application/pdf');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeInstanceOf(Blob);
      expect(result.value.type).toBe('application/pdf');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/files/pres-1/export');
    expect(url).toContain('mimeType=application%2Fpdf');
  });

  it('exports presentation as PPTX', async () => {
    const mockBlob = new Blob(['pptx content'], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
    http._getHandler.mockResolvedValueOnce(mockResponse(mockBlob));

    const result = await exportPresentation(
      http,
      'pres-1',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeInstanceOf(Blob);
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('mimeType=application%2Fvnd.openxmlformats-officedocument.presentationml.presentation');
  });

  it('returns error on failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Forbidden', 403));

    const result = await exportPresentation(http, 'pres-1', 'application/pdf');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Forbidden');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: SlidesApi facade (via plugin)
// ---------------------------------------------------------------------------

describe('SlidesApi facade', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates getPresentation through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PRESENTATION_FIXTURE));

    const api = slides(http);
    const result = await api.getPresentation('pres-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.presentationId).toBe('pres-1');
    }
  });

  it('delegates createPresentation through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(PRESENTATION_FIXTURE));

    const api = slides(http);
    const result = await api.createPresentation('New Presentation');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('My Presentation');
    }
  });

  it('delegates addSlide through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_FIXTURE));

    const api = slides(http);
    const result = await api.addSlide('pres-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('new-slide-1');
    }
  });

  it('delegates replaceAllText through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(REPLACE_ALL_TEXT_FIXTURE));

    const api = slides(http);
    const result = await api.replaceAllText('pres-1', 'old', 'new');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(3);
    }
  });

  it('delegates exportPresentation through the facade', async () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
    http._getHandler.mockResolvedValueOnce(mockResponse(mockBlob));

    const api = slides(http);
    const result = await api.exportPresentation('pres-1', 'application/pdf');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeInstanceOf(Blob);
    }
  });

  it('delegates updateSpeakerNotes through the facade', async () => {
    const presentationWithNotes = {
      ...PRESENTATION_FIXTURE,
      slides: [
        {
          ...SLIDE_FIXTURE,
          slideProperties: {
            notesPage: {
              objectId: 'notes-1',
              notesProperties: {
                speakerNotesObjectId: 'notes-shape-1',
              },
            },
          },
        },
      ],
    };
    http._getHandler.mockResolvedValueOnce(mockResponse(presentationWithNotes));
    http._postHandler.mockResolvedValueOnce(mockResponse({
      presentationId: 'pres-1',
      replies: [],
    }));

    const api = slides(http);
    const result = await api.updateSpeakerNotes('pres-1', 'slide-1', 'New notes');

    expect(result.ok).toBe(true);
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

  it('encodes special characters in presentationId', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PRESENTATION_FIXTURE));

    await getPresentation(http, 'pres/with/slashes');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/presentations/pres%2Fwith%2Fslashes');
  });

  it('encodes special characters in slideId', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SLIDE_FIXTURE));

    await getSlide(http, 'pres-1', 'slide:with:colons');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/pages/slide%3Awith%3Acolons');
  });
});
