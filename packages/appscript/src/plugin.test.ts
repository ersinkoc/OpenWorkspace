/**
 * Tests for @openworkspace/appscript.
 * Uses mock HttpClient to verify all operations without network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import { appscript, appscriptPlugin } from './plugin.js';
import { getProject, createProject, getContent, updateContent } from './projects.js';
import { runFunction, listProcesses } from './execute.js';
import type {
  Project,
  Content,
  ExecutionResponse,
  Operation,
  ListProcessesResponse,
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

const PROJECT_FIXTURE: Project = {
  scriptId: 'script-123',
  title: 'My Test Script',
  parentId: 'parent-456',
  createTime: '2025-01-01T00:00:00Z',
  updateTime: '2025-01-15T10:00:00Z',
  creator: {
    name: 'Alice',
    email: 'alice@example.com',
    photoUrl: 'https://example.com/photo.jpg',
  },
  lastModifyUser: {
    name: 'Bob',
    email: 'bob@example.com',
  },
};

const CONTENT_FIXTURE: Content = {
  scriptId: 'script-123',
  files: [
    {
      name: 'Code',
      type: 'SERVER_JS',
      source: 'function myFunction() { Logger.log("Hello"); }',
      createTime: '2025-01-01T00:00:00Z',
      updateTime: '2025-01-15T10:00:00Z',
      functionSet: {
        values: [
          {
            name: 'myFunction',
            parameters: [],
          },
        ],
      },
    },
    {
      name: 'Index',
      type: 'HTML',
      source: '<html><body>Hello World</body></html>',
      createTime: '2025-01-01T00:00:00Z',
      updateTime: '2025-01-15T10:00:00Z',
    },
  ],
};

const OPERATION_FIXTURE: Operation = {
  done: true,
  response: {
    result: 'Success!',
  },
};

const OPERATION_ERROR_FIXTURE: Operation = {
  done: true,
  error: {
    code: 400,
    message: 'Function not found',
  },
};

const PROCESSES_FIXTURE: ListProcessesResponse = {
  processes: [
    {
      processType: 'ADD_ON',
      processStatus: 'COMPLETED',
      functionName: 'myFunction',
      startTime: '2025-01-15T10:00:00Z',
      duration: '1.5s',
      userAccessLevel: 'OWNER',
    },
    {
      processType: 'SIMPLE_TRIGGER',
      processStatus: 'RUNNING',
      functionName: 'onEdit',
      startTime: '2025-01-15T10:05:00Z',
      userAccessLevel: 'OWNER',
    },
  ],
  nextPageToken: 'token-abc',
};

// ---------------------------------------------------------------------------
// Tests: Plugin creation
// ---------------------------------------------------------------------------

describe('appscript()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates an AppScriptApi with all expected methods', () => {
    const api = appscript(http);

    expect(typeof api.getProject).toBe('function');
    expect(typeof api.createProject).toBe('function');
    expect(typeof api.getContent).toBe('function');
    expect(typeof api.updateContent).toBe('function');
    expect(typeof api.runFunction).toBe('function');
    expect(typeof api.listProcesses).toBe('function');
  });
});

describe('appscriptPlugin()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a plugin with the correct name and version', () => {
    const plugin = appscriptPlugin(http);

    expect(plugin.name).toBe('appscript');
    expect(plugin.version).toBe('0.1.0');
    expect(typeof plugin.setup).toBe('function');
    expect(typeof plugin.teardown).toBe('function');
  });

  it('stores AppScriptApi in metadata on setup', () => {
    const plugin = appscriptPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);

    expect(metadata.has('appscript')).toBe(true);
    const api = metadata.get('appscript') as ReturnType<typeof appscript>;
    expect(typeof api.getProject).toBe('function');
  });

  it('removes AppScriptApi from metadata on teardown', () => {
    const plugin = appscriptPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);
    expect(metadata.has('appscript')).toBe(true);

    plugin.teardown!(ctx);
    expect(metadata.has('appscript')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Project operations
// ---------------------------------------------------------------------------

describe('getProject()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns project metadata on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PROJECT_FIXTURE));

    const result = await getProject(http, 'script-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.scriptId).toBe('script-123');
      expect(result.value.title).toBe('My Test Script');
      expect(result.value.creator?.email).toBe('alice@example.com');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/projects/script-123');
  });

  it('returns error when project not found', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Not Found', 404));

    const result = await getProject(http, 'nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not Found');
    }
  });

  it('encodes special characters in scriptId', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PROJECT_FIXTURE));

    await getProject(http, 'script/with/slashes');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/projects/script%2Fwith%2Fslashes');
  });
});

describe('createProject()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a new project with just a title', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(PROJECT_FIXTURE));

    const result = await createProject(http, 'My New Script');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.scriptId).toBe('script-123');
      expect(result.value.title).toBe('My Test Script');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/projects');

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body.title).toBe('My New Script');
    expect(config.body.parentId).toBeUndefined();
  });

  it('creates a new project with title and parentId', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(PROJECT_FIXTURE));

    const result = await createProject(http, 'My New Script', 'parent-789');

    expect(result.ok).toBe(true);

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body.title).toBe('My New Script');
    expect(config.body.parentId).toBe('parent-789');
  });

  it('returns error on failure', async () => {
    http._postHandler.mockResolvedValueOnce(mockError('Forbidden', 403));

    const result = await createProject(http, 'My New Script');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Forbidden');
    }
  });
});

describe('getContent()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns project content on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(CONTENT_FIXTURE));

    const result = await getContent(http, 'script-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.scriptId).toBe('script-123');
      expect(result.value.files).toHaveLength(2);
      const firstFile = result.value.files?.[0];
      expect(firstFile?.name).toBe('Code');
      expect(firstFile?.type).toBe('SERVER_JS');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/projects/script-123/content');
  });

  it('includes versionNumber in query string when provided', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(CONTENT_FIXTURE));

    await getContent(http, 'script-123', 5);

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('versionNumber=5');
  });

  it('does not include versionNumber when not provided', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(CONTENT_FIXTURE));

    await getContent(http, 'script-123');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toBe('https://script.googleapis.com/v1/projects/script-123/content');
  });

  it('returns error on failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Unauthorized', 401));

    const result = await getContent(http, 'script-123');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Unauthorized');
    }
  });
});

describe('updateContent()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('updates project content successfully', async () => {
    http._putHandler.mockResolvedValueOnce(mockResponse(CONTENT_FIXTURE));

    const files = [
      {
        name: 'Code',
        type: 'SERVER_JS' as const,
        source: 'function test() { return "hello"; }',
      },
    ];

    const result = await updateContent(http, 'script-123', files);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.scriptId).toBe('script-123');
      expect(result.value.files).toHaveLength(2);
    }

    expect(http._putHandler).toHaveBeenCalledOnce();
    const url = http._putHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/projects/script-123/content');

    const config = http._putHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body.files).toEqual(files);
  });

  it('returns error on failure', async () => {
    http._putHandler.mockResolvedValueOnce(mockError('Bad Request', 400));

    const result = await updateContent(http, 'script-123', []);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Bad Request');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: Execution operations
// ---------------------------------------------------------------------------

describe('runFunction()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('runs a function successfully without parameters', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(OPERATION_FIXTURE));

    const result = await runFunction(http, 'script-123', 'myFunction');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.result).toBe('Success!');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/scripts/script-123:run');

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body.function).toBe('myFunction');
    expect(config.body.parameters).toBeUndefined();
  });

  it('runs a function with parameters', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(OPERATION_FIXTURE));

    const result = await runFunction(http, 'script-123', 'myFunction', ['arg1', 42, true]);

    expect(result.ok).toBe(true);

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body.function).toBe('myFunction');
    expect(config.body.parameters).toEqual(['arg1', 42, true]);
  });

  it('returns error when operation has error', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(OPERATION_ERROR_FIXTURE));

    const result = await runFunction(http, 'script-123', 'nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Function not found');
    }
  });

  it('returns error on network failure', async () => {
    http._postHandler.mockResolvedValueOnce(mockError('Connection timeout', 500));

    const result = await runFunction(http, 'script-123', 'myFunction');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Connection timeout');
    }
  });

  it('handles operation without response or error', async () => {
    const emptyOperation: Operation = { done: true };
    http._postHandler.mockResolvedValueOnce(mockResponse(emptyOperation));

    const result = await runFunction(http, 'script-123', 'myFunction');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.result).toBeUndefined();
    }
  });
});

describe('listProcesses()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns list of processes on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PROCESSES_FIXTURE));

    const result = await listProcesses(http);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.processes).toHaveLength(2);
      const firstProcess = result.value.processes?.[0];
      expect(firstProcess?.functionName).toBe('myFunction');
      expect(firstProcess?.processStatus).toBe('COMPLETED');
      expect(result.value.nextPageToken).toBe('token-abc');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/processes');
  });

  it('includes pageSize in query string when provided', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PROCESSES_FIXTURE));

    await listProcesses(http, { pageSize: 10 });

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('pageSize=10');
  });

  it('includes pageToken in query string when provided', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PROCESSES_FIXTURE));

    await listProcesses(http, { pageToken: 'next-page-token' });

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('pageToken=next-page-token');
  });

  it('does not append query string when no options provided', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PROCESSES_FIXTURE));

    await listProcesses(http);

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toBe('https://script.googleapis.com/v1/processes');
  });

  it('returns error on failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Forbidden', 403));

    const result = await listProcesses(http);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Forbidden');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: AppScriptApi facade (via plugin)
// ---------------------------------------------------------------------------

describe('AppScriptApi facade', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates getProject through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PROJECT_FIXTURE));

    const api = appscript(http);
    const result = await api.getProject('script-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.scriptId).toBe('script-123');
    }
  });

  it('delegates createProject through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(PROJECT_FIXTURE));

    const api = appscript(http);
    const result = await api.createProject('New Script', 'parent-id');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.scriptId).toBe('script-123');
    }
  });

  it('delegates getContent through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(CONTENT_FIXTURE));

    const api = appscript(http);
    const result = await api.getContent('script-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.files).toHaveLength(2);
    }
  });

  it('delegates updateContent through the facade', async () => {
    http._putHandler.mockResolvedValueOnce(mockResponse(CONTENT_FIXTURE));

    const api = appscript(http);
    const result = await api.updateContent('script-123', [
      {
        name: 'Code',
        type: 'SERVER_JS',
        source: 'function test() {}',
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.scriptId).toBe('script-123');
    }
  });

  it('delegates runFunction through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(OPERATION_FIXTURE));

    const api = appscript(http);
    const result = await api.runFunction('script-123', 'myFunction', ['arg']);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.result).toBe('Success!');
    }
  });

  it('delegates listProcesses through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PROCESSES_FIXTURE));

    const api = appscript(http);
    const result = await api.listProcesses({ pageSize: 10 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.processes).toHaveLength(2);
    }
  });
});
