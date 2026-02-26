/**
 * Operation-level tests for @openworkspace/slides.
 * Covers presentations, slide-ops, and export modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';

import { getPresentation, createPresentation, getSlide } from './presentations.js';
import { batchUpdate, addSlide, deleteSlide, replaceAllText, updateSpeakerNotes } from './slide-ops.js';
import { exportPresentation } from './export.js';

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
// presentations.ts
// ---------------------------------------------------------------------------

describe('presentations operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('getPresentation', () => {
    it('should GET presentation by id', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ presentationId: 'p1', title: 'Deck' }));
      const result = await getPresentation(http, 'p1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('Deck');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/presentations/p1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getPresentation(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('createPresentation', () => {
    it('should POST new presentation', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ presentationId: 'p2', title: 'New' }));
      const result = await createPresentation(http, 'New');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.presentationId).toBe('p2');
      expect(vi.mocked(http.post).mock.calls[0]?.[1]?.body).toEqual({ title: 'New' });
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createPresentation(http, 'X');
      expect(result.ok).toBe(false);
    });
  });

  describe('getSlide', () => {
    it('should GET a slide by id', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ objectId: 's1', pageElements: [] }));
      const result = await getSlide(http, 'p1', 's1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.objectId).toBe('s1');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/presentations/p1/pages/s1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getSlide(http, 'p1', 'x');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// slide-ops.ts
// ---------------------------------------------------------------------------

describe('slide-ops operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('batchUpdate', () => {
    it('should POST batch update requests', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ presentationId: 'p1', replies: [] }));
      const result = await batchUpdate(http, 'p1', [{ createSlide: { insertionIndex: 0 } }]);
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain(':batchUpdate');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await batchUpdate(http, 'x', []);
      expect(result.ok).toBe(false);
    });
  });

  describe('addSlide', () => {
    it('should return new slide objectId on success', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({
        presentationId: 'p1',
        replies: [{ createSlide: { objectId: 'slide_new' } }],
      }));
      const result = await addSlide(http, 'p1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('slide_new');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await addSlide(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteSlide', () => {
    it('should send deleteObject request', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ presentationId: 'p1', replies: [] }));
      const result = await deleteSlide(http, 'p1', 's1');
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await deleteSlide(http, 'x', 's');
      expect(result.ok).toBe(false);
    });
  });

  describe('replaceAllText', () => {
    it('should return occurrences changed', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({
        presentationId: 'p1',
        replies: [{ replaceAllText: { occurrencesChanged: 3 } }],
      }));
      const result = await replaceAllText(http, 'p1', '{{name}}', 'John');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(3);
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await replaceAllText(http, 'x', 'a', 'b');
      expect(result.ok).toBe(false);
    });
  });

  describe('updateSpeakerNotes', () => {
    it('should update speaker notes for a slide', async () => {
      // getPresentation call
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        presentationId: 'p1',
        slides: [{
          objectId: 'slide1',
          slideProperties: {
            notesPage: {
              notesProperties: { speakerNotesObjectId: 'notes1' },
            },
          },
        }],
      }));
      // batchUpdate call
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ presentationId: 'p1', replies: [] }));

      const result = await updateSpeakerNotes(http, 'p1', 'slide1', 'New notes');
      expect(result.ok).toBe(true);
    });

    it('should return error when getPresentation fails', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await updateSpeakerNotes(http, 'p1', 'slide1', 'Notes');
      expect(result.ok).toBe(false);
    });

    it('should return error when slide not found', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        presentationId: 'p1',
        slides: [{ objectId: 'other' }],
      }));
      const result = await updateSpeakerNotes(http, 'p1', 'nonexistent', 'Notes');
      expect(result.ok).toBe(false);
    });

    it('should return error when no notes object found', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        presentationId: 'p1',
        slides: [{ objectId: 'slide1', slideProperties: {} }],
      }));
      const result = await updateSpeakerNotes(http, 'p1', 'slide1', 'Notes');
      expect(result.ok).toBe(false);
    });

    it('should return error when batchUpdate fails', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        presentationId: 'p1',
        slides: [{
          objectId: 'slide1',
          slideProperties: {
            notesPage: {
              notesProperties: { speakerNotesObjectId: 'notes1' },
            },
          },
        }],
      }));
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await updateSpeakerNotes(http, 'p1', 'slide1', 'Notes');
      expect(result.ok).toBe(false);
    });

    it('should handle non-WorkspaceError wrapping', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(err(new Error('raw') as unknown as NetworkError));
      const result = await updateSpeakerNotes(http, 'p1', 'slide1', 'Notes');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// export.ts
// ---------------------------------------------------------------------------

describe('export operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('exportPresentation', () => {
    it('should GET from drive export endpoint', async () => {
      const blob = new Blob(['pdf']);
      vi.mocked(http.get).mockResolvedValueOnce(mockOk(blob));
      const result = await exportPresentation(http, 'p1', 'application/pdf');
      expect(result.ok).toBe(true);
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('/export');
      expect(url).toContain('mimeType=application%2Fpdf');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await exportPresentation(http, 'x', 'application/pdf');
      expect(result.ok).toBe(false);
    });
  });
});
