/**
 * Type definitions for Google Cloud Identity Groups API v1.
 * Maps Google Cloud Identity Groups JSON responses to clean TypeScript interfaces.
 */

// ---------------------------------------------------------------------------
// Core Group types
// ---------------------------------------------------------------------------

/**
 * Base URL for Cloud Identity Groups API v1.
 */
export const BASE_URL = 'https://cloudidentity.googleapis.com/v1';

/**
 * Entity key used to uniquely identify users, groups, and other entities.
 */
export type EntityKey = {
  /** The ID of the entity. */
  readonly id: string;
  /** The namespace in which the entity exists. If not specified, the default is `identitysources/{source_id}`. */
  readonly namespace?: string;
};

/**
 * A Google Workspace group.
 */
export type Group = {
  /** Resource name of the group in the format `groups/{group_id}`. */
  readonly name: string;
  /** EntityKey of the group. */
  readonly groupKey: EntityKey;
  /** The customer resource ID for the group. */
  readonly parent?: string;
  /** The display name of the group. */
  readonly displayName?: string;
  /** An extended description of the group. */
  readonly description?: string;
  /** The time when the group was created (RFC 3339). */
  readonly createTime?: string;
  /** The time when the group was last updated (RFC 3339). */
  readonly updateTime?: string;
  /** Labels for the group. */
  readonly labels?: Readonly<Record<string, string>>;
};

/**
 * Membership role details.
 */
export type MembershipRole = {
  /** The name of the membership role. Common values: OWNER, MANAGER, MEMBER. */
  readonly name: 'OWNER' | 'MANAGER' | 'MEMBER';
  /** Expiry details for the role. */
  readonly expiryDetail?: ExpiryDetail;
};

/**
 * Expiry detail for a membership role.
 */
export type ExpiryDetail = {
  /** The time when the membership role expires (RFC 3339). */
  readonly expireTime: string;
};

/**
 * A membership in a group.
 */
export type Membership = {
  /** Resource name of the membership in the format `groups/{group_id}/memberships/{membership_id}`. */
  readonly name: string;
  /** EntityKey of the member (user, group, or service account). */
  readonly preferredMemberKey: EntityKey;
  /** The membership roles for this member. */
  readonly roles?: readonly MembershipRole[];
  /** The time when the membership was created (RFC 3339). */
  readonly createTime?: string;
  /** The time when the membership was last updated (RFC 3339). */
  readonly updateTime?: string;
  /** Type of the membership. */
  readonly type?: 'USER' | 'SERVICE_ACCOUNT' | 'GROUP' | 'OTHER';
};

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

/**
 * Response from listing groups.
 */
export type ListGroupsResponse = {
  /** List of groups. */
  readonly groups: readonly Group[];
  /** Token to retrieve the next page of results. */
  readonly nextPageToken?: string;
};

/**
 * Response from listing memberships.
 */
export type ListMembershipsResponse = {
  /** List of memberships. */
  readonly memberships: readonly Membership[];
  /** Token to retrieve the next page of results. */
  readonly nextPageToken?: string;
};

/**
 * Response from searching groups.
 */
export type SearchGroupsResponse = {
  /** List of groups matching the search query. */
  readonly groups: readonly Group[];
  /** Token to retrieve the next page of results. */
  readonly nextPageToken?: string;
};

/**
 * Response from looking up a group by its EntityKey.
 */
export type LookupGroupResponse = {
  /** Resource name of the group in the format `groups/{group_id}`. */
  readonly name: string;
};

// ---------------------------------------------------------------------------
// Options / parameter types
// ---------------------------------------------------------------------------

/**
 * Options for listing groups.
 */
export type ListGroupsOptions = {
  /** The parent resource under which to list all groups (e.g., `customers/{customer_id}`). */
  readonly parent?: string;
  /** Maximum number of results to return. */
  readonly pageSize?: number;
  /** Token to retrieve a specific page of results. */
  readonly pageToken?: string;
  /** Level of detail to return. */
  readonly view?: 'BASIC' | 'FULL';
};

/**
 * Options for listing memberships.
 */
export type ListMembershipsOptions = {
  /** Maximum number of results to return. */
  readonly pageSize?: number;
  /** Token to retrieve a specific page of results. */
  readonly pageToken?: string;
  /** Level of detail to return. */
  readonly view?: 'BASIC' | 'FULL';
};

/**
 * Options for searching groups.
 */
export type SearchGroupsOptions = {
  /** Maximum number of results to return. */
  readonly pageSize?: number;
  /** Token to retrieve a specific page of results. */
  readonly pageToken?: string;
  /** Level of detail to return. */
  readonly view?: 'BASIC' | 'FULL';
};

// ---------------------------------------------------------------------------
// GroupsApi facade type
// ---------------------------------------------------------------------------

/**
 * Unified Groups API surface that wraps all Google Cloud Identity Groups operations.
 */
export type GroupsApi = {
  /**
   * Lists groups under a parent resource.
   */
  listGroups(
    parent: string,
    options?: ListGroupsOptions,
  ): Promise<Result<ListGroupsResponse, WorkspaceError>>;

  /**
   * Gets a single group by its resource name.
   */
  getGroup(groupName: string): Promise<Result<Group, WorkspaceError>>;

  /**
   * Creates a new group.
   */
  createGroup(group: Partial<Group>): Promise<Result<Group, WorkspaceError>>;

  /**
   * Updates an existing group.
   */
  updateGroup(
    groupName: string,
    group: Partial<Group>,
    updateMask?: string,
  ): Promise<Result<Group, WorkspaceError>>;

  /**
   * Deletes a group.
   */
  deleteGroup(groupName: string): Promise<Result<void, WorkspaceError>>;

  /**
   * Searches for groups matching a query.
   */
  searchGroups(
    query: string,
    options?: SearchGroupsOptions,
  ): Promise<Result<SearchGroupsResponse, WorkspaceError>>;

  /**
   * Looks up a group by its EntityKey.
   */
  lookupGroup(
    groupKeyId: string,
    namespace?: string,
  ): Promise<Result<LookupGroupResponse, WorkspaceError>>;

  /**
   * Lists memberships in a group.
   */
  listMembers(
    groupName: string,
    options?: ListMembershipsOptions,
  ): Promise<Result<ListMembershipsResponse, WorkspaceError>>;

  /**
   * Adds a member to a group.
   */
  addMember(
    groupName: string,
    memberKey: EntityKey,
    roles?: readonly MembershipRole[],
  ): Promise<Result<Membership, WorkspaceError>>;

  /**
   * Removes a member from a group.
   */
  removeMember(membershipName: string): Promise<Result<void, WorkspaceError>>;

  /**
   * Gets details of a specific membership.
   */
  getMembership(membershipName: string): Promise<Result<Membership, WorkspaceError>>;
};

// Import Result and WorkspaceError types for the GroupsApi type definition
import type { Result } from '@openworkspace/core';
import type { WorkspaceError } from '@openworkspace/core';
