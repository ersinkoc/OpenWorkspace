/**
 * Tests for @openworkspace/contacts.
 * Uses mock HttpClient to verify all operations without network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import { contacts, contactsPlugin } from './plugin.js';
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  searchContacts,
} from './contacts.js';
import { listDirectoryPeople, searchDirectoryPeople } from './directory.js';
import { listOtherContacts, searchOtherContacts } from './other-contacts.js';
import type {
  Person,
  ListConnectionsResponse,
  SearchResponse,
} from './types.js';

// ---------------------------------------------------------------------------
// Mock HttpClient factory
// ---------------------------------------------------------------------------

type MockHttpClient = HttpClient & {
  _getHandler: ReturnType<typeof vi.fn>;
  _postHandler: ReturnType<typeof vi.fn>;
  _patchHandler: ReturnType<typeof vi.fn>;
  _putHandler: ReturnType<typeof vi.fn>;
  _deleteHandler: ReturnType<typeof vi.fn>;
};

function mockResponse<T>(data: T, status = 200): Result<HttpResponse<T>, NetworkError> {
  return ok({
    status,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    data,
  });
}

function mockError(message: string, status = 500): Result<never, NetworkError> {
  return err(new NetworkError(message, { status }, status));
}

function createMockHttp(): MockHttpClient {
  const getHandler = vi.fn();
  const postHandler = vi.fn();
  const patchHandler = vi.fn();
  const putHandler = vi.fn();
  const deleteHandler = vi.fn();

  return {
    request: vi.fn(),
    get: getHandler,
    post: postHandler,
    put: putHandler,
    patch: patchHandler,
    delete: deleteHandler,
    interceptors: { request: [], response: [], error: [] },
    _getHandler: getHandler,
    _postHandler: postHandler,
    _patchHandler: patchHandler,
    _putHandler: putHandler,
    _deleteHandler: deleteHandler,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PERSON_FIXTURE: Person = {
  resourceName: 'people/c1234567890',
  etag: 'etag123',
  names: [
    {
      displayName: 'John Doe',
      givenName: 'John',
      familyName: 'Doe',
      metadata: { primary: true },
    },
  ],
  emailAddresses: [
    {
      value: 'john@example.com',
      type: 'work',
      metadata: { primary: true },
    },
  ],
  phoneNumbers: [
    {
      value: '+1-555-0123',
      type: 'mobile',
      canonicalForm: '+15550123',
    },
  ],
  addresses: [
    {
      formattedValue: '123 Main St, Anytown, ST 12345',
      type: 'home',
      streetAddress: '123 Main St',
      city: 'Anytown',
      region: 'ST',
      postalCode: '12345',
      country: 'USA',
    },
  ],
  organizations: [
    {
      name: 'Acme Corp',
      title: 'Software Engineer',
      department: 'Engineering',
      type: 'work',
      current: true,
    },
  ],
  photos: [
    {
      url: 'https://example.com/photo.jpg',
      default: true,
    },
  ],
};

const LIST_CONNECTIONS_FIXTURE: ListConnectionsResponse = {
  connections: [PERSON_FIXTURE],
  nextPageToken: 'next-token',
  totalPeople: 1,
  totalItems: 1,
};

const SEARCH_RESPONSE_FIXTURE: SearchResponse = {
  results: [
    {
      person: PERSON_FIXTURE,
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests: Plugin creation
// ---------------------------------------------------------------------------

describe('contacts()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a ContactsApi with all expected methods', () => {
    const api = contacts(http);

    expect(typeof api.listContacts).toBe('function');
    expect(typeof api.getContact).toBe('function');
    expect(typeof api.createContact).toBe('function');
    expect(typeof api.updateContact).toBe('function');
    expect(typeof api.deleteContact).toBe('function');
    expect(typeof api.searchContacts).toBe('function');
    expect(typeof api.listDirectoryPeople).toBe('function');
    expect(typeof api.searchDirectoryPeople).toBe('function');
    expect(typeof api.listOtherContacts).toBe('function');
    expect(typeof api.searchOtherContacts).toBe('function');
  });
});

describe('contactsPlugin()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a plugin with the correct name and version', () => {
    const plugin = contactsPlugin(http);

    expect(plugin.name).toBe('contacts');
    expect(plugin.version).toBe('0.1.0');
    expect(typeof plugin.setup).toBe('function');
    expect(typeof plugin.teardown).toBe('function');
  });

  it('stores ContactsApi in metadata on setup', () => {
    const plugin = contactsPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);

    expect(metadata.has('contacts')).toBe(true);
    const api = metadata.get('contacts') as ReturnType<typeof contacts>;
    expect(typeof api.listContacts).toBe('function');
  });

  it('removes ContactsApi from metadata on teardown', () => {
    const plugin = contactsPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);
    expect(metadata.has('contacts')).toBe(true);

    plugin.teardown!(ctx);
    expect(metadata.has('contacts')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Contact operations
// ---------------------------------------------------------------------------

describe('listContacts()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of contacts on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_CONNECTIONS_FIXTURE));

    const result = await listContacts(http, {
      pageSize: 100,
      personFields: 'names,emailAddresses',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.connections).toHaveLength(1);
      const first = result.value.connections?.[0];
      expect(first?.names?.[0]?.displayName).toBe('John Doe');
    }

    expect(http._getHandler).toHaveBeenCalledOnce();
    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/people/me/connections');
    expect(url).toContain('pageSize=100');
    expect(url).toContain('personFields=names%2CemailAddresses');
  });

  it('returns error on network failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Connection refused'));

    const result = await listContacts(http);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Connection refused');
    }
  });

  it('uses default person fields when not provided', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_CONNECTIONS_FIXTURE));

    await listContacts(http);

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('personFields=');
  });
});

describe('getContact()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a single contact on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));

    const result = await getContact(http, 'people/c1234567890');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.resourceName).toBe('people/c1234567890');
      expect(result.value.names?.[0]?.displayName).toBe('John Doe');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/people/c1234567890');
  });

  it('returns error when contact not found', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Not Found', 404));

    const result = await getContact(http, 'people/nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not Found');
    }
  });

  it('allows custom person fields', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));

    await getContact(http, 'people/c1234567890', 'names,photos');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('personFields=names%2Cphotos');
  });
});

describe('createContact()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a contact and returns it', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));

    const result = await createContact(http, {
      names: [{ givenName: 'John', familyName: 'Doe' }],
      emailAddresses: [{ value: 'john@example.com' }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.resourceName).toBe('people/c1234567890');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/people:createContact');
  });

  it('sends contact body in request config', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));

    await createContact(http, {
      names: [{ givenName: 'Jane', familyName: 'Smith' }],
      emailAddresses: [{ value: 'jane@example.com' }],
    });

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({
      names: [{ givenName: 'Jane', familyName: 'Smith' }],
    });
  });
});

describe('updateContact()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('patches a contact and returns the updated version', async () => {
    const updatedPerson = { ...PERSON_FIXTURE };
    http._patchHandler.mockResolvedValueOnce(mockResponse(updatedPerson));

    const result = await updateContact(
      http,
      'people/c1234567890',
      {
        names: [{ givenName: 'Jane', familyName: 'Doe' }],
      },
      'names',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.resourceName).toBe('people/c1234567890');
    }

    expect(http._patchHandler).toHaveBeenCalledOnce();
    const url = http._patchHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/people/c1234567890:updateContact');
    expect(url).toContain('updatePersonFields=names');
  });
});

describe('deleteContact()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('deletes a contact successfully', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockResponse(null, 204));

    const result = await deleteContact(http, 'people/c1234567890');

    expect(result.ok).toBe(true);
    expect(http._deleteHandler).toHaveBeenCalledOnce();
    const url = http._deleteHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/people/c1234567890:deleteContact');
  });

  it('returns error on failure', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockError('Forbidden', 403));

    const result = await deleteContact(http, 'people/c1234567890');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Forbidden');
    }
  });
});

describe('searchContacts()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('searches contacts successfully', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE_FIXTURE));

    const result = await searchContacts(http, 'john@example.com');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.results).toHaveLength(1);
      const first = result.value.results?.[0];
      expect(first?.person.names?.[0]?.displayName).toBe('John Doe');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/people:searchContacts');
    expect(url).toContain('query=john%40example.com');
  });

  it('allows custom page size', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE_FIXTURE));

    await searchContacts(http, 'doe', { pageSize: 10 });

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('pageSize=10');
  });
});

// ---------------------------------------------------------------------------
// Tests: Directory operations
// ---------------------------------------------------------------------------

describe('listDirectoryPeople()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of directory people on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_CONNECTIONS_FIXTURE));

    const result = await listDirectoryPeople(http, {
      pageSize: 100,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.connections).toHaveLength(1);
      const first = result.value.connections?.[0];
      expect(first?.names?.[0]?.displayName).toBe('John Doe');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/people:listDirectoryPeople');
    expect(url).toContain('sources=DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE');
  });

  it('uses default directory source', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_CONNECTIONS_FIXTURE));

    await listDirectoryPeople(http);

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('sources=DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE');
  });
});

describe('searchDirectoryPeople()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('searches directory successfully', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE_FIXTURE));

    const result = await searchDirectoryPeople(http, 'john');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.results).toHaveLength(1);
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/people:searchDirectoryPeople');
    expect(url).toContain('query=john');
  });
});

// ---------------------------------------------------------------------------
// Tests: Other contacts operations
// ---------------------------------------------------------------------------

describe('listOtherContacts()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of other contacts on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_CONNECTIONS_FIXTURE));

    const result = await listOtherContacts(http, {
      pageSize: 100,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.connections).toHaveLength(1);
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/otherContacts');
  });
});

describe('searchOtherContacts()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('searches other contacts successfully', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE_FIXTURE));

    const result = await searchOtherContacts(http, 'example.com');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.results).toHaveLength(1);
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/otherContacts:search');
    expect(url).toContain('query=example.com');
  });
});

// ---------------------------------------------------------------------------
// Tests: ContactsApi facade
// ---------------------------------------------------------------------------

describe('ContactsApi facade', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates listContacts through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_CONNECTIONS_FIXTURE));

    const api = contacts(http);
    const result = await api.listContacts({ pageSize: 10 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.connections).toHaveLength(1);
    }
  });

  it('delegates createContact through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));

    const api = contacts(http);
    const result = await api.createContact({
      names: [{ givenName: 'Test', familyName: 'User' }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.resourceName).toBe('people/c1234567890');
    }
  });

  it('delegates searchDirectoryPeople through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE_FIXTURE));

    const api = contacts(http);
    const result = await api.searchDirectoryPeople('john');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.results).toHaveLength(1);
    }
  });

  it('delegates listOtherContacts through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_CONNECTIONS_FIXTURE));

    const api = contacts(http);
    const result = await api.listOtherContacts();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.connections).toHaveLength(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: URL encoding
// ---------------------------------------------------------------------------

describe('URL encoding', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('encodes special characters in resourceName', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));

    await getContact(http, 'people/c1234/567890');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('people/c1234/567890');
  });

  it('encodes query parameters correctly', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE_FIXTURE));

    await searchContacts(http, 'john+doe@example.com');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('query=john%2Bdoe%40example.com');
  });
});

// ---------------------------------------------------------------------------
// Coverage: updateContact facade wrapper (plugin.ts line 51)
// ---------------------------------------------------------------------------

describe('ContactsApi facade - updateContact', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates updateContact through the facade', async () => {
    const updatedPerson: Person = { ...PERSON_FIXTURE, names: [{ displayName: 'Jane Doe', givenName: 'Jane', familyName: 'Doe', metadata: { primary: true } }] };
    http._patchHandler.mockResolvedValueOnce(mockResponse(updatedPerson));

    const api = contacts(http);
    const result = await api.updateContact(
      'people/c1234567890',
      { names: [{ givenName: 'Jane', familyName: 'Doe' }] },
      'names',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.resourceName).toBe('people/c1234567890');
    }

    expect(http._patchHandler).toHaveBeenCalledOnce();
    const url = http._patchHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain(':updateContact');
    expect(url).toContain('updatePersonFields=names');
  });
});
