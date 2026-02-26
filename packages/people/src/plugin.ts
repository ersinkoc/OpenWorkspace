/**
 * People service plugin for OpenWorkspace.
 * Wraps all people operations into a single PeopleApi facade
 * and exposes a `people()` factory function.
 */

import type { HttpClient, Result, Plugin, PluginContext } from '@openworkspace/core';
import type { WorkspaceError } from '@openworkspace/core';
import type {
  PersonProfile,
  GetPeopleResponse,
  SearchDirectoryResponse,
  SearchProfilesOptions,
  PeopleApi,
} from './types.js';
import { getProfile, getProfileByEmail, getBatchProfiles, searchProfiles } from './profiles.js';
import { getManager, getDirectReports } from './relations.js';

// ---------------------------------------------------------------------------
// PeopleApi facade
// ---------------------------------------------------------------------------

/**
 * Creates a {@link PeopleApi} instance bound to the given HTTP client.
 *
 * @param http - An authenticated HTTP client (typically with OAuth2 token interceptor).
 * @returns A PeopleApi facade exposing all people operations.
 *
 * @example
 * ```ts
 * import { createHttpClient } from '@openworkspace/core';
 * import { people } from '@openworkspace/people';
 *
 * const http = createHttpClient();
 * const peopleApi = people(http);
 *
 * const profile = await peopleApi.getProfile();
 * if (profile.ok) {
 *   console.log(profile.value.names?.[0]?.displayName);
 * }
 * ```
 */
export function people(http: HttpClient): PeopleApi {
  return {
    // Profiles
    getProfile: (resourceName, personFields) => getProfile(http, resourceName, personFields),
    getProfileByEmail: (email) => getProfileByEmail(http, email),
    getBatchProfiles: (resourceNames, personFields) => getBatchProfiles(http, resourceNames, personFields),
    searchProfiles: (query, options) => searchProfiles(http, query, options),

    // Relations
    getManager: (resourceName) => getManager(http, resourceName),
    getDirectReports: (resourceName) => getDirectReports(http, resourceName),
  };
}

// ---------------------------------------------------------------------------
// Kernel Plugin
// ---------------------------------------------------------------------------

/**
 * Plugin name used for kernel registration.
 */
const PLUGIN_NAME = 'people';

/**
 * Creates a People kernel plugin.
 * The plugin stores the PeopleApi instance in the kernel metadata so that
 * other plugins or CLI commands can retrieve it.
 *
 * @param http - An authenticated HTTP client.
 * @returns A Plugin that registers the people service with the kernel.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { peoplePlugin } from '@openworkspace/people';
 *
 * const kernel = createKernel();
 * const http = createHttpClient();
 * await kernel.use(peoplePlugin(http));
 * await kernel.init();
 * ```
 */
export function peoplePlugin(http: HttpClient): Plugin {
  const api = people(http);

  return {
    name: PLUGIN_NAME,
    version: '0.1.0',

    setup(ctx: PluginContext): void {
      ctx.metadata.set(PLUGIN_NAME, api);
      ctx.logger.debug('People plugin initialized');
    },

    teardown(ctx: PluginContext): void {
      ctx.metadata.delete(PLUGIN_NAME);
      ctx.logger.debug('People plugin torn down');
    },
  };
}
