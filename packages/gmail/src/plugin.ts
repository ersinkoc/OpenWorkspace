/**
 * Gmail service plugin for OpenWorkspace.
 * Provides a `gmail()` factory that returns a `Plugin` which registers
 * a `GmailApi` object on the kernel metadata store.
 *
 * @module
 */

import type { Plugin, HttpClient } from '@openworkspace/core';
import type { GmailApi } from './types.js';
import { searchMessages, getMessage, batchModify, batchDelete } from './messages.js';
import { searchThreads, getThread, modifyThread } from './threads.js';
import { listLabels, createLabel, deleteLabel } from './labels.js';
import { sendMessage } from './send.js';
import { listDrafts, createDraft, sendDraft } from './drafts.js';

/**
 * The metadata key used to store the GmailApi instance on the kernel.
 */
export const GMAIL_METADATA_KEY = 'gmail:api';

/**
 * Creates a GmailApi object that wraps all Gmail operations with the
 * provided authenticated HttpClient.
 *
 * @param http - An authenticated HTTP client (e.g. with OAuth2 bearer token interceptor).
 * @returns A GmailApi object with all Gmail operations bound to the client.
 *
 * @example
 * ```ts
 * const api = createGmailApi(authenticatedHttpClient);
 * const messages = await api.searchMessages({ q: 'is:unread' });
 * ```
 */
export function createGmailApi(http: HttpClient): GmailApi {
  return {
    searchMessages: (params) => searchMessages(http, params),
    getMessage: (params) => getMessage(http, params),
    batchModify: (params) => batchModify(http, params),
    batchDelete: (params) => batchDelete(http, params),

    searchThreads: (params) => searchThreads(http, params),
    getThread: (params) => getThread(http, params),
    modifyThread: (params) => modifyThread(http, params),

    listLabels: () => listLabels(http),
    createLabel: (params) => createLabel(http, params),
    deleteLabel: (id) => deleteLabel(http, id),

    sendMessage: (options) => sendMessage(http, options),

    listDrafts: (params) => listDrafts(http, params),
    createDraft: (options) => createDraft(http, options),
    sendDraft: (draftId) => sendDraft(http, draftId),
  };
}

/**
 * Options for the Gmail plugin factory.
 */
export type GmailPluginOptions = {
  /**
   * An authenticated HTTP client.
   * Must include an authorization interceptor (e.g. Bearer token).
   */
  readonly http: HttpClient;
};

/**
 * Creates a Gmail service plugin for the OpenWorkspace kernel.
 *
 * The plugin stores a `GmailApi` instance in the kernel metadata under
 * the key `"gmail:api"`, making it accessible to other plugins and commands.
 *
 * @param options - Plugin configuration including the authenticated HttpClient.
 * @returns A `Plugin` that can be registered with `kernel.use(gmail(...))`.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { gmail, GMAIL_METADATA_KEY } from '@openworkspace/gmail';
 *
 * const kernel = createKernel();
 * const http = createHttpClient({ baseUrl: '' });
 *
 * // Add auth interceptor to http...
 *
 * await kernel.use(gmail({ http }));
 * await kernel.init();
 *
 * // Retrieve the API from metadata
 * const api = kernel.metadata?.get(GMAIL_METADATA_KEY) as GmailApi;
 * const messages = await api.searchMessages({ q: 'is:unread' });
 * ```
 */
export function gmail(options: GmailPluginOptions): Plugin {
  const api = createGmailApi(options.http);

  return {
    name: 'gmail',
    version: '0.1.0',

    setup(context) {
      context.metadata.set(GMAIL_METADATA_KEY, api);
      context.logger.info('Gmail plugin initialized');
    },

    teardown(context) {
      context.metadata.delete(GMAIL_METADATA_KEY);
      context.logger.info('Gmail plugin torn down');
    },
  };
}
