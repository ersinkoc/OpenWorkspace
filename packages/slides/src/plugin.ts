/**
 * Slides service plugin for OpenWorkspace.
 * Wraps all slides operations into a single SlidesApi facade
 * and exposes a `slides()` factory function.
 */

import type { HttpClient, Result, Plugin, PluginContext } from '@openworkspace/core';
import type { WorkspaceError } from '@openworkspace/core';
import type {
  Presentation,
  Page,
  BatchUpdateResponse,
  Request,
  ExportFormat,
  SlidesApi,
} from './types.js';
import { getPresentation, createPresentation, getSlide } from './presentations.js';
import { batchUpdate, addSlide, deleteSlide, replaceAllText, updateSpeakerNotes } from './slide-ops.js';
import { exportPresentation } from './export.js';

// ---------------------------------------------------------------------------
// SlidesApi facade
// ---------------------------------------------------------------------------

/**
 * Creates a {@link SlidesApi} instance bound to the given HTTP client.
 *
 * @param http - An authenticated HTTP client (typically with OAuth2 token interceptor).
 * @returns A SlidesApi facade exposing all slides operations.
 *
 * @example
 * ```ts
 * import { createHttpClient } from '@openworkspace/core';
 * import { slides } from '@openworkspace/slides';
 *
 * const http = createHttpClient();
 * const slidesApi = slides(http);
 *
 * const presentation = await slidesApi.getPresentation('abc123');
 * if (presentation.ok) {
 *   console.log(presentation.value.title);
 * }
 * ```
 */
export function slides(http: HttpClient): SlidesApi {
  return {
    // Presentation operations
    getPresentation: (presentationId) => getPresentation(http, presentationId),
    createPresentation: (title) => createPresentation(http, title),
    getSlide: (presentationId, slideId) => getSlide(http, presentationId, slideId),

    // Slide operations
    batchUpdate: (presentationId, requests) => batchUpdate(http, presentationId, requests),
    addSlide: (presentationId, layoutId, insertionIndex) =>
      addSlide(http, presentationId, layoutId, insertionIndex),
    deleteSlide: (presentationId, slideId) => deleteSlide(http, presentationId, slideId),
    replaceAllText: (presentationId, searchText, replaceText) =>
      replaceAllText(http, presentationId, searchText, replaceText),
    updateSpeakerNotes: (presentationId, slideId, notes) =>
      updateSpeakerNotes(http, presentationId, slideId, notes),

    // Export operations
    exportPresentation: (presentationId, mimeType) =>
      exportPresentation(http, presentationId, mimeType),
  };
}

// ---------------------------------------------------------------------------
// Kernel Plugin
// ---------------------------------------------------------------------------

/**
 * Plugin name used for kernel registration.
 */
const PLUGIN_NAME = 'slides';

/**
 * Creates a Slides kernel plugin.
 * The plugin stores the SlidesApi instance in the kernel metadata so that
 * other plugins or CLI commands can retrieve it.
 *
 * @param http - An authenticated HTTP client.
 * @returns A Plugin that registers the slides service with the kernel.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { slidesPlugin } from '@openworkspace/slides';
 *
 * const kernel = createKernel();
 * const http = createHttpClient();
 * await kernel.use(slidesPlugin(http));
 * await kernel.init();
 * ```
 */
export function slidesPlugin(http: HttpClient): Plugin {
  const api = slides(http);

  return {
    name: PLUGIN_NAME,
    version: '0.1.0',

    setup(ctx: PluginContext): void {
      ctx.metadata.set(PLUGIN_NAME, api);
      ctx.logger.debug('Slides plugin initialized');
    },

    teardown(ctx: PluginContext): void {
      ctx.metadata.delete(PLUGIN_NAME);
      ctx.logger.debug('Slides plugin torn down');
    },
  };
}
