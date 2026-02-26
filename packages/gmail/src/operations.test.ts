/**
 * Operation-level tests for @openworkspace/gmail.
 * Covers messages, threads, labels, drafts, and send modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';

import { searchMessages, getMessage, batchModify, batchDelete } from './messages.js';
import { searchThreads, getThread, modifyThread } from './threads.js';
import { listLabels, createLabel, deleteLabel } from './labels.js';
import { sendMessage } from './send.js';
import { listDrafts, createDraft, sendDraft } from './drafts.js';
import { GMAIL_BASE_URL, GMAIL_USER_ME } from './types.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createMockHttp(): HttpClient {
  const methods = ['request', 'get', 'post', 'put', 'patch', 'delete'] as const;
  const mock = {
    interceptors: { request: [], response: [], error: [] },
  } as unknown as HttpClient;
  for (const method of methods) {
    (mock as Record<string, unknown>)[method] = vi.fn();
  }
  return mock;
}

function mockOk<T>(data: T): Result<HttpResponse<T>, NetworkError> {
  return ok({ status: 200, statusText: 'OK', headers: { 'content-type': 'application/json' }, data });
}

function mockErr(message: string, statusCode?: number): Result<never, NetworkError> {
  return err(new NetworkError(message, { url: 'test' }, statusCode));
}

// ---------------------------------------------------------------------------
// messages.ts
// ---------------------------------------------------------------------------

describe('messages operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('searchMessages', () => {
    it('should GET messages with query params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ messages: [{ id: 'm1', threadId: 't1' }], resultSizeEstimate: 1 }));
      const result = await searchMessages(http, { q: 'from:alice', maxResults: 5 });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.messages?.[0]?.id).toBe('m1');
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain(`${GMAIL_BASE_URL}/${GMAIL_USER_ME}/messages`);
      expect(url).toContain('q=from%3Aalice');
      expect(url).toContain('maxResults=5');
    });

    it('should call with no query string when no params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ resultSizeEstimate: 0 }));
      await searchMessages(http);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toBe(`${GMAIL_BASE_URL}/${GMAIL_USER_ME}/messages`);
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await searchMessages(http);
      expect(result.ok).toBe(false);
    });
  });

  describe('getMessage', () => {
    it('should GET a single message by id', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ id: 'msg1', threadId: 't1', snippet: 'hi' }));
      const result = await getMessage(http, { id: 'msg1', format: 'full' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe('msg1');
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('/messages/msg1');
      expect(url).toContain('format=full');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('not found', 404));
      const result = await getMessage(http, { id: 'x' });
      expect(result.ok).toBe(false);
    });
  });

  describe('batchModify', () => {
    it('should POST label changes', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk(undefined));
      const result = await batchModify(http, { ids: ['m1'], addLabelIds: ['STARRED'], removeLabelIds: ['UNREAD'] });
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain('/messages/batchModify');
    });

    it('should skip POST for empty ids', async () => {
      const result = await batchModify(http, { ids: [] });
      expect(result.ok).toBe(true);
      expect(http.post).not.toHaveBeenCalled();
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await batchModify(http, { ids: ['m1'] });
      expect(result.ok).toBe(false);
    });
  });

  describe('batchDelete', () => {
    it('should POST message ids', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk(undefined));
      const result = await batchDelete(http, { ids: ['m1', 'm2'] });
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain('/messages/batchDelete');
    });

    it('should skip POST for empty ids', async () => {
      const result = await batchDelete(http, { ids: [] });
      expect(result.ok).toBe(true);
      expect(http.post).not.toHaveBeenCalled();
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await batchDelete(http, { ids: ['m1'] });
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// threads.ts
// ---------------------------------------------------------------------------

describe('threads operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('searchThreads', () => {
    it('should GET threads with params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ threads: [{ id: 't1' }], resultSizeEstimate: 1 }));
      const result = await searchThreads(http, { q: 'is:unread', maxResults: 20 });
      expect(result.ok).toBe(true);
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('/threads');
      expect(url).toContain('q=is%3Aunread');
    });

    it('should include labelIds in query string', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ threads: [], resultSizeEstimate: 0 }));
      await searchThreads(http, { labelIds: ['INBOX', 'STARRED'] });
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('labelIds=INBOX');
      expect(url).toContain('labelIds=STARRED');
    });

    it('should include pageToken and includeSpamTrash in query', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ threads: [], resultSizeEstimate: 0 }));
      await searchThreads(http, { pageToken: 'abc', includeSpamTrash: true });
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('pageToken=abc');
      expect(url).toContain('includeSpamTrash=true');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await searchThreads(http);
      expect(result.ok).toBe(false);
    });
  });

  describe('getThread', () => {
    it('should GET a thread by id', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ id: 't1', messages: [] }));
      const result = await getThread(http, { id: 't1' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe('t1');
    });

    it('should include format and metadataHeaders in query', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ id: 't1', messages: [] }));
      await getThread(http, { id: 't1', format: 'metadata', metadataHeaders: ['Subject', 'From'] });
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('format=metadata');
      expect(url).toContain('metadataHeaders=Subject');
      expect(url).toContain('metadataHeaders=From');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('not found', 404));
      const result = await getThread(http, { id: 'x' });
      expect(result.ok).toBe(false);
    });
  });

  describe('modifyThread', () => {
    it('should POST label modifications', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 't1' }));
      const result = await modifyThread(http, { id: 't1', addLabelIds: ['IMPORTANT'] });
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain('/threads/t1/modify');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await modifyThread(http, { id: 't1' });
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// labels.ts
// ---------------------------------------------------------------------------

describe('labels operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listLabels', () => {
    it('should GET labels', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ labels: [{ id: 'INBOX', name: 'INBOX', type: 'system' }] }));
      const result = await listLabels(http);
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/labels');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listLabels(http);
      expect(result.ok).toBe(false);
    });
  });

  describe('createLabel', () => {
    it('should POST new label', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'Label_1', name: 'Test' }));
      const result = await createLabel(http, { name: 'Test' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.name).toBe('Test');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 400));
      const result = await createLabel(http, { name: 'Bad' });
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteLabel', () => {
    it('should DELETE by id', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await deleteLabel(http, 'Label_1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.delete).mock.calls[0]?.[0]).toContain('/labels/Label_1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('not found', 404));
      const result = await deleteLabel(http, 'x');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// send.ts
// ---------------------------------------------------------------------------

describe('send operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('sendMessage', () => {
    it('should POST a base64url-encoded message', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 's1', threadId: 't1' }));
      const result = await sendMessage(http, { to: 'bob@example.com', subject: 'Test', body: 'Hello' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe('s1');
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain('/messages/send');
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      expect(typeof body?.raw).toBe('string');
    });

    it('should send HTML-only message', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 's2', threadId: 't2' }));
      const result = await sendMessage(http, { to: 'bob@example.com', subject: 'HTML', html: '<p>Hello</p>' });
      expect(result.ok).toBe(true);
    });

    it('should send multipart message with both body and html', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 's3', threadId: 't3' }));
      const result = await sendMessage(http, { to: 'bob@example.com', subject: 'Multi', body: 'Text', html: '<p>HTML</p>' });
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('unauthorized', 401));
      const result = await sendMessage(http, { to: 'a@b.com', subject: 'X', body: 'Y' });
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// drafts.ts
// ---------------------------------------------------------------------------

describe('drafts operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listDrafts', () => {
    it('should GET drafts with params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ drafts: [{ id: 'd1', message: { id: 'm1', threadId: 't1' } }], resultSizeEstimate: 1 }));
      const result = await listDrafts(http, { maxResults: 5 });
      expect(result.ok).toBe(true);
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('/drafts');
      expect(url).toContain('maxResults=5');
    });

    it('should include all query params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ drafts: [], resultSizeEstimate: 0 }));
      await listDrafts(http, { maxResults: 10, pageToken: 'tok123', q: 'subject:test', includeSpamTrash: true });
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('maxResults=10');
      expect(url).toContain('pageToken=tok123');
      expect(url).toContain('q=subject%3Atest');
      expect(url).toContain('includeSpamTrash=true');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listDrafts(http);
      expect(result.ok).toBe(false);
    });
  });

  describe('createDraft', () => {
    it('should POST a draft with raw message', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'd1', message: { id: 'm1', threadId: 't1' } }));
      const result = await createDraft(http, { to: 'bob@example.com', subject: 'Draft', body: 'Content' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe('d1');
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      expect(body?.message).toBeDefined();
    });

    it('should create draft with HTML-only body', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'd2', message: { id: 'm2', threadId: 't2' } }));
      const result = await createDraft(http, { to: 'bob@example.com', subject: 'HTML Draft', html: '<b>Bold</b>' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe('d2');
    });

    it('should create draft with both body and HTML (multipart)', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'd3', message: { id: 'm3', threadId: 't3' } }));
      const result = await createDraft(http, {
        to: 'bob@example.com',
        subject: 'Multipart Draft',
        body: 'Plain text version',
        html: '<p>HTML version</p>',
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe('d3');
    });

    it('should include cc, bcc, replyTo, inReplyTo, references headers', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'd4', message: { id: 'm4', threadId: 't4' } }));
      const result = await createDraft(http, {
        to: ['a@b.com', 'c@d.com'],
        subject: 'Full Headers',
        body: 'Content',
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
        replyTo: 'reply@example.com',
        inReplyTo: '<msg123@example.com>',
        references: '<msg001@example.com>',
      });
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createDraft(http, { to: 'a@b.com', subject: 'X', body: 'Y' });
      expect(result.ok).toBe(false);
    });
  });

  describe('sendDraft', () => {
    it('should POST to drafts/send with draft id', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'm1', threadId: 't1' }));
      const result = await sendDraft(http, 'draft_abc');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe('m1');
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain('/drafts/send');
      expect(vi.mocked(http.post).mock.calls[0]?.[1]?.body).toEqual({ id: 'draft_abc' });
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await sendDraft(http, 'x');
      expect(result.ok).toBe(false);
    });
  });
});
