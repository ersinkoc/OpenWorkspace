/**
 * Tests for @openworkspace/people.
 * Uses mock HttpClient to verify all operations without network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import { people, peoplePlugin } from './plugin.js';
import { getProfile, getProfileByEmail, getBatchProfiles, searchProfiles } from './profiles.js';
import { getManager, getDirectReports } from './relations.js';
import type {
  PersonProfile,
  GetPeopleResponse,
  SearchDirectoryResponse,
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

const PERSON_FIXTURE: PersonProfile = {
  resourceName: 'people/123456789',
  etag: '%EgUBAgMEBSIMSkhKWW1HU0laZEk9',
  names: [
    {
      displayName: 'Alice Smith',
      familyName: 'Smith',
      givenName: 'Alice',
      displayNameLastFirst: 'Smith, Alice',
    },
  ],
  emailAddresses: [
    {
      value: 'alice@example.com',
      type: 'work',
      formattedType: 'Work',
    },
  ],
  phoneNumbers: [
    {
      value: '+1 555-0100',
      type: 'mobile',
      formattedType: 'Mobile',
      canonicalForm: '+15550100',
    },
  ],
  photos: [
    {
      url: 'https://example.com/photo.jpg',
      default: true,
    },
  ],
  organizations: [
    {
      name: 'Example Corp',
      title: 'Software Engineer',
      department: 'Engineering',
      type: 'work',
      formattedType: 'Work',
      current: true,
    },
  ],
};

const MANAGER_FIXTURE: PersonProfile = {
  resourceName: 'people/987654321',
  etag: '%EgUBAgMEBSIMQUJDREVGR0hJSk0=',
  names: [
    {
      displayName: 'Bob Manager',
      familyName: 'Manager',
      givenName: 'Bob',
    },
  ],
  emailAddresses: [
    {
      value: 'bob@example.com',
      type: 'work',
    },
  ],
  organizations: [
    {
      name: 'Example Corp',
      title: 'Engineering Manager',
      department: 'Engineering',
      current: true,
    },
  ],
};

const PERSON_WITH_RELATIONS_FIXTURE: PersonProfile = {
  ...PERSON_FIXTURE,
  relations: [
    {
      person: 'people/987654321',
      type: 'manager',
      formattedType: 'Manager',
    },
  ],
};

const MANAGER_WITH_REPORTS_FIXTURE: PersonProfile = {
  ...MANAGER_FIXTURE,
  relations: [
    {
      person: 'people/123456789',
      type: 'direct_report',
      formattedType: 'Direct Report',
    },
    {
      person: 'people/111222333',
      type: 'direct_report',
      formattedType: 'Direct Report',
    },
  ],
};

const DIRECT_REPORT_FIXTURE: PersonProfile = {
  resourceName: 'people/111222333',
  names: [
    {
      displayName: 'Charlie Report',
      familyName: 'Report',
      givenName: 'Charlie',
    },
  ],
  emailAddresses: [
    {
      value: 'charlie@example.com',
      type: 'work',
    },
  ],
};

const BATCH_RESPONSE_FIXTURE: GetPeopleResponse = {
  responses: [
    {
      httpStatusCode: 200,
      person: PERSON_FIXTURE,
      requestedResourceName: 'people/123456789',
    },
    {
      httpStatusCode: 200,
      person: MANAGER_FIXTURE,
      requestedResourceName: 'people/987654321',
    },
  ],
};

const SEARCH_RESPONSE_FIXTURE: SearchDirectoryResponse = {
  people: [PERSON_FIXTURE, MANAGER_FIXTURE],
  totalSize: 2,
};

// ---------------------------------------------------------------------------
// Tests: Plugin creation
// ---------------------------------------------------------------------------

describe('people()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a PeopleApi with all expected methods', () => {
    const api = people(http);

    expect(typeof api.getProfile).toBe('function');
    expect(typeof api.getProfileByEmail).toBe('function');
    expect(typeof api.getBatchProfiles).toBe('function');
    expect(typeof api.searchProfiles).toBe('function');
    expect(typeof api.getManager).toBe('function');
    expect(typeof api.getDirectReports).toBe('function');
  });
});

describe('peoplePlugin()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a plugin with the correct name and version', () => {
    const plugin = peoplePlugin(http);

    expect(plugin.name).toBe('people');
    expect(plugin.version).toBe('0.1.0');
    expect(typeof plugin.setup).toBe('function');
    expect(typeof plugin.teardown).toBe('function');
  });

  it('stores PeopleApi in metadata on setup', () => {
    const plugin = peoplePlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);

    expect(metadata.has('people')).toBe(true);
    const api = metadata.get('people') as ReturnType<typeof people>;
    expect(typeof api.getProfile).toBe('function');
  });

  it('removes PeopleApi from metadata on teardown', () => {
    const plugin = peoplePlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);
    expect(metadata.has('people')).toBe(true);

    plugin.teardown!(ctx);
    expect(metadata.has('people')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Profile operations
// ---------------------------------------------------------------------------

describe('getProfile()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns the authenticated user profile by default', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));

    const result = await getProfile(http);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.resourceName).toBe('people/123456789');
      expect(result.value.names?.[0]?.displayName).toBe('Alice Smith');
    }

    expect(http._getHandler).toHaveBeenCalledOnce();
    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/people/me');
    expect(url).toContain('personFields=');
  });

  it('accepts custom resource name', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));

    const result = await getProfile(http, 'people/123456789');

    expect(result.ok).toBe(true);
    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/people/123456789');
  });

  it('accepts custom person fields', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));

    await getProfile(http, 'people/me', 'names,emailAddresses');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('personFields=names%2CemailAddresses');
  });

  it('returns error on network failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Network error'));

    const result = await getProfile(http);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Network error');
    }
  });
});

describe('getProfileByEmail()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('finds profile by email address', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE_FIXTURE));

    const result = await getProfileByEmail(http, 'alice@example.com');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.names?.[0]?.displayName).toBe('Alice Smith');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('searchDirectoryPeople');
    expect(url).toContain('query=alice%40example.com');
  });

  it('returns error when no profile found', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse({ people: [] }));

    const result = await getProfileByEmail(http, 'notfound@example.com');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('No profile found');
    }
  });
});

describe('getBatchProfiles()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('fetches multiple profiles in one request', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(BATCH_RESPONSE_FIXTURE));

    const result = await getBatchProfiles(http, ['people/123456789', 'people/987654321']);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.responses).toHaveLength(2);
      const first = result.value.responses?.[0];
      expect(first?.person?.names?.[0]?.displayName).toBe('Alice Smith');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('people:batchGet');
    expect(url).toContain('resourceNames=people%2F123456789');
    expect(url).toContain('resourceNames=people%2F987654321');
  });
});

describe('searchProfiles()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('searches directory profiles', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE_FIXTURE));

    const result = await searchProfiles(http, 'engineering');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.people).toHaveLength(2);
      expect(result.value.totalSize).toBe(2);
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('searchDirectoryPeople');
    expect(url).toContain('query=engineering');
  });

  it('supports pagination options', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE_FIXTURE));

    await searchProfiles(http, 'test', {
      pageSize: 10,
      pageToken: 'token123',
    });

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('pageSize=10');
    expect(url).toContain('pageToken=token123');
  });

  it('supports custom read mask', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE_FIXTURE));

    await searchProfiles(http, 'test', {
      readMask: 'names,emailAddresses',
    });

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('readMask=names%2CemailAddresses');
  });
});

// ---------------------------------------------------------------------------
// Tests: Org chart operations
// ---------------------------------------------------------------------------

describe('getManager()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns manager profile when found', async () => {
    // First call: get user profile with relations
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_WITH_RELATIONS_FIXTURE));
    // Second call: get manager profile
    http._getHandler.mockResolvedValueOnce(mockResponse(MANAGER_FIXTURE));

    const result = await getManager(http);

    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.names?.[0]?.displayName).toBe('Bob Manager');
    }

    expect(http._getHandler).toHaveBeenCalledTimes(2);
    const firstUrl = http._getHandler.mock.calls[0]?.[0] as string;
    expect(firstUrl).toContain('people/me');
    expect(firstUrl).toContain('personFields=relations');

    const secondUrl = http._getHandler.mock.calls[1]?.[0] as string;
    expect(secondUrl).toContain('people/987654321');
  });

  it('returns null when no manager found', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));

    const result = await getManager(http);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });

  it('accepts custom resource name', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_WITH_RELATIONS_FIXTURE));
    http._getHandler.mockResolvedValueOnce(mockResponse(MANAGER_FIXTURE));

    await getManager(http, 'people/123456789');

    const firstUrl = http._getHandler.mock.calls[0]?.[0] as string;
    expect(firstUrl).toContain('people/123456789');
  });
});

describe('getDirectReports()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns direct reports when found', async () => {
    // First call: get user profile with relations
    http._getHandler.mockResolvedValueOnce(mockResponse(MANAGER_WITH_REPORTS_FIXTURE));
    // Second call: get first direct report
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));
    // Third call: get second direct report
    http._getHandler.mockResolvedValueOnce(mockResponse(DIRECT_REPORT_FIXTURE));

    const result = await getDirectReports(http);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]?.names?.[0]?.displayName).toBe('Alice Smith');
      expect(result.value[1]?.names?.[0]?.displayName).toBe('Charlie Report');
    }

    expect(http._getHandler).toHaveBeenCalledTimes(3);
  });

  it('returns empty array when no direct reports', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));

    const result = await getDirectReports(http);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('continues on individual fetch failures', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(MANAGER_WITH_REPORTS_FIXTURE));
    http._getHandler.mockResolvedValueOnce(mockError('Not found', 404));
    http._getHandler.mockResolvedValueOnce(mockResponse(DIRECT_REPORT_FIXTURE));

    const result = await getDirectReports(http);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Should still return the one that succeeded
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.names?.[0]?.displayName).toBe('Charlie Report');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: PeopleApi facade (via plugin)
// ---------------------------------------------------------------------------

describe('PeopleApi facade', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates getProfile through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));

    const api = people(http);
    const result = await api.getProfile();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.names?.[0]?.displayName).toBe('Alice Smith');
    }
  });

  it('delegates searchProfiles through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE_FIXTURE));

    const api = people(http);
    const result = await api.searchProfiles('engineering');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.people).toHaveLength(2);
    }
  });

  it('delegates getManager through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_WITH_RELATIONS_FIXTURE));
    http._getHandler.mockResolvedValueOnce(mockResponse(MANAGER_FIXTURE));

    const api = people(http);
    const result = await api.getManager();

    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.names?.[0]?.displayName).toBe('Bob Manager');
    }
  });

  it('delegates getDirectReports through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(MANAGER_WITH_REPORTS_FIXTURE));
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));
    http._getHandler.mockResolvedValueOnce(mockResponse(DIRECT_REPORT_FIXTURE));

    const api = people(http);
    const result = await api.getDirectReports();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
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

  it('encodes special characters in resource name', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(PERSON_FIXTURE));

    await getProfile(http, 'people/user@example.com');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('people/user@example.com');
    expect(url).toContain('personFields=');
  });

  it('encodes special characters in search query', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE_FIXTURE));

    await searchProfiles(http, 'name with spaces');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('query=name%20with%20spaces');
  });
});
