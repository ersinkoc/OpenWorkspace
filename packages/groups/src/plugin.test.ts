/**
 * Tests for @openworkspace/groups.
 * Uses mock HttpClient to verify all operations without network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import { groups, groupsPlugin } from './plugin.js';
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
import type {
  Group,
  Membership,
  ListGroupsResponse,
  ListMembershipsResponse,
  SearchGroupsResponse,
  LookupGroupResponse,
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

const GROUP_FIXTURE: Group = {
  name: 'groups/123456789',
  groupKey: { id: 'engineering@example.com' },
  parent: 'customers/C12345678',
  displayName: 'Engineering Team',
  description: 'All engineering staff',
  createTime: '2025-01-01T00:00:00Z',
  updateTime: '2025-01-15T00:00:00Z',
  labels: {
    'cloudidentity.googleapis.com/groups.discussion_forum': '',
  },
};

const LIST_GROUPS_FIXTURE: ListGroupsResponse = {
  groups: [
    GROUP_FIXTURE,
    {
      name: 'groups/987654321',
      groupKey: { id: 'sales@example.com' },
      parent: 'customers/C12345678',
      displayName: 'Sales Team',
      description: 'Sales organization',
      createTime: '2025-01-02T00:00:00Z',
      updateTime: '2025-01-16T00:00:00Z',
    },
  ],
  nextPageToken: 'next-page-token-123',
};

const MEMBERSHIP_FIXTURE: Membership = {
  name: 'groups/123456789/memberships/111',
  preferredMemberKey: { id: 'alice@example.com' },
  roles: [{ name: 'MEMBER' }],
  createTime: '2025-01-10T00:00:00Z',
  updateTime: '2025-01-10T00:00:00Z',
  type: 'USER',
};

const LIST_MEMBERSHIPS_FIXTURE: ListMembershipsResponse = {
  memberships: [
    MEMBERSHIP_FIXTURE,
    {
      name: 'groups/123456789/memberships/222',
      preferredMemberKey: { id: 'bob@example.com' },
      roles: [{ name: 'OWNER' }],
      createTime: '2025-01-05T00:00:00Z',
      updateTime: '2025-01-05T00:00:00Z',
      type: 'USER',
    },
  ],
  nextPageToken: 'members-page-token',
};

const SEARCH_GROUPS_FIXTURE: SearchGroupsResponse = {
  groups: [GROUP_FIXTURE],
  nextPageToken: 'search-page-token',
};

const LOOKUP_GROUP_FIXTURE: LookupGroupResponse = {
  name: 'groups/123456789',
};

// ---------------------------------------------------------------------------
// Tests: Plugin creation
// ---------------------------------------------------------------------------

describe('groups()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a GroupsApi with all expected methods', () => {
    const api = groups(http);

    expect(typeof api.listGroups).toBe('function');
    expect(typeof api.getGroup).toBe('function');
    expect(typeof api.createGroup).toBe('function');
    expect(typeof api.updateGroup).toBe('function');
    expect(typeof api.deleteGroup).toBe('function');
    expect(typeof api.searchGroups).toBe('function');
    expect(typeof api.lookupGroup).toBe('function');
    expect(typeof api.listMembers).toBe('function');
    expect(typeof api.addMember).toBe('function');
    expect(typeof api.removeMember).toBe('function');
    expect(typeof api.getMembership).toBe('function');
  });
});

describe('groupsPlugin()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a plugin with the correct name and version', () => {
    const plugin = groupsPlugin(http);

    expect(plugin.name).toBe('groups');
    expect(plugin.version).toBe('0.1.0');
    expect(typeof plugin.setup).toBe('function');
    expect(typeof plugin.teardown).toBe('function');
  });

  it('stores GroupsApi in metadata on setup', () => {
    const plugin = groupsPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);

    expect(metadata.has('groups')).toBe(true);
    const api = metadata.get('groups') as ReturnType<typeof groups>;
    expect(typeof api.listGroups).toBe('function');
  });

  it('removes GroupsApi from metadata on teardown', () => {
    const plugin = groupsPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);
    expect(metadata.has('groups')).toBe(true);

    plugin.teardown!(ctx);
    expect(metadata.has('groups')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Group operations
// ---------------------------------------------------------------------------

describe('listGroups()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of groups on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_GROUPS_FIXTURE));

    const result = await listGroups(http, 'customers/C12345678', {
      pageSize: 10,
      view: 'FULL',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.groups).toHaveLength(2);
      const first = result.value.groups[0];
      expect(first?.displayName).toBe('Engineering Team');
      expect(result.value.nextPageToken).toBe('next-page-token-123');
    }

    expect(http._getHandler).toHaveBeenCalledOnce();
    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/groups');
    expect(url).toContain('parent=');
    expect(url).toContain('pageSize=10');
    expect(url).toContain('view=FULL');
  });

  it('returns error on network failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Connection refused'));

    const result = await listGroups(http, 'customers/C12345678');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Connection refused');
    }
  });

  it('does not append query string when no options provided', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_GROUPS_FIXTURE));

    await listGroups(http, 'customers/C12345678');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('parent=customers');
  });
});

describe('getGroup()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a single group on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(GROUP_FIXTURE));

    const result = await getGroup(http, 'groups/123456789');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('groups/123456789');
      expect(result.value.displayName).toBe('Engineering Team');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/groups/123456789');
  });

  it('returns error when group not found', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Not Found', 404));

    const result = await getGroup(http, 'groups/nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not Found');
    }
  });
});

describe('createGroup()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a group and returns it', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(GROUP_FIXTURE));

    const result = await createGroup(http, {
      parent: 'customers/C12345678',
      groupKey: { id: 'engineering@example.com' },
      displayName: 'Engineering Team',
      description: 'All engineering staff',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('groups/123456789');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/groups');
  });

  it('sends group body in request config', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(GROUP_FIXTURE));

    await createGroup(http, {
      parent: 'customers/C12345678',
      groupKey: { id: 'team@example.com' },
      displayName: 'New Team',
    });

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({
      parent: 'customers/C12345678',
      displayName: 'New Team',
    });
  });
});

describe('updateGroup()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('patches a group and returns the updated version', async () => {
    const updatedGroup = { ...GROUP_FIXTURE, displayName: 'Updated Engineering' };
    http._patchHandler.mockResolvedValueOnce(mockResponse(updatedGroup));

    const result = await updateGroup(
      http,
      'groups/123456789',
      { displayName: 'Updated Engineering' },
      'displayName',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.displayName).toBe('Updated Engineering');
    }

    expect(http._patchHandler).toHaveBeenCalledOnce();
    const url = http._patchHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/groups/123456789');
    expect(url).toContain('updateMask=displayName');
  });
});

describe('deleteGroup()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('deletes a group successfully', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockResponse(null, 204));

    const result = await deleteGroup(http, 'groups/123456789');

    expect(result.ok).toBe(true);
    expect(http._deleteHandler).toHaveBeenCalledOnce();
  });
});

describe('searchGroups()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('searches for groups with a query', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SEARCH_GROUPS_FIXTURE));

    const result = await searchGroups(
      http,
      'parent==customers/C12345678 && displayName:engineering',
      { pageSize: 5 },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.groups).toHaveLength(1);
      expect(result.value.nextPageToken).toBe('search-page-token');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/groups:search');
    expect(url).toContain('query=');
    expect(url).toContain('pageSize=5');
  });
});

describe('lookupGroup()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('looks up a group by EntityKey', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LOOKUP_GROUP_FIXTURE));

    const result = await lookupGroup(http, 'engineering@example.com');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('groups/123456789');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/groups:lookup');
    expect(url).toContain('groupKey.id=');
  });

  it('includes namespace when provided', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LOOKUP_GROUP_FIXTURE));

    await lookupGroup(http, 'engineering@example.com', 'identitysources/12345');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('groupKey.namespace=');
  });
});

// ---------------------------------------------------------------------------
// Tests: Membership operations
// ---------------------------------------------------------------------------

describe('listMembers()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of memberships on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_MEMBERSHIPS_FIXTURE));

    const result = await listMembers(http, 'groups/123456789', {
      pageSize: 50,
      view: 'FULL',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.memberships).toHaveLength(2);
      const first = result.value.memberships[0];
      expect(first?.preferredMemberKey.id).toBe('alice@example.com');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/groups/123456789/memberships');
    expect(url).toContain('pageSize=50');
  });
});

describe('addMember()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('adds a member to a group', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(MEMBERSHIP_FIXTURE));

    const result = await addMember(
      http,
      'groups/123456789',
      { id: 'alice@example.com' },
      [{ name: 'MEMBER' }],
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.preferredMemberKey.id).toBe('alice@example.com');
    }

    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/groups/123456789/memberships');
  });

  it('defaults to MEMBER role when no roles provided', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(MEMBERSHIP_FIXTURE));

    await addMember(http, 'groups/123456789', { id: 'alice@example.com' });

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    const body = config.body as { roles: { name: string }[] };
    expect(body.roles).toHaveLength(1);
    expect(body.roles[0]?.name).toBe('MEMBER');
  });
});

describe('removeMember()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('removes a member from a group', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockResponse(null, 204));

    const result = await removeMember(http, 'groups/123456789/memberships/111');

    expect(result.ok).toBe(true);
    expect(http._deleteHandler).toHaveBeenCalledOnce();
  });
});

describe('getMembership()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns membership details', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(MEMBERSHIP_FIXTURE));

    const result = await getMembership(http, 'groups/123456789/memberships/111');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.preferredMemberKey.id).toBe('alice@example.com');
      expect(result.value.roles).toHaveLength(1);
      expect(result.value.roles?.[0]?.name).toBe('MEMBER');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/groups/123456789/memberships/111');
  });
});

// ---------------------------------------------------------------------------
// Tests: GroupsApi facade
// ---------------------------------------------------------------------------

describe('GroupsApi facade', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates listGroups through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(LIST_GROUPS_FIXTURE));

    const api = groups(http);
    const result = await api.listGroups('customers/C12345678', { pageSize: 10 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.groups).toHaveLength(2);
    }
  });

  it('delegates createGroup through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(GROUP_FIXTURE));

    const api = groups(http);
    const result = await api.createGroup({
      parent: 'customers/C12345678',
      groupKey: { id: 'team@example.com' },
      displayName: 'New Team',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('groups/123456789');
    }
  });

  it('delegates searchGroups through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SEARCH_GROUPS_FIXTURE));

    const api = groups(http);
    const result = await api.searchGroups('displayName:eng*');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.groups).toHaveLength(1);
    }
  });

  it('delegates addMember through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(MEMBERSHIP_FIXTURE));

    const api = groups(http);
    const result = await api.addMember('groups/123456789', { id: 'alice@example.com' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.preferredMemberKey.id).toBe('alice@example.com');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: Error handling
// ---------------------------------------------------------------------------

describe('Error handling', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('handles 403 Forbidden errors', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Forbidden', 403));

    const result = await getGroup(http, 'groups/123456789');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Forbidden');
    }
  });

  it('handles 404 Not Found errors', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Group not found', 404));

    const result = await getGroup(http, 'groups/nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Group not found');
    }
  });

  it('handles network errors on POST', async () => {
    http._postHandler.mockResolvedValueOnce(mockError('Network timeout', 500));

    const result = await createGroup(http, {
      parent: 'customers/C12345678',
      groupKey: { id: 'test@example.com' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Network timeout');
    }
  });
});
