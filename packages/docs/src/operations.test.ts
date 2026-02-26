/**
 * Operation-level tests for @openworkspace/docs.
 * Covers documents, content, and export modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';

import { getDocument, createDocument, copyDocument, getDocumentTabs } from './documents.js';
import { readText, batchUpdate, insertText, deleteContent, replaceAllText } from './content.js';
import { exportDocument } from './export.js';

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
// documents.ts
// ---------------------------------------------------------------------------

describe('documents operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('getDocument', () => {
    it('should GET document by id', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ documentId: 'doc1', title: 'My Doc', body: { content: [] } }));
      const result = await getDocument(http, 'doc1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('My Doc');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/documents/doc1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getDocument(http, 'x');
      expect(result.ok).toBe(false);
    });

    it('should wrap non-WorkspaceError via toWorkspaceError fallback', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(err(new Error('raw') as unknown as NetworkError));
      const result = await getDocument(http, 'x');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.message).toBe('raw');
    });
  });

  describe('createDocument', () => {
    it('should POST new document', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ documentId: 'doc2', title: 'New', body: { content: [] } }));
      const result = await createDocument(http, 'New');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.documentId).toBe('doc2');
      expect(vi.mocked(http.post).mock.calls[0]?.[1]?.body).toEqual({ title: 'New' });
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createDocument(http, 'X');
      expect(result.ok).toBe(false);
    });
  });

  describe('copyDocument', () => {
    it('should POST to drive copy then GET document', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'copied1' }));
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ documentId: 'copied1', title: 'Copy', body: { content: [] } }));
      const result = await copyDocument(http, 'doc1', 'Copy');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.documentId).toBe('copied1');
    });

    it('should propagate error from drive copy', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await copyDocument(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('getDocumentTabs', () => {
    it('should GET document tabs', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ tabs: [{ tab: { tabProperties: { title: 'Tab1' } } }] }));
      const result = await getDocumentTabs(http, 'doc1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/documents/doc1/tabs');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getDocumentTabs(http, 'x');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// content.ts
// ---------------------------------------------------------------------------

describe('content operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('readText', () => {
    it('should read text from document paragraphs', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        documentId: 'doc1',
        title: 'Test',
        body: {
          content: [
            { paragraph: { elements: [{ textRun: { content: 'Hello ' } }] } },
            { paragraph: { elements: [{ textRun: { content: 'World' } }] } },
          ],
        },
      }));
      const result = await readText(http, 'doc1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('Hello World');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await readText(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('batchUpdate', () => {
    it('should POST batch update requests', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ documentId: 'doc1', replies: [] }));
      const result = await batchUpdate(http, 'doc1', [
        { insertText: { location: { index: 1 }, text: 'Hello' } },
      ]);
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain(':batchUpdate');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await batchUpdate(http, 'x', []);
      expect(result.ok).toBe(false);
    });

    it('should wrap non-WorkspaceError via toWorkspaceError fallback', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(err(new Error('raw') as unknown as NetworkError));
      const result = await batchUpdate(http, 'x', []);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.message).toBe('raw');
    });
  });

  describe('insertText', () => {
    it('should call batchUpdate with insertText request', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ documentId: 'doc1', replies: [] }));
      const result = await insertText(http, 'doc1', 'Hello', 1);
      expect(result.ok).toBe(true);
    });
  });

  describe('deleteContent', () => {
    it('should call batchUpdate with deleteContentRange request', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ documentId: 'doc1', replies: [] }));
      const result = await deleteContent(http, 'doc1', 10, 20);
      expect(result.ok).toBe(true);
    });
  });

  describe('replaceAllText', () => {
    it('should call batchUpdate with replaceAllText request', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ documentId: 'doc1', replies: [] }));
      const result = await replaceAllText(http, 'doc1', 'foo', 'bar');
      expect(result.ok).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// export.ts
// ---------------------------------------------------------------------------

describe('export operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('exportDocument', () => {
    it('should GET from drive export endpoint', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk('pdf content'));
      const result = await exportDocument(http, 'doc1', 'application/pdf');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('pdf content');
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('/export');
      expect(url).toContain('mimeType=application%2Fpdf');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await exportDocument(http, 'x', 'application/pdf');
      expect(result.ok).toBe(false);
    });

    it('should wrap non-WorkspaceError via toWorkspaceError fallback', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(err(new Error('raw') as unknown as NetworkError));
      const result = await exportDocument(http, 'x', 'application/pdf');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.message).toBe('raw');
    });
  });
});
