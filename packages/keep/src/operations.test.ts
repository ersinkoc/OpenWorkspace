/**
 * Operation-level tests for @openworkspace/keep.
 * Covers notes and attachments modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError, WorkspaceError } from '@openworkspace/core';

import { listNotes, getNote, createNote, createListNote, deleteNote, searchNotes } from './notes.js';
import { getAttachment, downloadAttachment } from './attachments.js';

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
/** Returns an error result whose error is a plain Error (not a WorkspaceError). */
function mockRawErr(message: string): Result<never, Error> {
  return err(new Error(message));
}

// ---------------------------------------------------------------------------
// notes.ts
// ---------------------------------------------------------------------------

describe('notes operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listNotes', () => {
    it('should GET notes', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ notes: [{ name: 'notes/n1', title: 'My Note' }] }));
      const result = await listNotes(http);
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/notes');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listNotes(http);
      expect(result.ok).toBe(false);
    });

    it('should wrap non-WorkspaceError via toWorkspaceError fallback', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockRawErr('raw error') as any);
      const result = await listNotes(http);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(WorkspaceError);
        expect(result.error.message).toBe('raw error');
        expect(result.error.code).toBe('KEEP_ERROR');
      }
    });
  });

  describe('getNote', () => {
    it('should GET note by name', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ name: 'notes/n1', title: 'My Note' }));
      const result = await getNote(http, 'notes/n1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('My Note');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getNote(http, 'notes/x');
      expect(result.ok).toBe(false);
    });
  });

  describe('createNote', () => {
    it('should POST new text note', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ name: 'notes/n2', title: 'Meeting' }));
      const result = await createNote(http, 'Meeting', 'Discussed project timeline...');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('Meeting');
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      expect(body?.title).toBe('Meeting');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createNote(http, 'X', 'Y');
      expect(result.ok).toBe(false);
    });
  });

  describe('createListNote', () => {
    it('should POST new checklist note', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ name: 'notes/n3', title: 'Shopping' }));
      const result = await createListNote(http, 'Shopping', ['Milk', 'Eggs']);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('Shopping');
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      expect(body?.title).toBe('Shopping');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createListNote(http, 'X', []);
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteNote', () => {
    it('should DELETE note', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await deleteNote(http, 'notes/n1');
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await deleteNote(http, 'notes/x');
      expect(result.ok).toBe(false);
    });
  });

  describe('searchNotes', () => {
    it('should fetch all notes and filter client-side', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ notes: [] }));
      const result = await searchNotes(http, 'meeting');
      expect(result.ok).toBe(true);
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).not.toContain('filter=');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await searchNotes(http, 'x');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// attachments.ts
// ---------------------------------------------------------------------------

describe('attachments operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('getAttachment', () => {
    it('should GET attachment metadata', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        name: 'notes/n1/attachments/a1',
        mimeType: ['image/png'],
      }));
      const result = await getAttachment(http, 'notes/n1/attachments/a1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.name).toBe('notes/n1/attachments/a1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getAttachment(http, 'notes/x/attachments/y');
      expect(result.ok).toBe(false);
    });

    it('should wrap non-WorkspaceError via toWorkspaceError fallback', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockRawErr('raw error') as any);
      const result = await getAttachment(http, 'notes/x/attachments/y');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(WorkspaceError);
        expect(result.error.message).toBe('raw error');
        expect(result.error.code).toBe('KEEP_ERROR');
      }
    });
  });

  describe('downloadAttachment', () => {
    it('should GET attachment content', async () => {
      const buffer = new ArrayBuffer(8);
      vi.mocked(http.get).mockResolvedValueOnce(mockOk(buffer));
      const result = await downloadAttachment(http, 'notes/n1/attachments/a1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(buffer);
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('alt=media');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await downloadAttachment(http, 'notes/x/attachments/y');
      expect(result.ok).toBe(false);
    });

    it('should wrap non-WorkspaceError in toWorkspaceError', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(err(new Error('plain error') as never));
      const result = await downloadAttachment(http, 'notes/x/attachments/y');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('plain error');
      }
    });
  });

  describe('toWorkspaceError fallback (notes)', () => {
    it('should wrap a plain string error via notes operation', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(err('string error' as never));
      const result = await getNote(http, 'notes/x');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('string error');
      }
    });
  });
});
