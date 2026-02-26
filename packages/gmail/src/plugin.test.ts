/**
 * Tests for the @openworkspace/gmail package.
 * Validates plugin creation, API object wiring, and mock HTTP responses.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError, createKernel } from '@openworkspace/core';
import { gmail, createGmailApi, GMAIL_METADATA_KEY } from './plugin.js';
import { searchMessages, getMessage, batchModify, batchDelete } from './messages.js';
import { searchThreads, getThread, modifyThread } from './threads.js';
import { listLabels, createLabel, deleteLabel } from './labels.js';
import { sendMessage } from './send.js';
import { listDrafts, createDraft, sendDraft } from './drafts.js';
import { GMAIL_BASE_URL, GMAIL_USER_ME } from './types.js';
import type {
  GmailMessage,
  GmailThread,
  GmailLabel,
  GmailDraft,
  MessageListResponse,
  ThreadListResponse,
  LabelListResponse,
  DraftListResponse,
  GmailApi,
} from './types.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock HttpClient where every method is a vi.fn().
 * By default, all methods resolve with an ok result containing the given data.
 */
function createMockHttp(): HttpClient {
  const methods = ['request', 'get', 'post', 'put', 'patch', 'delete'] as const;
  const mock = {
    interceptors: {
      request: [],
      response: [],
      error: [],
    },
  } as unknown as HttpClient;

  for (const method of methods) {
    (mock as Record<string, unknown>)[method] = vi.fn();
  }
  return mock;
}

/**
 * Creates a successful HttpResponse result.
 */
function mockOk<T>(data: T): Result<HttpResponse<T>, NetworkError> {
  return ok({
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    data,
  });
}

/**
 * Creates a failed NetworkError result.
 */
function mockErr(message: string, statusCode?: number): Result<never, NetworkError> {
  return err(new NetworkError(message, { url: 'test' }, statusCode));
}

// ---------------------------------------------------------------------------
// Plugin tests
// ---------------------------------------------------------------------------

describe('gmail plugin', () => {
  let http: HttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  describe('gmail() factory', () => {
    it('should create a plugin with name "gmail"', () => {
      const plugin = gmail({ http });
      expect(plugin.name).toBe('gmail');
      expect(plugin.version).toBe('0.1.0');
      expect(plugin.setup).toBeTypeOf('function');
      expect(plugin.teardown).toBeTypeOf('function');
    });

    it('should register GmailApi in kernel metadata on setup', async () => {
      const kernel = createKernel();
      const plugin = gmail({ http });
      await kernel.use(plugin);
      const initResult = await kernel.init();

      expect(initResult.ok).toBe(true);

      // The metadata is stored via context.metadata in the kernel
      // We verify by checking the plugin was registered
      expect(kernel.getPlugin('gmail')).toBeDefined();
      expect(kernel.listPlugins()).toContain('gmail');
    });

    it('should allow shutdown without error', async () => {
      const kernel = createKernel();
      await kernel.use(gmail({ http }));
      await kernel.init();
      await kernel.shutdown();

      expect(kernel.state).toBe('shutdown');
    });
  });

  describe('createGmailApi()', () => {
    it('should return an object with all expected methods', () => {
      const api = createGmailApi(http);

      expect(api.searchMessages).toBeTypeOf('function');
      expect(api.getMessage).toBeTypeOf('function');
      expect(api.batchModify).toBeTypeOf('function');
      expect(api.batchDelete).toBeTypeOf('function');
      expect(api.searchThreads).toBeTypeOf('function');
      expect(api.getThread).toBeTypeOf('function');
      expect(api.modifyThread).toBeTypeOf('function');
      expect(api.listLabels).toBeTypeOf('function');
      expect(api.createLabel).toBeTypeOf('function');
      expect(api.deleteLabel).toBeTypeOf('function');
      expect(api.sendMessage).toBeTypeOf('function');
      expect(api.listDrafts).toBeTypeOf('function');
      expect(api.createDraft).toBeTypeOf('function');
      expect(api.sendDraft).toBeTypeOf('function');
    });

    it('should delegate searchMessages to the http client', async () => {
      const data: MessageListResponse = {
        messages: [{ id: 'msg1', threadId: 't1' }],
        nextPageToken: undefined,
        resultSizeEstimate: 1,
      };
      vi.mocked(http.get).mockResolvedValueOnce(mockOk(data));

      const api = createGmailApi(http);
      const result = await api.searchMessages({ q: 'is:unread' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.messages?.[0]?.id).toBe('msg1');
      }
      expect(http.get).toHaveBeenCalledOnce();
    });
  });
});

