/**
 * Forms service plugin for OpenWorkspace.
 * Wraps all forms operations into a single FormsApi facade
 * and exposes a `forms()` factory function.
 */

import type { HttpClient, Result, Plugin, PluginContext } from '@openworkspace/core';
import type { WorkspaceError } from '@openworkspace/core';
import type {
  Form,
  Info,
  BatchUpdateFormResponse,
  Request,
  Item,
  Location,
  FormResponse,
  ListFormResponsesResponse,
  ListResponsesOptions,
  FormsApi,
} from './types.js';
import { getForm, createForm, batchUpdateForm, addQuestion, deleteItem } from './form-ops.js';
import { listResponses, getResponse } from './responses.js';

// ---------------------------------------------------------------------------
// FormsApi facade
// ---------------------------------------------------------------------------

/**
 * Creates a {@link FormsApi} instance bound to the given HTTP client.
 *
 * @param http - An authenticated HTTP client (typically with OAuth2 token interceptor).
 * @returns A FormsApi facade exposing all forms operations.
 *
 * @example
 * ```ts
 * import { createHttpClient } from '@openworkspace/core';
 * import { createFormsApi } from '@openworkspace/forms';
 *
 * const http = createHttpClient();
 * const api = createFormsApi(http);
 *
 * const form = await api.createForm({
 *   title: 'Customer Feedback',
 *   description: 'Tell us what you think!',
 * });
 * ```
 */
export function createFormsApi(http: HttpClient): FormsApi {
  return {
    getForm: (formId) => getForm(http, formId),
    createForm: (info) => createForm(http, info),
    batchUpdateForm: (formId, requests) => batchUpdateForm(http, formId, requests),
    addQuestion: (formId, item, location) => addQuestion(http, formId, item, location),
    deleteItem: (formId, index) => deleteItem(http, formId, index),
    listResponses: (formId, options) => listResponses(http, formId, options),
    getResponse: (formId, responseId) => getResponse(http, formId, responseId),
  };
}

// ---------------------------------------------------------------------------
// Kernel Plugin
// ---------------------------------------------------------------------------

/**
 * Plugin name used for kernel registration.
 */
const PLUGIN_NAME = 'forms';

/**
 * Creates a Forms kernel plugin.
 * The plugin stores the FormsApi instance in the kernel metadata so that
 * other plugins or CLI commands can retrieve it.
 *
 * @param http - An authenticated HTTP client.
 * @returns A Plugin that registers the forms service with the kernel.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { formsPlugin } from '@openworkspace/forms';
 *
 * const kernel = createKernel();
 * const http = createHttpClient();
 * await kernel.use(formsPlugin(http));
 * await kernel.init();
 * ```
 */
export function formsPlugin(http: HttpClient): Plugin {
  const api = createFormsApi(http);

  return {
    name: PLUGIN_NAME,
    version: '0.1.0',

    setup(ctx: PluginContext): void {
      ctx.metadata.set(PLUGIN_NAME, api);
      ctx.logger.debug('Forms plugin initialized');
    },

    teardown(ctx: PluginContext): void {
      ctx.metadata.delete(PLUGIN_NAME);
      ctx.logger.debug('Forms plugin torn down');
    },
  };
}
