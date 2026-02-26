/**
 * Contacts service plugin for OpenWorkspace.
 * Wraps all contacts operations into a single ContactsApi facade
 * and exposes a `contacts()` factory function.
 */

import type { HttpClient, Plugin, PluginContext } from '@openworkspace/core';
import type { ContactsApi } from './types.js';
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

// ---------------------------------------------------------------------------
// ContactsApi factory
// ---------------------------------------------------------------------------

/**
 * Creates a {@link ContactsApi} instance bound to the given HTTP client.
 *
 * @param http - An authenticated HTTP client (typically with OAuth2 token interceptor).
 * @returns A ContactsApi facade exposing all contacts operations.
 *
 * @example
 * ```ts
 * import { createHttpClient } from '@openworkspace/core';
 * import { contacts } from '@openworkspace/contacts';
 *
 * const http = createHttpClient();
 * const api = contacts(http);
 *
 * const result = await api.listContacts({
 *   pageSize: 100,
 *   personFields: 'names,emailAddresses',
 * });
 * ```
 */
export function contacts(http: HttpClient): ContactsApi {
  return {
    // Contacts
    listContacts: (options) => listContacts(http, options),
    getContact: (resourceName, personFields) => getContact(http, resourceName, personFields),
    createContact: (person) => createContact(http, person),
    updateContact: (resourceName, person, updatePersonFields) =>
      updateContact(http, resourceName, person, updatePersonFields),
    deleteContact: (resourceName) => deleteContact(http, resourceName),
    searchContacts: (query, options) => searchContacts(http, query, options),

    // Directory
    listDirectoryPeople: (options) => listDirectoryPeople(http, options),
    searchDirectoryPeople: (query, options) => searchDirectoryPeople(http, query, options),

    // Other Contacts
    listOtherContacts: (options) => listOtherContacts(http, options),
    searchOtherContacts: (query) => searchOtherContacts(http, query),
  };
}

// ---------------------------------------------------------------------------
// Kernel Plugin
// ---------------------------------------------------------------------------

/**
 * Plugin name used for kernel registration.
 */
const PLUGIN_NAME = 'contacts';

/**
 * Creates a Contacts kernel plugin.
 * The plugin stores the ContactsApi instance in the kernel metadata so that
 * other plugins or CLI commands can retrieve it.
 *
 * @param http - An authenticated HTTP client.
 * @returns A Plugin that registers the contacts service with the kernel.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { contactsPlugin } from '@openworkspace/contacts';
 *
 * const kernel = createKernel();
 * const http = createHttpClient();
 * await kernel.use(contactsPlugin(http));
 * await kernel.init();
 * ```
 */
export function contactsPlugin(http: HttpClient): Plugin {
  const api = contacts(http);

  return {
    name: PLUGIN_NAME,
    version: '0.1.0',

    setup(ctx: PluginContext): void {
      ctx.metadata.set(PLUGIN_NAME, api);
      ctx.logger.debug('Contacts plugin initialized');
    },

    teardown(ctx: PluginContext): void {
      ctx.metadata.delete(PLUGIN_NAME);
      ctx.logger.debug('Contacts plugin torn down');
    },
  };
}
