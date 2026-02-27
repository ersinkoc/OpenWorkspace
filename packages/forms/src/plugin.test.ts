/**
 * Tests for @openworkspace/forms.
 * Uses mock HttpClient to verify all operations without network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import { createFormsApi, formsPlugin } from './plugin.js';
import { getForm, createForm, batchUpdateForm, addQuestion, deleteItem } from './form-ops.js';
import { listResponses, getResponse } from './responses.js';
import type {
  Form,
  BatchUpdateFormResponse,
  FormResponse,
  ListFormResponsesResponse,
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

const FORM_FIXTURE: Form = {
  formId: 'form-123',
  info: {
    title: 'Customer Feedback',
    description: 'Tell us what you think',
    documentTitle: 'Customer Feedback Form',
  },
  revisionId: 'rev-1',
  responderUri: 'https://forms.google.com/form-123',
  items: [
    {
      itemId: 'item-1',
      title: 'What is your name?',
      questionItem: {
        question: {
          questionId: 'q-1',
          required: true,
          textQuestion: { paragraph: false },
        },
      },
    },
    {
      itemId: 'item-2',
      title: 'How would you rate our service?',
      questionItem: {
        question: {
          questionId: 'q-2',
          required: false,
          scaleQuestion: {
            low: 1,
            high: 5,
            lowLabel: 'Poor',
            highLabel: 'Excellent',
          },
        },
      },
    },
  ],
};

const BATCH_UPDATE_RESPONSE_FIXTURE: BatchUpdateFormResponse = {
  form: FORM_FIXTURE,
  replies: [
    {
      createItem: {
        itemId: 'item-3',
        questionId: ['q-3'],
      },
    },
  ],
};

const FORM_RESPONSE_FIXTURE: FormResponse = {
  responseId: 'resp-1',
  createTime: '2025-06-01T10:00:00Z',
  lastSubmittedTime: '2025-06-01T10:05:00Z',
  respondentEmail: 'user@example.com',
  answers: {
    'q-1': {
      questionId: 'q-1',
      textAnswers: {
        answers: [{ value: 'John Doe' }],
      },
    },
    'q-2': {
      questionId: 'q-2',
      textAnswers: {
        answers: [{ value: '5' }],
      },
    },
  },
};

const LIST_RESPONSES_FIXTURE: ListFormResponsesResponse = {
  responses: [FORM_RESPONSE_FIXTURE],
  nextPageToken: 'next-token-123',
  totalUpdatedResponses: 1,
};

// ---------------------------------------------------------------------------
// Tests: Plugin creation
// ---------------------------------------------------------------------------

describe('createFormsApi()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a FormsApi with all expected methods', () => {
    const api = createFormsApi(http);

    expect(typeof api.getForm).toBe('function');
    expect(typeof api.createForm).toBe('function');
    expect(typeof api.batchUpdateForm).toBe('function');
    expect(typeof api.addQuestion).toBe('function');
    expect(typeof api.deleteItem).toBe('function');
    expect(typeof api.listResponses).toBe('function');
    expect(typeof api.getResponse).toBe('function');
  });
});

describe('formsPlugin()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a plugin with the correct name and version', () => {
    const plugin = formsPlugin(http);

    expect(plugin.name).toBe('forms');
    expect(plugin.version).toBe('0.1.0');
    expect(typeof plugin.setup).toBe('function');
    expect(typeof plugin.teardown).toBe('function');
  });

  it('stores FormsApi in metadata on setup', () => {
    const plugin = formsPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);

    expect(metadata.has('forms')).toBe(true);
    const api = metadata.get('forms') as ReturnType<typeof createFormsApi>;
    expect(typeof api.getForm).toBe('function');
  });

  it('removes FormsApi from metadata on teardown', () => {
    const plugin = formsPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);
    expect(metadata.has('forms')).toBe(true);

    plugin.teardown!(ctx);
    expect(metadata.has('forms')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Form operations
// ---------------------------------------------------------------------------

describe('getForm()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a form on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(FORM_FIXTURE));

    const result = await getForm(http, 'form-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.formId).toBe('form-123');
      expect(result.value.info.title).toBe('Customer Feedback');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/forms/form-123');
  });

  it('returns error when form not found', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Not Found', 404));

    const result = await getForm(http, 'nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not Found');
    }
  });
});

describe('createForm()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a form and returns it', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(FORM_FIXTURE));

    const result = await createForm(http, {
      title: 'Customer Feedback',
      description: 'Tell us what you think',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.formId).toBe('form-123');
      expect(result.value.info.title).toBe('Customer Feedback');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('https://forms.googleapis.com/v1/forms');
  });

  it('sends info in request body', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(FORM_FIXTURE));

    await createForm(http, {
      title: 'New Form',
      description: 'Description here',
      documentTitle: 'Document Title',
    });

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({
      info: {
        title: 'New Form',
        description: 'Description here',
        documentTitle: 'Document Title',
      },
    });
  });
});

describe('batchUpdateForm()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('executes batch update and returns response', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_RESPONSE_FIXTURE));

    const result = await batchUpdateForm(http, 'form-123', [
      {
        createItem: {
          item: {
            title: 'New question',
            questionItem: {
              question: {
                required: true,
                textQuestion: { paragraph: false },
              },
            },
          },
          location: { index: 0 },
        },
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.form?.formId).toBe('form-123');
      expect(result.value.replies).toHaveLength(1);
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/forms/form-123:batchUpdate');
  });

  it('sends requests in request body', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_RESPONSE_FIXTURE));

    await batchUpdateForm(http, 'form-123', [
      {
        createItem: {
          item: { title: 'Test' },
          location: { index: 0 },
        },
      },
    ]);

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({
      requests: [
        {
          createItem: {
            item: { title: 'Test' },
            location: { index: 0 },
          },
        },
      ],
      includeFormInResponse: true,
    });
  });
});

describe('addQuestion()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates to batchUpdateForm with createItem request', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_RESPONSE_FIXTURE));

    const result = await addQuestion(http, 'form-123', {
      title: 'What is your email?',
      questionItem: {
        question: {
          required: true,
          textQuestion: { paragraph: false },
        },
      },
    });

    expect(result.ok).toBe(true);

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    const body = config.body as { requests: unknown[] };
    expect(body.requests).toHaveLength(1);
    const req = body.requests[0] as { createItem?: unknown };
    expect(req.createItem).toBeDefined();
  });

  it('uses provided location', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_RESPONSE_FIXTURE));

    await addQuestion(
      http,
      'form-123',
      {
        title: 'Question',
        questionItem: {
          question: { textQuestion: { paragraph: false } },
        },
      },
      { index: 2 },
    );

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    const body = config.body as { requests: unknown[] };
    const req = body.requests[0] as { createItem?: { location?: { index?: number } } };
    expect(req.createItem?.location?.index).toBe(2);
  });

  it('omits location when not provided (appends at end)', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_RESPONSE_FIXTURE));

    await addQuestion(http, 'form-123', {
      title: 'Question',
      questionItem: {
        question: { textQuestion: { paragraph: false } },
      },
    });

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    const body = config.body as { requests: unknown[] };
    const req = body.requests[0] as { createItem?: { location?: unknown } };
    expect(req.createItem?.location).toBeUndefined();
  });
});

describe('deleteItem()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates to batchUpdateForm with deleteItem request', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_RESPONSE_FIXTURE));

    const result = await deleteItem(http, 'form-123', 1);

    expect(result.ok).toBe(true);

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    const body = config.body as { requests: unknown[] };
    expect(body.requests).toHaveLength(1);
    const req = body.requests[0] as { deleteItem?: { location?: { index?: number } } };
    expect(req.deleteItem).toBeDefined();
    expect(req.deleteItem?.location?.index).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: Response operations
// ---------------------------------------------------------------------------

describe('listResponses()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of responses on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_RESPONSES_FIXTURE));

    const result = await listResponses(http, 'form-123', {
      pageSize: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.responses).toHaveLength(1);
      const first = result.value.responses[0];
      expect(first?.responseId).toBe('resp-1');
      expect(first?.respondentEmail).toBe('user@example.com');
    }

    expect(http._getHandler).toHaveBeenCalledOnce();
    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/forms/form-123/responses');
    expect(url).toContain('pageSize=10');
  });

  it('returns error on network failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Connection refused'));

    const result = await listResponses(http, 'form-123');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Connection refused');
    }
  });

  it('does not append query string when no options provided', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_RESPONSES_FIXTURE));

    await listResponses(http, 'form-123');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toBe('https://forms.googleapis.com/v1/forms/form-123/responses');
  });
});

describe('getResponse()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a single response on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(FORM_RESPONSE_FIXTURE));

    const result = await getResponse(http, 'form-123', 'resp-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.responseId).toBe('resp-1');
      expect(result.value.respondentEmail).toBe('user@example.com');
      expect(result.value.answers['q-1']?.textAnswers?.answers[0]?.value).toBe('John Doe');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/forms/form-123/responses/resp-1');
  });

  it('returns error when response not found', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Not Found', 404));

    const result = await getResponse(http, 'form-123', 'nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not Found');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: FormsApi facade (via plugin)
// ---------------------------------------------------------------------------

describe('FormsApi facade', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates getForm through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(FORM_FIXTURE));

    const api = createFormsApi(http);
    const result = await api.getForm('form-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.formId).toBe('form-123');
    }
  });

  it('delegates createForm through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(FORM_FIXTURE));

    const api = createFormsApi(http);
    const result = await api.createForm({
      title: 'Test Form',
      description: 'Test Description',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.formId).toBe('form-123');
    }
  });

  it('delegates batchUpdateForm through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_RESPONSE_FIXTURE));

    const api = createFormsApi(http);
    const result = await api.batchUpdateForm('form-123', [
      {
        createItem: {
          item: { title: 'New item' },
          location: { index: 0 },
        },
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.replies).toHaveLength(1);
    }
  });

  it('delegates addQuestion through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_RESPONSE_FIXTURE));

    const api = createFormsApi(http);
    const result = await api.addQuestion('form-123', {
      title: 'Question',
      questionItem: {
        question: { textQuestion: { paragraph: false } },
      },
    });

    expect(result.ok).toBe(true);
  });

  it('delegates deleteItem through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(BATCH_UPDATE_RESPONSE_FIXTURE));

    const api = createFormsApi(http);
    const result = await api.deleteItem('form-123', 0);

    expect(result.ok).toBe(true);
  });

  it('delegates listResponses through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_RESPONSES_FIXTURE));

    const api = createFormsApi(http);
    const result = await api.listResponses('form-123', { pageSize: 5 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.responses).toHaveLength(1);
    }
  });

  it('delegates getResponse through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(FORM_RESPONSE_FIXTURE));

    const api = createFormsApi(http);
    const result = await api.getResponse('form-123', 'resp-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.responseId).toBe('resp-1');
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

  it('encodes special characters in formId', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(FORM_FIXTURE));

    await getForm(http, 'form/with/slashes');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/forms/form%2Fwith%2Fslashes');
  });

  it('encodes special characters in responseId', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(FORM_RESPONSE_FIXTURE));

    await getResponse(http, 'form-123', 'resp/with/slashes');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/responses/resp%2Fwith%2Fslashes');
  });
});
