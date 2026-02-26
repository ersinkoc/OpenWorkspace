/**
 * Operation-level tests for @openworkspace/forms.
 * Covers form-ops and responses modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError, WorkspaceError } from '@openworkspace/core';

import { getForm, createForm, batchUpdateForm, addQuestion, deleteItem } from './form-ops.js';
import { listResponses, getResponse } from './responses.js';

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
// form-ops.ts
// ---------------------------------------------------------------------------

describe('form-ops operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('getForm', () => {
    it('should GET form by id', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ formId: 'f1', info: { title: 'Survey' } }));
      const result = await getForm(http, 'f1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.info.title).toBe('Survey');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/forms/f1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getForm(http, 'x');
      expect(result.ok).toBe(false);
    });

    it('should wrap non-WorkspaceError via toWorkspaceError fallback', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockRawErr('raw error') as any);
      const result = await getForm(http, 'x');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(WorkspaceError);
        expect(result.error.message).toBe('raw error');
        expect(result.error.code).toBe('FORMS_ERROR');
      }
    });
  });

  describe('createForm', () => {
    it('should POST new form', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ formId: 'f2', info: { title: 'Feedback' } }));
      const result = await createForm(http, { title: 'Feedback' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.formId).toBe('f2');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createForm(http, { title: 'X' });
      expect(result.ok).toBe(false);
    });
  });

  describe('batchUpdateForm', () => {
    it('should POST batch update requests', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ form: { formId: 'f1' }, replies: [] }));
      const result = await batchUpdateForm(http, 'f1', [
        { createItem: { item: { title: 'Q1' }, location: { index: 0 } } },
      ]);
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain(':batchUpdate');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await batchUpdateForm(http, 'x', []);
      expect(result.ok).toBe(false);
    });
  });

  describe('addQuestion', () => {
    it('should call batchUpdateForm with createItem request', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ form: { formId: 'f1' }, replies: [] }));
      const result = await addQuestion(http, 'f1', { title: 'What is your name?' });
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain(':batchUpdate');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await addQuestion(http, 'x', { title: 'Q' });
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteItem', () => {
    it('should call batchUpdateForm with deleteItem request', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ form: { formId: 'f1' }, replies: [] }));
      const result = await deleteItem(http, 'f1', 0);
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain(':batchUpdate');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await deleteItem(http, 'x', 0);
      expect(result.ok).toBe(false);
    });
  });

  describe('toWorkspaceError fallback (form-ops)', () => {
    it('should wrap a plain Error through getForm', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(err(new Error('plain error') as never));
      const result = await getForm(http, 'x');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('plain error');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// responses.ts
// ---------------------------------------------------------------------------

describe('responses operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listResponses', () => {
    it('should GET form responses', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ responses: [{ responseId: 'r1' }] }));
      const result = await listResponses(http, 'f1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/forms/f1/responses');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listResponses(http, 'x');
      expect(result.ok).toBe(false);
    });

    it('should wrap non-WorkspaceError via toWorkspaceError fallback', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockRawErr('raw error') as any);
      const result = await listResponses(http, 'x');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(WorkspaceError);
        expect(result.error.message).toBe('raw error');
        expect(result.error.code).toBe('FORMS_ERROR');
      }
    });
  });

  describe('getResponse', () => {
    it('should GET a response by id', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ responseId: 'r1', lastSubmittedTime: '2025-01-01' }));
      const result = await getResponse(http, 'f1', 'r1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.responseId).toBe('r1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getResponse(http, 'x', 'y');
      expect(result.ok).toBe(false);
    });
  });

  describe('toWorkspaceError fallback (responses)', () => {
    it('should wrap a plain Error through getResponse', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(err(new Error('plain error') as never));
      const result = await getResponse(http, 'x', 'y');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('plain error');
      }
    });
  });
});
