/**
 * Operation-level tests for @openworkspace/chat.
 * Covers spaces, messages, and dm modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';

import { listSpaces, getSpace, createSpace, findSpace } from './spaces.js';
import { listMessages, getMessage, sendMessage, updateMessage, deleteMessage } from './messages.js';
import { createDirectMessage, listDirectMessages } from './dm.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createMockHttp(): HttpClient {
  const methods = ['request', 'get', 'post', 'put', 'patch', 'delete'] as const;
  const mock = { interceptors: { request: [], response: [], error: [] } } as unknown as HttpClient;
  for (const method of methods) {
    (mock as Record<string, unknown>)[method] = vi.fn();
  }
  return mock;
}

function mockOk<T>(data: T): Result<HttpResponse<T>, NetworkError> {
  return ok({ status: 200, statusText: 'OK', headers: {}, data });
}

function mockErr(message: string, statusCode?: number): Result<never, NetworkError> {
  return err(new NetworkError(message, { url: 'test' }, statusCode));
}

// ---------------------------------------------------------------------------
// spaces.ts
// ---------------------------------------------------------------------------

describe('spaces operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listSpaces', () => {
    it('should GET spaces', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ spaces: [{ name: 'spaces/AAA', displayName: 'General' }] }));
      const result = await listSpaces(http);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.spaces?.[0]?.displayName).toBe('General');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/spaces');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listSpaces(http);
      expect(result.ok).toBe(false);
    });
  });

  describe('getSpace', () => {
    it('should GET a space by name', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ name: 'spaces/AAA', displayName: 'General' }));
      const result = await getSpace(http, 'spaces/AAA');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.name).toBe('spaces/AAA');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getSpace(http, 'spaces/x');
      expect(result.ok).toBe(false);
    });
  });

  describe('createSpace', () => {
    it('should POST new space', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ name: 'spaces/BBB', displayName: 'New' }));
      const result = await createSpace(http, 'New');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.displayName).toBe('New');
      expect(vi.mocked(http.post).mock.calls[0]?.[1]?.body).toEqual({ displayName: 'New', spaceType: 'SPACE' });
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createSpace(http, 'X');
      expect(result.ok).toBe(false);
    });
  });

  describe('findSpace', () => {
    it('should find space by display name', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        spaces: [
          { name: 'spaces/AAA', displayName: 'General' },
          { name: 'spaces/BBB', displayName: 'Team' },
        ],
      }));
      const result = await findSpace(http, 'Team');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value?.name).toBe('spaces/BBB');
    });

    it('should return undefined when not found', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ spaces: [] }));
      const result = await findSpace(http, 'Nonexistent');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// messages.ts
// ---------------------------------------------------------------------------

describe('messages operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listMessages', () => {
    it('should GET messages in a space', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ messages: [{ name: 'spaces/AAA/messages/BBB', text: 'hi' }] }));
      const result = await listMessages(http, 'spaces/AAA');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/spaces/AAA/messages');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listMessages(http, 'spaces/x');
      expect(result.ok).toBe(false);
    });
  });

  describe('getMessage', () => {
    it('should GET a message by name', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ name: 'spaces/AAA/messages/BBB', text: 'hello' }));
      const result = await getMessage(http, 'spaces/AAA/messages/BBB');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.text).toBe('hello');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getMessage(http, 'spaces/x/messages/y');
      expect(result.ok).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should POST a message', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ name: 'spaces/AAA/messages/CCC', text: 'yo' }));
      const result = await sendMessage(http, 'spaces/AAA', 'yo');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.text).toBe('yo');
    });

    it('should include threadKey when provided', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ name: 'spaces/AAA/messages/CCC', text: 'yo' }));
      await sendMessage(http, 'spaces/AAA', 'yo', 'thread1');
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      expect(body?.thread).toEqual({ threadKey: 'thread1' });
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await sendMessage(http, 'spaces/x', 'msg');
      expect(result.ok).toBe(false);
    });
  });

  describe('updateMessage', () => {
    it('should PATCH message text', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockOk({ name: 'spaces/AAA/messages/BBB', text: 'updated' }));
      const result = await updateMessage(http, 'spaces/AAA/messages/BBB', 'updated');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.text).toBe('updated');
      const url = vi.mocked(http.patch).mock.calls[0]?.[0] as string;
      expect(url).toContain('updateMask=text');
    });

    it('should propagate error', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await updateMessage(http, 'spaces/x/messages/y', 'z');
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteMessage', () => {
    it('should DELETE a message', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await deleteMessage(http, 'spaces/AAA/messages/BBB');
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await deleteMessage(http, 'spaces/x/messages/y');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// dm.ts
// ---------------------------------------------------------------------------

describe('dm operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('createDirectMessage', () => {
    it('should find/create DM space then send message', async () => {
      // listSpaces call
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ spaces: [{ name: 'spaces/DM1', type: 'DM', displayName: '' }] }));
      // Since no match, creates a new DM space
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ name: 'spaces/DM_NEW', type: 'DM' }));
      // sendMessage call
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ name: 'spaces/DM_NEW/messages/M1', text: 'Hello!' }));

      const result = await createDirectMessage(http, 'users/123', 'Hello!');
      expect(result.ok).toBe(true);
    });

    it('should propagate error from listSpaces', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createDirectMessage(http, 'users/123', 'Hello!');
      expect(result.ok).toBe(false);
    });
  });

  describe('listDirectMessages', () => {
    it('should find/create DM space then list messages', async () => {
      // listSpaces + create space
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ spaces: [] }));
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ name: 'spaces/DM_NEW', type: 'DM' }));
      // listMessages call
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ messages: [] }));

      const result = await listDirectMessages(http, 'users/123');
      expect(result.ok).toBe(true);
    });
  });
});
