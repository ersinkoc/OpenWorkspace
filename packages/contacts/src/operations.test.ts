/**
 * Operation-level tests for @openworkspace/contacts.
 * Covers contacts, directory, and other-contacts modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';

import { listContacts, getContact, createContact, updateContact, deleteContact, searchContacts } from './contacts.js';
import { listDirectoryPeople, searchDirectoryPeople } from './directory.js';
import { listOtherContacts, searchOtherContacts } from './other-contacts.js';

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
// contacts.ts
// ---------------------------------------------------------------------------

describe('contacts operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listContacts', () => {
    it('should GET connections', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ connections: [{ resourceName: 'people/c1' }] }));
      const result = await listContacts(http, { pageSize: 10 });
      expect(result.ok).toBe(true);
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('/people/me/connections');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listContacts(http);
      expect(result.ok).toBe(false);
    });
  });

  describe('getContact', () => {
    it('should GET contact by resource name', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ resourceName: 'people/c1' }));
      const result = await getContact(http, 'people/c1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.resourceName).toBe('people/c1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getContact(http, 'people/x');
      expect(result.ok).toBe(false);
    });
  });

  describe('createContact', () => {
    it('should POST new contact', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ resourceName: 'people/c2' }));
      const result = await createContact(http, { names: [{ givenName: 'John' }] });
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain(':createContact');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 400));
      const result = await createContact(http, {});
      expect(result.ok).toBe(false);
    });
  });

  describe('updateContact', () => {
    it('should PATCH contact', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockOk({ resourceName: 'people/c1' }));
      const result = await updateContact(http, 'people/c1', { names: [{ givenName: 'Jane' }] }, 'names');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.patch).mock.calls[0]?.[0]).toContain(':updateContact');
    });

    it('should propagate error', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await updateContact(http, 'people/c1', {}, 'names');
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteContact', () => {
    it('should DELETE contact', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await deleteContact(http, 'people/c1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.delete).mock.calls[0]?.[0]).toContain(':deleteContact');
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await deleteContact(http, 'people/x');
      expect(result.ok).toBe(false);
    });
  });

  describe('searchContacts', () => {
    it('should GET search results', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ results: [{ person: { resourceName: 'people/c1' } }] }));
      const result = await searchContacts(http, 'john');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain(':searchContacts');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await searchContacts(http, 'x');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// directory.ts
// ---------------------------------------------------------------------------

describe('directory operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listDirectoryPeople', () => {
    it('should GET directory people', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ connections: [] }));
      const result = await listDirectoryPeople(http);
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain(':listDirectoryPeople');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 403));
      const result = await listDirectoryPeople(http);
      expect(result.ok).toBe(false);
    });
  });

  describe('searchDirectoryPeople', () => {
    it('should GET search results', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ results: [] }));
      const result = await searchDirectoryPeople(http, 'john');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain(':searchDirectoryPeople');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await searchDirectoryPeople(http, 'x');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// other-contacts.ts
// ---------------------------------------------------------------------------

describe('other-contacts operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listOtherContacts', () => {
    it('should GET other contacts', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ connections: [] }));
      const result = await listOtherContacts(http);
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/otherContacts');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listOtherContacts(http);
      expect(result.ok).toBe(false);
    });
  });

  describe('searchOtherContacts', () => {
    it('should GET search results', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ results: [] }));
      const result = await searchOtherContacts(http, 'example.com');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/otherContacts:search');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await searchOtherContacts(http, 'x');
      expect(result.ok).toBe(false);
    });
  });
});
