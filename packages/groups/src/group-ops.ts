/**
 * Group operations for Google Cloud Identity Groups API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type {
  Group,
  Membership,
  EntityKey,
  MembershipRole,
  ListGroupsResponse,
  ListMembershipsResponse,
  SearchGroupsResponse,
  LookupGroupResponse,
  ListGroupsOptions,
  ListMembershipsOptions,
  SearchGroupsOptions,
} from './types.js';
import { BASE_URL } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a query-string from an options object.
 * Drops `undefined` values and correctly encodes all values.
 */
function toQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Extracts a WorkspaceError from an HttpClient error result.
 * The HttpClient returns NetworkError which already extends WorkspaceError.
 */
function toWorkspaceError(error: unknown): WorkspaceError {
  if (error instanceof WorkspaceError) {
    return error;
  }
  return new WorkspaceError(
    error instanceof Error ? error.message : String(error),
    'GROUPS_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Group operations
// ---------------------------------------------------------------------------

/**
 * Lists groups under a parent resource.
 *
 * @param http - Authenticated HTTP client.
 * @param parent - The parent resource (e.g., `customers/{customer_id}`).
 * @param options - Optional filtering / pagination parameters.
 * @returns A paginated list of groups.
 *
 * @example
 * ```ts
 * const result = await listGroups(http, 'customers/C12345678', {
 *   pageSize: 10,
 *   view: 'FULL',
 * });
 * if (result.ok) {
 *   for (const group of result.value.groups) {
 *     console.log(group.displayName);
 *   }
 * }
 * ```
 */
export async function listGroups(
  http: HttpClient,
  parent: string,
  options: ListGroupsOptions = {},
): Promise<Result<ListGroupsResponse, WorkspaceError>> {
  const qs = toQueryString({ parent, ...options } as Record<string, unknown>);
  const url = `${BASE_URL}/groups${qs}`;

  const result = await http.get<ListGroupsResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets a single group by its resource name.
 *
 * @param http - Authenticated HTTP client.
 * @param groupName - Resource name of the group (e.g., `groups/{group_id}`).
 * @returns The requested group.
 *
 * @example
 * ```ts
 * const result = await getGroup(http, 'groups/123456789');
 * if (result.ok) console.log(result.value.displayName);
 * ```
 */
export async function getGroup(
  http: HttpClient,
  groupName: string,
): Promise<Result<Group, WorkspaceError>> {
  const url = `${BASE_URL}/${groupName}`;

  const result = await http.get<Group>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new group.
 *
 * @param http - Authenticated HTTP client.
 * @param group - Group data.
 * @returns The newly created group.
 *
 * @example
 * ```ts
 * const result = await createGroup(http, {
 *   parent: 'customers/C12345678',
 *   groupKey: { id: 'team@example.com' },
 *   displayName: 'Engineering Team',
 *   description: 'All engineering staff',
 *   labels: { 'cloudidentity.googleapis.com/groups.discussion_forum': '' },
 * });
 * if (result.ok) console.log('Created:', result.value.name);
 * ```
 */
export async function createGroup(
  http: HttpClient,
  group: Partial<Group>,
): Promise<Result<Group, WorkspaceError>> {
  const url = `${BASE_URL}/groups`;

  const result = await http.post<Group>(url, {
    body: group as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Updates an existing group.
 *
 * @param http - Authenticated HTTP client.
 * @param groupName - Resource name of the group.
 * @param group - Fields to update.
 * @param updateMask - Field mask specifying which fields to update.
 * @returns The updated group.
 *
 * @example
 * ```ts
 * const result = await updateGroup(
 *   http,
 *   'groups/123456789',
 *   { displayName: 'Updated Team Name' },
 *   'displayName',
 * );
 * if (result.ok) console.log('Updated:', result.value.displayName);
 * ```
 */
export async function updateGroup(
  http: HttpClient,
  groupName: string,
  group: Partial<Group>,
  updateMask?: string,
): Promise<Result<Group, WorkspaceError>> {
  const qs = toQueryString({ updateMask });
  const url = `${BASE_URL}/${groupName}${qs}`;

  const result = await http.patch<Group>(url, {
    body: group as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Deletes a group.
 *
 * @param http - Authenticated HTTP client.
 * @param groupName - Resource name of the group.
 * @returns `void` on success.
 *
 * @example
 * ```ts
 * const result = await deleteGroup(http, 'groups/123456789');
 * if (result.ok) console.log('Deleted');
 * ```
 */
export async function deleteGroup(
  http: HttpClient,
  groupName: string,
): Promise<Result<void, WorkspaceError>> {
  const url = `${BASE_URL}/${groupName}`;

  const result = await http.delete(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(undefined);
}

/**
 * Searches for groups matching a query.
 *
 * @param http - Authenticated HTTP client.
 * @param query - Search query (e.g., `parent==customers/C12345678 && displayName:eng*`).
 * @param options - Optional pagination parameters.
 * @returns A paginated list of matching groups.
 *
 * @example
 * ```ts
 * const result = await searchGroups(
 *   http,
 *   'parent==customers/C12345678 && displayName:engineering',
 *   { pageSize: 10 },
 * );
 * if (result.ok) {
 *   console.log(`Found ${result.value.groups.length} groups`);
 * }
 * ```
 */
export async function searchGroups(
  http: HttpClient,
  query: string,
  options: SearchGroupsOptions = {},
): Promise<Result<SearchGroupsResponse, WorkspaceError>> {
  const qs = toQueryString({ query, ...options } as Record<string, unknown>);
  const url = `${BASE_URL}/groups:search${qs}`;

  const result = await http.get<SearchGroupsResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Looks up a group by its EntityKey.
 *
 * @param http - Authenticated HTTP client.
 * @param groupKeyId - The ID of the group's EntityKey (e.g., email address).
 * @param namespace - Optional namespace for the EntityKey.
 * @returns The resource name of the group.
 *
 * @example
 * ```ts
 * const result = await lookupGroup(http, 'team@example.com');
 * if (result.ok) {
 *   console.log('Group resource name:', result.value.name);
 * }
 * ```
 */
export async function lookupGroup(
  http: HttpClient,
  groupKeyId: string,
  namespace?: string,
): Promise<Result<LookupGroupResponse, WorkspaceError>> {
  const qs = toQueryString({
    'groupKey.id': groupKeyId,
    'groupKey.namespace': namespace,
  });
  const url = `${BASE_URL}/groups:lookup${qs}`;

  const result = await http.get<LookupGroupResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Lists memberships in a group.
 *
 * @param http - Authenticated HTTP client.
 * @param groupName - Resource name of the group.
 * @param options - Optional pagination parameters.
 * @returns A paginated list of memberships.
 *
 * @example
 * ```ts
 * const result = await listMembers(http, 'groups/123456789', {
 *   pageSize: 50,
 *   view: 'FULL',
 * });
 * if (result.ok) {
 *   for (const member of result.value.memberships) {
 *     console.log(member.preferredMemberKey.id);
 *   }
 * }
 * ```
 */
export async function listMembers(
  http: HttpClient,
  groupName: string,
  options: ListMembershipsOptions = {},
): Promise<Result<ListMembershipsResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/${groupName}/memberships${qs}`;

  const result = await http.get<ListMembershipsResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Adds a member to a group.
 *
 * @param http - Authenticated HTTP client.
 * @param groupName - Resource name of the group.
 * @param memberKey - EntityKey of the member to add.
 * @param roles - Optional roles for the member (defaults to MEMBER).
 * @returns The newly created membership.
 *
 * @example
 * ```ts
 * const result = await addMember(
 *   http,
 *   'groups/123456789',
 *   { id: 'user@example.com' },
 *   [{ name: 'MEMBER' }],
 * );
 * if (result.ok) console.log('Added:', result.value.preferredMemberKey.id);
 * ```
 */
export async function addMember(
  http: HttpClient,
  groupName: string,
  memberKey: EntityKey,
  roles?: readonly MembershipRole[],
): Promise<Result<Membership, WorkspaceError>> {
  const url = `${BASE_URL}/${groupName}/memberships`;

  const body: Partial<Membership> = {
    preferredMemberKey: memberKey,
    roles: roles ?? [{ name: 'MEMBER' }],
  };

  const result = await http.post<Membership>(url, {
    body: body as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Removes a member from a group.
 *
 * @param http - Authenticated HTTP client.
 * @param membershipName - Resource name of the membership (e.g., `groups/{group_id}/memberships/{membership_id}`).
 * @returns `void` on success.
 *
 * @example
 * ```ts
 * const result = await removeMember(http, 'groups/123/memberships/456');
 * if (result.ok) console.log('Member removed');
 * ```
 */
export async function removeMember(
  http: HttpClient,
  membershipName: string,
): Promise<Result<void, WorkspaceError>> {
  const url = `${BASE_URL}/${membershipName}`;

  const result = await http.delete(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(undefined);
}

/**
 * Gets details of a specific membership.
 *
 * @param http - Authenticated HTTP client.
 * @param membershipName - Resource name of the membership.
 * @returns The requested membership.
 *
 * @example
 * ```ts
 * const result = await getMembership(http, 'groups/123/memberships/456');
 * if (result.ok) {
 *   console.log('Member:', result.value.preferredMemberKey.id);
 *   console.log('Roles:', result.value.roles?.map(r => r.name).join(', '));
 * }
 * ```
 */
export async function getMembership(
  http: HttpClient,
  membershipName: string,
): Promise<Result<Membership, WorkspaceError>> {
  const url = `${BASE_URL}/${membershipName}`;

  const result = await http.get<Membership>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
