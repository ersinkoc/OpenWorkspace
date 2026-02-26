/**
 * Operation-level tests for @openworkspace/people.
 * Covers profiles and relations modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError, WorkspaceError } from '@openworkspace/core';

import { getProfile, getProfileByEmail, getBatchProfiles, searchProfiles } from './profiles.js';
import { getManager, getDirectReports } from './relations.js';

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
// profiles.ts
// ---------------------------------------------------------------------------

describe('profiles operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('getProfile', () => {
    it('should GET profile by resource name', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        resourceName: 'people/me',
        names: [{ displayName: 'John Doe' }],
      }));
      const result = await getProfile(http);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.names?.[0]?.displayName).toBe('John Doe');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/people/me');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await getProfile(http, 'people/x');
      expect(result.ok).toBe(false);
    });

    it('should wrap non-WorkspaceError via toWorkspaceError fallback', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockRawErr('raw error') as any);
      const result = await getProfile(http, 'people/x');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(WorkspaceError);
        expect(result.error.message).toBe('raw error');
        expect(result.error.code).toBe('PEOPLE_ERROR');
      }
    });
  });

  describe('getProfileByEmail', () => {
    it('should search then return first result', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        people: [{ resourceName: 'people/123', names: [{ displayName: 'Alice' }] }],
      }));
      const result = await getProfileByEmail(http, 'alice@example.com');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.names?.[0]?.displayName).toBe('Alice');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain(':searchDirectoryPeople');
    });

    it('should return error when no profile found', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ people: [] }));
      const result = await getProfileByEmail(http, 'nobody@example.com');
      expect(result.ok).toBe(false);
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await getProfileByEmail(http, 'x@example.com');
      expect(result.ok).toBe(false);
    });
  });

  describe('getBatchProfiles', () => {
    it('should GET batch profiles', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        responses: [{ person: { resourceName: 'people/123' } }],
      }));
      const result = await getBatchProfiles(http, ['people/123']);
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain(':batchGet');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await getBatchProfiles(http, ['people/x']);
      expect(result.ok).toBe(false);
    });
  });

  describe('searchProfiles', () => {
    it('should GET search results', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ people: [] }));
      const result = await searchProfiles(http, 'engineering');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain(':searchDirectoryPeople');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await searchProfiles(http, 'x');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// relations.ts
// ---------------------------------------------------------------------------

describe('relations operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('getManager', () => {
    it('should return manager profile when found', async () => {
      // First call: getProfile with 'relations' personFields
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        resourceName: 'people/me',
        relations: [{ type: 'manager', person: 'people/mgr1' }],
      }));
      // Second call: getProfile for manager
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        resourceName: 'people/mgr1',
        names: [{ displayName: 'Manager' }],
      }));
      const result = await getManager(http);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value?.names?.[0]?.displayName).toBe('Manager');
    });

    it('should return null when no manager found', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        resourceName: 'people/me',
        relations: [],
      }));
      const result = await getManager(http);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBeNull();
    });

    it('should return null when managerResourceNames[0] is falsy', async () => {
      // Provide a profile with a manager relation whose person field is falsy.
      // findRelationsByType guards against this, so we mock at a lower level:
      // create a relations array with a truthy-length but push nothing useful.
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        resourceName: 'people/me',
        relations: [{ type: 'manager', person: undefined }],
      }));
      const result = await getManager(http);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBeNull();
    });

    it('should propagate error when manager profile fetch fails', async () => {
      // First call: profile with manager relation succeeds
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        resourceName: 'people/me',
        relations: [{ type: 'manager', person: 'people/mgr1' }],
      }));
      // Second call: fetching the manager profile fails
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('manager not found', 404));
      const result = await getManager(http);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.message).toBe('manager not found');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await getManager(http);
      expect(result.ok).toBe(false);
    });
  });

  describe('getDirectReports', () => {
    it('should return direct reports', async () => {
      // First call: getProfile with 'relations'
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        resourceName: 'people/me',
        relations: [
          { type: 'direct_report', person: 'people/dr1' },
          { type: 'direct_report', person: 'people/dr2' },
        ],
      }));
      // Calls for each direct report
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        resourceName: 'people/dr1',
        names: [{ displayName: 'Report 1' }],
      }));
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        resourceName: 'people/dr2',
        names: [{ displayName: 'Report 2' }],
      }));
      const result = await getDirectReports(http);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toHaveLength(2);
    });

    it('should return empty array when no direct reports', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        resourceName: 'people/me',
        relations: [],
      }));
      const result = await getDirectReports(http);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toHaveLength(0);
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await getDirectReports(http);
      expect(result.ok).toBe(false);
    });
  });
});
