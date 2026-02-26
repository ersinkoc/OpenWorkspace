/**
 * Docs service plugin for OpenWorkspace.
 * Wraps all docs operations into a single DocsApi facade
 * and exposes a `docs()` factory function.
 */

import type { HttpClient, Result, Plugin, PluginContext } from '@openworkspace/core';
import type { WorkspaceError } from '@openworkspace/core';
import type {
  Document,
  DocumentTabsResponse,
  BatchUpdateResponse,
  Request,
  ExportFormat,
  DocsApi,
} from './types.js';
import { getDocument, createDocument, copyDocument, getDocumentTabs } from './documents.js';
import { readText, batchUpdate, insertText, deleteContent, replaceAllText } from './content.js';
import { exportDocument } from './export.js';

// ---------------------------------------------------------------------------
// DocsApi factory
// ---------------------------------------------------------------------------

/**
 * Creates a {@link DocsApi} instance bound to the given HTTP client.
 *
 * @param http - An authenticated HTTP client (typically with OAuth2 token interceptor).
 * @returns A DocsApi facade exposing all docs operations.
 *
 * @example
 * ```ts
 * import { createHttpClient } from '@openworkspace/core';
 * import { createDocsApi } from '@openworkspace/docs';
 *
 * const http = createHttpClient();
 * const docsApi = createDocsApi(http);
 *
 * const doc = await docsApi.getDocument('doc-id');
 * if (doc.ok) console.log(doc.value.title);
 * ```
 */
export function createDocsApi(http: HttpClient): DocsApi {
  return {
    // Documents
    getDocument: (documentId) => getDocument(http, documentId),
    createDocument: (title) => createDocument(http, title),
    copyDocument: (documentId, title) => copyDocument(http, documentId, title),
    getDocumentTabs: (documentId) => getDocumentTabs(http, documentId),

    // Content
    readText: (documentId) => readText(http, documentId),
    batchUpdate: (documentId, requests) => batchUpdate(http, documentId, requests),
    insertText: (documentId, text, index) => insertText(http, documentId, text, index),
    deleteContent: (documentId, startIndex, endIndex) =>
      deleteContent(http, documentId, startIndex, endIndex),
    replaceAllText: (documentId, searchText, replaceText) =>
      replaceAllText(http, documentId, searchText, replaceText),

    // Export
    exportDocument: (documentId, mimeType) => exportDocument(http, documentId, mimeType),
  };
}

// ---------------------------------------------------------------------------
// Kernel Plugin
// ---------------------------------------------------------------------------

/**
 * Plugin name used for kernel registration.
 */
const PLUGIN_NAME = 'docs';

/**
 * Creates a Docs kernel plugin.
 * The plugin stores the DocsApi instance in the kernel metadata so that
 * other plugins or CLI commands can retrieve it.
 *
 * @param http - An authenticated HTTP client.
 * @returns A Plugin that registers the docs service with the kernel.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { docs } from '@openworkspace/docs';
 *
 * const kernel = createKernel();
 * const http = createHttpClient();
 * await kernel.use(docs(http));
 * await kernel.init();
 * ```
 */
export function docs(http: HttpClient): Plugin {
  const api = createDocsApi(http);

  return {
    name: PLUGIN_NAME,
    version: '0.1.0',

    setup(ctx: PluginContext): void {
      ctx.metadata.set(PLUGIN_NAME, api);
      ctx.logger.debug('Docs plugin initialized');
    },

    teardown(ctx: PluginContext): void {
      ctx.metadata.delete(PLUGIN_NAME);
      ctx.logger.debug('Docs plugin torn down');
    },
  };
}