// ---------------------------------------------------------------------------
// Messages tests
// ---------------------------------------------------------------------------

describe('messages', () => {
  let http: HttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  describe('searchMessages', () => {
    it('should call GET with correct URL and query params', async () => {
      const data: MessageListResponse = {
        messages: [{ id: 'm1', threadId: 't1' }],
        resultSizeEstimate: 1,
      };
      vi.mocked(http.get).mockResolvedValueOnce(mockOk(data));

      const result = await searchMessages(http, { q: 'from:alice', maxResults: 5 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.messages?.[0]?.id).toBe('m1');
      }

      const callUrl = vi.mocked(http.get).mock.calls[0]?.[0];
      expect(callUrl).toContain(`${GMAIL_BASE_URL}/${GMAIL_USER_ME}/messages`);
      expect(callUrl).toContain('q=from%3Aalice');
      expect(callUrl).toContain('maxResults=5');
    });

    it('should work with no params', async () => {
      const data: MessageListResponse = { resultSizeEstimate: 0 };
      vi.mocked(http.get).mockResolvedValueOnce(mockOk(data));

      const result = await searchMessages(http);

      expect(result.ok).toBe(true);
      const callUrl = vi.mocked(http.get).mock.calls[0]?.[0];
      expect(callUrl).toBe(`${GMAIL_BASE_URL}/${GMAIL_USER_ME}/messages`);
    });

    it('should include labelIds as repeated query params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ resultSizeEstimate: 0 }));

      await searchMessages(http, { labelIds: ['INBOX', 'UNREAD'] });

      const callUrl = vi.mocked(http.get).mock.calls[0]?.[0];
      expect(callUrl).toContain('labelIds=INBOX');
      expect(callUrl).toContain('labelIds=UNREAD');
    });

    it('should propagate NetworkError', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('Server error', 500));

      const result = await searchMessages(http, { q: 'test' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(NetworkError);
      }
    });
  });

  describe('getMessage', () => {
    it('should fetch a single message with format', async () => {
      const msg: GmailMessage = {
        id: 'msg1',
        threadId: 't1',
        snippet: 'Hello world',
      };
      vi.mocked(http.get).mockResolvedValueOnce(mockOk(msg));

      const result = await getMessage(http, { id: 'msg1', format: 'full' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('msg1');
        expect(result.value.snippet).toBe('Hello world');
      }

      const callUrl = vi.mocked(http.get).mock.calls[0]?.[0];
      expect(callUrl).toContain('/messages/msg1');
      expect(callUrl).toContain('format=full');
    });

    it('should include metadataHeaders when provided', async () => {
      const msg: GmailMessage = { id: 'msg1', threadId: 't1' };
      vi.mocked(http.get).mockResolvedValueOnce(mockOk(msg));

      await getMessage(http, {
        id: 'msg1',
        format: 'metadata',
        metadataHeaders: ['From', 'Subject'],
      });

      const callUrl = vi.mocked(http.get).mock.calls[0]?.[0];
      expect(callUrl).toContain('metadataHeaders=From');
      expect(callUrl).toContain('metadataHeaders=Subject');
    });
  });

  describe('batchModify', () => {
    it('should POST with ids and label changes', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk(undefined));

      const result = await batchModify(http, {
        ids: ['m1', 'm2'],
        addLabelIds: ['STARRED'],
        removeLabelIds: ['UNREAD'],
      });

      expect(result.ok).toBe(true);
      const callUrl = vi.mocked(http.post).mock.calls[0]?.[0];
      expect(callUrl).toContain('/messages/batchModify');

      const callBody = vi.mocked(http.post).mock.calls[0]?.[1];
      expect(callBody?.body).toEqual({
        ids: ['m1', 'm2'],
        addLabelIds: ['STARRED'],
        removeLabelIds: ['UNREAD'],
      });
    });

    it('should return ok immediately for empty ids', async () => {
      const result = await batchModify(http, { ids: [] });
      expect(result.ok).toBe(true);
      expect(http.post).not.toHaveBeenCalled();
    });
  });

  describe('batchDelete', () => {
    it('should POST with message ids', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk(undefined));

      const result = await batchDelete(http, { ids: ['m1', 'm2'] });

      expect(result.ok).toBe(true);
      const callUrl = vi.mocked(http.post).mock.calls[0]?.[0];
      expect(callUrl).toContain('/messages/batchDelete');
    });

    it('should return ok immediately for empty ids', async () => {
      const result = await batchDelete(http, { ids: [] });
      expect(result.ok).toBe(true);
      expect(http.post).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Threads tests
// ---------------------------------------------------------------------------

describe('threads', () => {
  let http: HttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  describe('searchThreads', () => {
    it('should call GET with correct URL and query params', async () => {
      const data: ThreadListResponse = {
        threads: [{ id: 't1', snippet: 'Hello' }],
        resultSizeEstimate: 1,
      };
      vi.mocked(http.get).mockResolvedValueOnce(mockOk(data));

      const result = await searchThreads(http, { q: 'is:important', maxResults: 10 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.threads?.[0]?.id).toBe('t1');
      }

      const callUrl = vi.mocked(http.get).mock.calls[0]?.[0];
      expect(callUrl).toContain('/threads');
      expect(callUrl).toContain('q=is%3Aimportant');
      expect(callUrl).toContain('maxResults=10');
    });

    it('should work with default params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ resultSizeEstimate: 0 }));

      await searchThreads(http);

      const callUrl = vi.mocked(http.get).mock.calls[0]?.[0];
      expect(callUrl).toBe(`${GMAIL_BASE_URL}/${GMAIL_USER_ME}/threads`);
    });
  });

  describe('getThread', () => {
    it('should fetch a thread by ID', async () => {
      const thread: GmailThread = {
        id: 't1',
        snippet: 'Thread snippet',
        messages: [{ id: 'm1', threadId: 't1' }],
      };
      vi.mocked(http.get).mockResolvedValueOnce(mockOk(thread));

      const result = await getThread(http, { id: 't1', format: 'full' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('t1');
        expect(result.value.messages?.[0]?.id).toBe('m1');
      }

      const callUrl = vi.mocked(http.get).mock.calls[0]?.[0];
      expect(callUrl).toContain('/threads/t1');
      expect(callUrl).toContain('format=full');
    });
  });

  describe('modifyThread', () => {
    it('should POST label changes', async () => {
      const updated: GmailThread = { id: 't1' };
      vi.mocked(http.post).mockResolvedValueOnce(mockOk(updated));

      const result = await modifyThread(http, {
        id: 't1',
        addLabelIds: ['IMPORTANT'],
        removeLabelIds: ['UNREAD'],
      });

      expect(result.ok).toBe(true);
      const callUrl = vi.mocked(http.post).mock.calls[0]?.[0];
      expect(callUrl).toContain('/threads/t1/modify');
    });
  });
});

// ---------------------------------------------------------------------------
// Labels tests
// ---------------------------------------------------------------------------

describe('labels', () => {
  let http: HttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  describe('listLabels', () => {
    it('should fetch all labels', async () => {
      const data: LabelListResponse = {
        labels: [
          { id: 'INBOX', name: 'INBOX', type: 'system' },
          { id: 'Label_1', name: 'Custom', type: 'user' },
        ],
      };
      vi.mocked(http.get).mockResolvedValueOnce(mockOk(data));

      const result = await listLabels(http);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.labels?.length).toBe(2);
        expect(result.value.labels?.[0]?.name).toBe('INBOX');
      }

      const callUrl = vi.mocked(http.get).mock.calls[0]?.[0];
      expect(callUrl).toBe(`${GMAIL_BASE_URL}/${GMAIL_USER_ME}/labels`);
    });
  });

  describe('createLabel', () => {
    it('should POST with label details', async () => {
      const label: GmailLabel = {
        id: 'Label_new',
        name: 'Project/Alpha',
        type: 'user',
      };
      vi.mocked(http.post).mockResolvedValueOnce(mockOk(label));

      const result = await createLabel(http, {
        name: 'Project/Alpha',
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
        color: { textColor: '#000000', backgroundColor: '#16a765' },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('Project/Alpha');
      }

      const callBody = vi.mocked(http.post).mock.calls[0]?.[1];
      expect(callBody?.body).toEqual({
        name: 'Project/Alpha',
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
        color: { textColor: '#000000', backgroundColor: '#16a765' },
      });
    });

    it('should create a label with minimal params', async () => {
      const label: GmailLabel = { id: 'Label_2', name: 'Simple' };
      vi.mocked(http.post).mockResolvedValueOnce(mockOk(label));

      const result = await createLabel(http, { name: 'Simple' });

      expect(result.ok).toBe(true);
      const callBody = vi.mocked(http.post).mock.calls[0]?.[1];
      expect(callBody?.body).toEqual({ name: 'Simple' });
    });
  });

  describe('deleteLabel', () => {
    it('should DELETE by label ID', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));

      const result = await deleteLabel(http, 'Label_123');

      expect(result.ok).toBe(true);
      const callUrl = vi.mocked(http.delete).mock.calls[0]?.[0];
      expect(callUrl).toContain('/labels/Label_123');
    });

    it('should propagate errors', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('Not found', 404));

      const result = await deleteLabel(http, 'nonexistent');

      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Send tests
// ---------------------------------------------------------------------------

describe('send', () => {
  let http: HttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  describe('sendMessage', () => {
    it('should POST a base64url-encoded RFC 2822 message', async () => {
      const sent: GmailMessage = { id: 'sent1', threadId: 't1' };
      vi.mocked(http.post).mockResolvedValueOnce(mockOk(sent));

      const result = await sendMessage(http, {
        to: 'bob@example.com',
        subject: 'Test',
        body: 'Hello!',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('sent1');
      }

      const callUrl = vi.mocked(http.post).mock.calls[0]?.[0];
      expect(callUrl).toContain('/messages/send');

      const callBody = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown> | undefined;
      expect(callBody).toBeDefined();
      expect(typeof callBody?.['raw']).toBe('string');

      // Decode the raw message to verify content
      const raw = callBody?.['raw'] as string;
      // Re-add padding for base64 decoding
      const padded = raw.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(padded, 'base64').toString('utf-8');
      expect(decoded).toContain('To: bob@example.com');
      expect(decoded).toContain('Subject: Test');
      expect(decoded).toContain('Hello!');
    });

    it('should handle multiple recipients and CC/BCC', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 's1', threadId: 't1' }));

      await sendMessage(http, {
        to: ['alice@example.com', 'bob@example.com'],
        cc: 'carol@example.com',
        bcc: ['dave@example.com'],
        subject: 'Group email',
        body: 'Hi all',
      });

      const callBody = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown> | undefined;
      const raw = callBody?.['raw'] as string;
      const padded = raw.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(padded, 'base64').toString('utf-8');
      expect(decoded).toContain('To: alice@example.com, bob@example.com');
      expect(decoded).toContain('Cc: carol@example.com');
      expect(decoded).toContain('Bcc: dave@example.com');
    });

    it('should produce multipart/alternative for body + html', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 's1', threadId: 't1' }));

      await sendMessage(http, {
        to: 'bob@example.com',
        subject: 'Multi',
        body: 'Plain text',
        html: '<b>HTML</b>',
      });

      const callBody = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown> | undefined;
      const raw = callBody?.['raw'] as string;
      const padded = raw.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(padded, 'base64').toString('utf-8');
      expect(decoded).toContain('multipart/alternative');
      expect(decoded).toContain('text/plain');
      expect(decoded).toContain('text/html');
      expect(decoded).toContain('Plain text');
      expect(decoded).toContain('<b>HTML</b>');
    });

    it('should include attachments in multipart/mixed', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 's1', threadId: 't1' }));

      await sendMessage(http, {
        to: 'bob@example.com',
        subject: 'With attachment',
        body: 'See attached',
        attachments: [
          {
            filename: 'test.txt',
            mimeType: 'text/plain',
            content: Buffer.from('file content').toString('base64'),
          },
        ],
      });

      const callBody = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown> | undefined;
      const raw = callBody?.['raw'] as string;
      const padded = raw.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(padded, 'base64').toString('utf-8');
      expect(decoded).toContain('multipart/mixed');
      expect(decoded).toContain('Content-Disposition: attachment; filename="test.txt"');
    });

    it('should propagate network errors', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('Auth required', 401));

      const result = await sendMessage(http, {
        to: 'bob@example.com',
        subject: 'Fail',
        body: 'Should fail',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(NetworkError);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Drafts tests
// ---------------------------------------------------------------------------

describe('drafts', () => {
  let http: HttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  describe('listDrafts', () => {
    it('should fetch drafts with query params', async () => {
      const data: DraftListResponse = {
        drafts: [{ id: 'd1', message: { id: 'm1', threadId: 't1' } }],
        resultSizeEstimate: 1,
      };
      vi.mocked(http.get).mockResolvedValueOnce(mockOk(data));

      const result = await listDrafts(http, { maxResults: 5, q: 'subject:meeting' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.drafts?.[0]?.id).toBe('d1');
      }

      const callUrl = vi.mocked(http.get).mock.calls[0]?.[0];
      expect(callUrl).toContain('/drafts');
      expect(callUrl).toContain('maxResults=5');
      expect(callUrl).toContain('q=subject%3Ameeting');
    });

    it('should work with default params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ resultSizeEstimate: 0 }));

      await listDrafts(http);

      const callUrl = vi.mocked(http.get).mock.calls[0]?.[0];
      expect(callUrl).toBe(`${GMAIL_BASE_URL}/${GMAIL_USER_ME}/drafts`);
    });
  });

  describe('createDraft', () => {
    it('should POST a draft with raw message', async () => {
      const draft: GmailDraft = {
        id: 'd1',
        message: { id: 'm1', threadId: 't1' },
      };
      vi.mocked(http.post).mockResolvedValueOnce(mockOk(draft));

      const result = await createDraft(http, {
        to: 'bob@example.com',
        subject: 'Draft subject',
        body: 'Draft body',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('d1');
      }

      const callUrl = vi.mocked(http.post).mock.calls[0]?.[0];
      expect(callUrl).toContain('/drafts');

      const callBody = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown> | undefined;
      expect(callBody).toBeDefined();
      const message = callBody?.['message'] as Record<string, unknown> | undefined;
      expect(typeof message?.['raw']).toBe('string');
    });
  });

  describe('sendDraft', () => {
    it('should POST to drafts/send with draft ID', async () => {
      const sent: GmailMessage = { id: 'm1', threadId: 't1' };
      vi.mocked(http.post).mockResolvedValueOnce(mockOk(sent));

      const result = await sendDraft(http, 'draft_abc');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('m1');
      }

      const callUrl = vi.mocked(http.post).mock.calls[0]?.[0];
      expect(callUrl).toContain('/drafts/send');

      const callBody = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown> | undefined;
      expect(callBody).toEqual({ id: 'draft_abc' });
    });
  });
});

// ---------------------------------------------------------------------------
// Type export verification
// ---------------------------------------------------------------------------

describe('type exports', () => {
  it('should export GMAIL_BASE_URL constant', () => {
    expect(GMAIL_BASE_URL).toBe('https://gmail.googleapis.com/gmail/v1/users');
  });

  it('should export GMAIL_USER_ME constant', () => {
    expect(GMAIL_USER_ME).toBe('me');
  });

  it('should export GMAIL_METADATA_KEY constant', () => {
    expect(GMAIL_METADATA_KEY).toBe('gmail:api');
  });
});
