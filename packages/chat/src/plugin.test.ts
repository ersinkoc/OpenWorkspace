/**
 * Tests for @openworkspace/chat.
 * Uses mock HttpClient to verify all operations without network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import { chat, chatPlugin } from './plugin.js';
import { listSpaces, getSpace, createSpace, findSpace } from './spaces.js';
import { listMessages, getMessage, sendMessage, updateMessage, deleteMessage } from './messages.js';
import { createDirectMessage, listDirectMessages } from './dm.js';
import type {
  Space,
  Message,
  ListSpacesResponse,
  ListMessagesResponse,
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

const SPACE_FIXTURE: Space = {
  name: 'spaces/AAAA',
  displayName: 'Team Room',
  type: 'ROOM',
  threaded: true,
  spaceDetails: {
    description: 'Team collaboration space',
    guidelines: 'Be respectful',
  },
};

const SPACE_LIST_FIXTURE: ListSpacesResponse = {
  spaces: [
    SPACE_FIXTURE,
    {
      name: 'spaces/BBBB',
      displayName: 'Project X',
      type: 'ROOM',
      threaded: false,
    },
  ],
  nextPageToken: 'token-123',
};

const MESSAGE_FIXTURE: Message = {
  name: 'spaces/AAAA/messages/MSG001',
  text: 'Hello, world!',
  createTime: '2025-06-01T10:00:00Z',
  sender: {
    name: 'users/123',
    displayName: 'Alice',
    type: 'HUMAN',
  },
  thread: {
    name: 'spaces/AAAA/threads/THREAD001',
  },
};

const MESSAGE_LIST_FIXTURE: ListMessagesResponse = {
  messages: [
    MESSAGE_FIXTURE,
    {
      name: 'spaces/AAAA/messages/MSG002',
      text: 'Hi there!',
      createTime: '2025-06-01T10:05:00Z',
      sender: {
        name: 'users/456',
        displayName: 'Bob',
        type: 'HUMAN',
      },
    },
  ],
  nextPageToken: 'msg-token-456',
};

const DM_SPACE_FIXTURE: Space = {
  name: 'spaces/DM123',
  type: 'DM',
  singleUserBotDm: false,
};

// ---------------------------------------------------------------------------
// Tests: Plugin creation
// ---------------------------------------------------------------------------

describe('chat()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a ChatApi with all expected methods', () => {
    const api = chat(http);

    expect(typeof api.listSpaces).toBe('function');
    expect(typeof api.getSpace).toBe('function');
    expect(typeof api.createSpace).toBe('function');
    expect(typeof api.findSpace).toBe('function');
    expect(typeof api.listMessages).toBe('function');
    expect(typeof api.getMessage).toBe('function');
    expect(typeof api.sendMessage).toBe('function');
    expect(typeof api.updateMessage).toBe('function');
    expect(typeof api.deleteMessage).toBe('function');
    expect(typeof api.createDirectMessage).toBe('function');
    expect(typeof api.listDirectMessages).toBe('function');
  });
});

describe('chatPlugin()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a plugin with the correct name and version', () => {
    const plugin = chatPlugin(http);

    expect(plugin.name).toBe('chat');
    expect(plugin.version).toBe('0.1.0');
    expect(typeof plugin.setup).toBe('function');
    expect(typeof plugin.teardown).toBe('function');
  });

  it('stores ChatApi in metadata on setup', () => {
    const plugin = chatPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);

    expect(metadata.has('chat')).toBe(true);
    const api = metadata.get('chat') as ReturnType<typeof chat>;
    expect(typeof api.listSpaces).toBe('function');
  });

  it('removes ChatApi from metadata on teardown', () => {
    const plugin = chatPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);
    expect(metadata.has('chat')).toBe(true);

    plugin.teardown!(ctx);
    expect(metadata.has('chat')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Space operations
// ---------------------------------------------------------------------------

describe('listSpaces()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of spaces on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SPACE_LIST_FIXTURE));

    const result = await listSpaces(http, {
      pageSize: 10,
      filter: 'spaceType = "ROOM"',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.spaces).toHaveLength(2);
      const first = result.value.spaces?.[0];
      expect(first?.displayName).toBe('Team Room');
      expect(result.value.nextPageToken).toBe('token-123');
    }

    expect(http._getHandler).toHaveBeenCalledOnce();
    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/spaces');
    expect(url).toContain('pageSize=10');
    expect(url).toContain('filter=');
  });

  it('returns error on network failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Connection refused'));

    const result = await listSpaces(http);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Connection refused');
    }
  });

  it('does not append query string when no options provided', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SPACE_LIST_FIXTURE));

    await listSpaces(http);

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toBe('https://chat.googleapis.com/v1/spaces');
  });
});

describe('getSpace()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a single space on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SPACE_FIXTURE));

    const result = await getSpace(http, 'spaces/AAAA');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('spaces/AAAA');
      expect(result.value.displayName).toBe('Team Room');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/spaces/AAAA');
  });

  it('returns error when space not found', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Not Found', 404));

    const result = await getSpace(http, 'spaces/NONEXISTENT');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not Found');
    }
  });
});

describe('createSpace()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a space and returns it', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(SPACE_FIXTURE));

    const result = await createSpace(http, 'Team Room');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('spaces/AAAA');
      expect(result.value.displayName).toBe('Team Room');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/spaces');

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({
      displayName: 'Team Room',
      spaceType: 'SPACE',
    });
  });

  it('allows specifying space type', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(DM_SPACE_FIXTURE));

    await createSpace(http, 'DM Space', 'DM');

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body.spaceType).toBe('DM');
  });
});

describe('findSpace()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns the first matching space by display name', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SPACE_LIST_FIXTURE));

    const result = await findSpace(http, 'Team Room');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value?.name).toBe('spaces/AAAA');
      expect(result.value?.displayName).toBe('Team Room');
    }
  });

  it('returns undefined when no matching space found', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SPACE_LIST_FIXTURE));

    const result = await findSpace(http, 'Nonexistent Room');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: Message operations
// ---------------------------------------------------------------------------

describe('listMessages()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of messages on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(MESSAGE_LIST_FIXTURE));

    const result = await listMessages(http, 'spaces/AAAA', {
      pageSize: 10,
      orderBy: 'createTime desc',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.messages).toHaveLength(2);
      const first = result.value.messages?.[0];
      expect(first?.text).toBe('Hello, world!');
    }

    expect(http._getHandler).toHaveBeenCalledOnce();
    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/spaces/AAAA/messages');
    expect(url).toContain('pageSize=10');
    expect(url).toContain('orderBy=');
  });

  it('returns error on network failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Forbidden', 403));

    const result = await listMessages(http, 'spaces/AAAA');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Forbidden');
    }
  });
});

describe('getMessage()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a single message on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(MESSAGE_FIXTURE));

    const result = await getMessage(http, 'spaces/AAAA/messages/MSG001');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('spaces/AAAA/messages/MSG001');
      expect(result.value.text).toBe('Hello, world!');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/spaces/AAAA/messages/MSG001');
  });

  it('returns error when message not found', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Not Found', 404));

    const result = await getMessage(http, 'spaces/AAAA/messages/NONEXISTENT');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not Found');
    }
  });
});

describe('sendMessage()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('sends a message and returns it', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(MESSAGE_FIXTURE));

    const result = await sendMessage(http, 'spaces/AAAA', 'Hello, world!');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('spaces/AAAA/messages/MSG001');
      expect(result.value.text).toBe('Hello, world!');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/spaces/AAAA/messages');

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({
      text: 'Hello, world!',
    });
  });

  it('includes thread key when provided', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(MESSAGE_FIXTURE));

    await sendMessage(http, 'spaces/AAAA', 'Reply', 'thread-key-123');

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({
      text: 'Reply',
      thread: { threadKey: 'thread-key-123' },
    });
  });
});

describe('updateMessage()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('patches a message and returns the updated version', async () => {
    const updatedMessage = { ...MESSAGE_FIXTURE, text: 'Updated text' };
    http._patchHandler.mockResolvedValueOnce(mockResponse(updatedMessage));

    const result = await updateMessage(
      http,
      'spaces/AAAA/messages/MSG001',
      'Updated text',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toBe('Updated text');
    }

    expect(http._patchHandler).toHaveBeenCalledOnce();
    const url = http._patchHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/spaces/AAAA/messages/MSG001');
    expect(url).toContain('updateMask=text');
  });
});

describe('deleteMessage()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('deletes a message successfully', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockResponse(null, 204));

    const result = await deleteMessage(http, 'spaces/AAAA/messages/MSG001');

    expect(result.ok).toBe(true);
    expect(http._deleteHandler).toHaveBeenCalledOnce();

    const url = http._deleteHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/spaces/AAAA/messages/MSG001');
  });
});

// ---------------------------------------------------------------------------
// Tests: Direct message operations
// ---------------------------------------------------------------------------

describe('createDirectMessage()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a DM and sends a message', async () => {
    // Mock listSpaces to return no DM spaces
    http._getHandler.mockResolvedValueOnce(
      mockResponse({ spaces: [] }),
    );

    // Mock createSpace to return a new DM space
    http._postHandler.mockResolvedValueOnce(mockResponse(DM_SPACE_FIXTURE));

    // Mock sendMessage to return the sent message
    http._postHandler.mockResolvedValueOnce(mockResponse(MESSAGE_FIXTURE));

    const result = await createDirectMessage(http, 'users/123', 'Hello!');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toBe('Hello, world!');
    }

    // Should have called getHandler once for listSpaces and postHandler twice for createSpace and sendMessage
    expect(http._getHandler).toHaveBeenCalledOnce();
    expect(http._postHandler).toHaveBeenCalledTimes(2);
  });

  it('reuses existing DM space if found', async () => {
    // Mock listSpaces to return an existing DM space
    http._getHandler.mockResolvedValueOnce(
      mockResponse({
        spaces: [{ ...DM_SPACE_FIXTURE, name: 'spaces/DMusers/123' }],
      }),
    );

    // Mock sendMessage
    http._postHandler.mockResolvedValueOnce(mockResponse(MESSAGE_FIXTURE));

    const result = await createDirectMessage(http, 'users/123', 'Hi again!');

    expect(result.ok).toBe(true);

    // Should have called getHandler once for listSpaces and postHandler once for sendMessage
    expect(http._getHandler).toHaveBeenCalledOnce();
    expect(http._postHandler).toHaveBeenCalledOnce();
  });
});

describe('listDirectMessages()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('lists messages from a DM space', async () => {
    // Mock listSpaces to return a DM space
    http._getHandler.mockResolvedValueOnce(
      mockResponse({
        spaces: [{ ...DM_SPACE_FIXTURE, name: 'spaces/DMusers/123' }],
      }),
    );

    // Mock listMessages
    http._getHandler.mockResolvedValueOnce(mockResponse(MESSAGE_LIST_FIXTURE));

    const result = await listDirectMessages(http, 'users/123', {
      pageSize: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.messages).toHaveLength(2);
    }

    expect(http._getHandler).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Tests: ChatApi facade (via plugin)
// ---------------------------------------------------------------------------

describe('ChatApi facade', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates listSpaces through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SPACE_LIST_FIXTURE));

    const api = chat(http);
    const result = await api.listSpaces({ pageSize: 5 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.spaces).toHaveLength(2);
    }
  });

  it('delegates sendMessage through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(MESSAGE_FIXTURE));

    const api = chat(http);
    const result = await api.sendMessage('spaces/AAAA', 'Test message');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toBe('Hello, world!');
    }
  });

  it('delegates createDirectMessage through the facade', async () => {
    // Mock listSpaces
    http._getHandler.mockResolvedValueOnce(
      mockResponse({ spaces: [] }),
    );

    // Mock createSpace
    http._postHandler.mockResolvedValueOnce(mockResponse(DM_SPACE_FIXTURE));

    // Mock sendMessage
    http._postHandler.mockResolvedValueOnce(mockResponse(MESSAGE_FIXTURE));

    const api = chat(http);
    const result = await api.createDirectMessage('users/123', 'DM test');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('spaces/AAAA/messages/MSG001');
    }
  });
});
