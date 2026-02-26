/**
 * Groups service plugin for OpenWorkspace.
 * Wraps all groups operations into a single GroupsApi facade
 * and exposes a `groups()` factory function.
 */

import type { HttpClient, Plugin, PluginContext } from '@openworkspace/core';
import type { GroupsApi } from './types.js';
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
// GroupsApi facade
// ---------------------------------------------------------------------------

/**
 * Creates a {@link GroupsApi} instance bound to the given HTTP client.
 *
 * @param http - An authenticated HTTP client (typically with OAuth2 token interceptor).
 * @returns A GroupsApi facade exposing all groups operations.
 *
 * @example
 * ```ts
 * import { createHttpClient } from '@openworkspace/core';
 * import { groups } from '@openworkspace/groups';
 *
 * const http = createHttpClient();
 * const groupsApi = groups(http);
 *
 * const result = await groupsApi.listGroups('customers/C12345678', {
 *   pageSize: 10,
 *   view: 'FULL',
 * });
 * ```
 */
export function groups(http: HttpClient): GroupsApi {
  return {
    // Group operations
    listGroups: (parent, options) => listGroups(http, parent, options),
    getGroup: (groupName) => getGroup(http, groupName),
    createGroup: (group) => createGroup(http, group),
    updateGroup: (groupName, group, updateMask) => updateGroup(http, groupName, group, updateMask),
    deleteGroup: (groupName) => deleteGroup(http, groupName),
    searchGroups: (query, options) => searchGroups(http, query, options),
    lookupGroup: (groupKeyId, namespace) => lookupGroup(http, groupKeyId, namespace),

    // Membership operations
    listMembers: (groupName, options) => listMembers(http, groupName, options),
    addMember: (groupName, memberKey, roles) => addMember(http, groupName, memberKey, roles),
    removeMember: (membershipName) => removeMember(http, membershipName),
    getMembership: (membershipName) => getMembership(http, membershipName),
  };
}

// ---------------------------------------------------------------------------
// Kernel Plugin
// ---------------------------------------------------------------------------

/**
 * Plugin name used for kernel registration.
 */
const PLUGIN_NAME = 'groups';

/**
 * Creates a Groups kernel plugin.
 * The plugin stores the GroupsApi instance in the kernel metadata so that
 * other plugins or CLI commands can retrieve it.
 *
 * @param http - An authenticated HTTP client.
 * @returns A Plugin that registers the groups service with the kernel.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { groupsPlugin } from '@openworkspace/groups';
 *
 * const kernel = createKernel();
 * const http = createHttpClient();
 * await kernel.use(groupsPlugin(http));
 * await kernel.init();
 * ```
 */
export function groupsPlugin(http: HttpClient): Plugin {
  const api = groups(http);

  return {
    name: PLUGIN_NAME,
    version: '0.1.0',

    setup(ctx: PluginContext): void {
      ctx.metadata.set(PLUGIN_NAME, api);
      ctx.logger.debug('Groups plugin initialized');
    },

    teardown(ctx: PluginContext): void {
      ctx.metadata.delete(PLUGIN_NAME);
      ctx.logger.debug('Groups plugin torn down');
    },
  };
}
