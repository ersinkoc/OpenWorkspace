/**
 * @openworkspace/groups
 * Google Cloud Identity Groups API v1 service package for OpenWorkspace.
 * Zero-dependency -- uses HttpClient from @openworkspace/core.
 */

// Types
export type {
  Group,
  EntityKey,
  Membership,
  MembershipRole,
  ExpiryDetail,
  ListGroupsResponse,
  ListMembershipsResponse,
  SearchGroupsResponse,
  LookupGroupResponse,
  ListGroupsOptions,
  ListMembershipsOptions,
  SearchGroupsOptions,
  GroupsApi,
} from './types.js';

export { BASE_URL } from './types.js';

// Group operations
export {
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

// Plugin & facade
export { groups, groupsPlugin } from './plugin.js';
