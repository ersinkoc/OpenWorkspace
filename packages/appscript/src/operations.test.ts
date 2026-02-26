/**
 * Operation-level tests for @openworkspace/appscript.
 * Covers projects and execute modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';

import { getProject, createProject, getContent, updateContent } from './projects.js';
import { runFunction, listProcesses } from './execute.js';

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
// projects.ts
// ---------------------------------------------------------------------------

describe('projects operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('getProject', () => {
    it('should GET project by script id', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ scriptId: 'abc123', title: 'My Script' }));
      const result = await getProject(http, 'abc123');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('My Script');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/projects/abc123');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getProject(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('createProject', () => {
    it('should POST new project', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ scriptId: 'new1', title: 'New Script' }));
      const result = await createProject(http, 'New Script');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.scriptId).toBe('new1');
      expect(vi.mocked(http.post).mock.calls[0]?.[1]?.body).toEqual({ title: 'New Script' });
    });

    it('should include parentId when provided', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ scriptId: 'new2', title: 'Child Script' }));
      await createProject(http, 'Child Script', 'parent1');
      expect(vi.mocked(http.post).mock.calls[0]?.[1]?.body).toEqual({ title: 'Child Script', parentId: 'parent1' });
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createProject(http, 'X');
      expect(result.ok).toBe(false);
    });
  });

  describe('getContent', () => {
    it('should GET project content', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        scriptId: 'abc123',
        files: [{ name: 'Code', type: 'SERVER_JS', source: 'function main() {}' }],
      }));
      const result = await getContent(http, 'abc123');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.files?.[0]?.name).toBe('Code');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/projects/abc123/content');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await getContent(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('updateContent', () => {
    it('should PUT project content', async () => {
      const files = [{ name: 'Code', type: 'SERVER_JS' as const, source: 'function main() {}' }];
      vi.mocked(http.put).mockResolvedValueOnce(mockOk({ scriptId: 'abc123', files }));
      const result = await updateContent(http, 'abc123', files);
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.put).mock.calls[0]?.[0]).toContain('/projects/abc123/content');
    });

    it('should propagate error', async () => {
      vi.mocked(http.put).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await updateContent(http, 'x', []);
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// execute.ts
// ---------------------------------------------------------------------------

describe('execute operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('runFunction', () => {
    it('should POST to run endpoint and return result', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({
        done: true,
        response: { result: 42 },
      }));
      const result = await runFunction(http, 'abc123', 'myFunction', ['arg1']);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.result).toBe(42);
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain('/scripts/abc123:run');
    });

    it('should return error when operation has error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({
        done: true,
        error: { message: 'Script failed' },
      }));
      const result = await runFunction(http, 'abc123', 'myFunction');
      expect(result.ok).toBe(false);
    });

    it('should propagate HTTP error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await runFunction(http, 'x', 'fn');
      expect(result.ok).toBe(false);
    });
  });

  describe('listProcesses', () => {
    it('should GET processes', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        processes: [{ functionName: 'myFunc', processStatus: 'COMPLETED' }],
      }));
      const result = await listProcesses(http);
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/processes');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listProcesses(http);
      expect(result.ok).toBe(false);
    });
  });
});
