/**
 * Operation-level tests for @openworkspace/groups.
 * Covers group-ops module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';

import {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  searchGroups,
  lookupGroup,
  listMembers,
  addMember,
  removeMember,
  getMembership,
} from './group-ops.js';

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
// group-ops.ts
// ---------------------------------------------------------------------------

describe('group operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listGroups', () => {
    it('should GET groups', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ groups: [{ name: 'groups/g1', displayName: 'Engineering' }] }));
      const result = await listGroups(http, 'customers/C123');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/groups');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listGroups(http, 'customers/x');
      expect(result.ok).toBe(false);
    });
  });

  describe('getGroup', () => {
    it('should GET group by name', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ name: 'groups/g1', displayName: 'Engineering' }));
      const result = await getGroup(http, 'groups/g1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.displayName).toBe('Engineering');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getGroup(http, 'groups/x');
      expect(result.ok).toBe(false);
    });
  });

  describe('createGroup', () => {
    it('should POST new group', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ name: 'groups/g2', displayName: 'Sales' }));
      const result = await createGroup(http, { displayName: 'Sales' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.displayName).toBe('Sales');
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain('/groups');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createGroup(http, {});
      expect(result.ok).toBe(false);
    });
  });

  describe('updateGroup', () => {
    it('should PATCH group', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockOk({ name: 'groups/g1', displayName: 'Updated' }));
      const result = await updateGroup(http, 'groups/g1', { displayName: 'Updated' }, 'displayName');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.displayName).toBe('Updated');
      const url = vi.mocked(http.patch).mock.calls[0]?.[0] as string;
      expect(url).toContain('updateMask=displayName');
    });

    it('should propagate error', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await updateGroup(http, 'groups/x', {});
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteGroup', () => {
    it('should DELETE group', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await deleteGroup(http, 'groups/g1');
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await deleteGroup(http, 'groups/x');
      expect(result.ok).toBe(false);
    });
  });

  describe('searchGroups', () => {
    it('should GET search results', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ groups: [] }));
      const result = await searchGroups(http, 'parent==customers/C123');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain(':search');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await searchGroups(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('lookupGroup', () => {
    it('should GET lookup result', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ name: 'groups/g1' }));
      const result = await lookupGroup(http, 'team@example.com');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.name).toBe('groups/g1');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain(':lookup');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await lookupGroup(http, 'x@example.com');
      expect(result.ok).toBe(false);
    });
  });

  describe('listMembers', () => {
    it('should GET memberships', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ memberships: [{ name: 'groups/g1/memberships/m1' }] }));
      const result = await listMembers(http, 'groups/g1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/memberships');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listMembers(http, 'groups/x');
      expect(result.ok).toBe(false);
    });
  });

  describe('addMember', () => {
    it('should POST new membership', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({
        name: 'groups/g1/memberships/m1',
        preferredMemberKey: { id: 'user@example.com' },
      }));
      const result = await addMember(http, 'groups/g1', { id: 'user@example.com' });
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain('/memberships');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await addMember(http, 'groups/x', { id: 'user@example.com' });
      expect(result.ok).toBe(false);
    });
  });

  describe('removeMember', () => {
    it('should DELETE membership', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await removeMember(http, 'groups/g1/memberships/m1');
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await removeMember(http, 'groups/x/memberships/y');
      expect(result.ok).toBe(false);
    });
  });

  describe('getMembership', () => {
    it('should GET membership by name', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({
        name: 'groups/g1/memberships/m1',
        preferredMemberKey: { id: 'user@example.com' },
      }));
      const result = await getMembership(http, 'groups/g1/memberships/m1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.preferredMemberKey.id).toBe('user@example.com');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getMembership(http, 'groups/x/memberships/y');
      expect(result.ok).toBe(false);
    });
  });
});
