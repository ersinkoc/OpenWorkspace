/**
 * Keep service plugin for OpenWorkspace.
 * Wraps all Keep operations into a single KeepApi facade
 * and exposes a `keep()` factory function.
 */

import type { HttpClient, Result, Plugin, PluginContext } from '@openworkspace/core';
import type { WorkspaceError } from '@openworkspace/core';
import type { Note, ListNotesResponse, ListNotesOptions, Attachment } from './types.js';
import { listNotes, getNote, createNote, createListNote, deleteNote, searchNotes } from './notes.js';
import { getAttachment, downloadAttachment } from './attachments.js';

// ---------------------------------------------------------------------------
// KeepApi facade
// ---------------------------------------------------------------------------

/**
 * Unified Keep API surface that wraps all Google Keep operations.
 * Created via the {@link keep} factory function.
 */
export type KeepApi = {
  // -- Notes ----------------------------------------------------------------

  /**
   * Lists notes with optional pagination and filtering.
   * @see {@link listNotes}
   */
  listNotes(options?: ListNotesOptions): Promise<Result<ListNotesResponse, WorkspaceError>>;

  /**
   * Gets a single note by its resource name.
   * @see {@link getNote}
   */
  getNote(noteName: string): Promise<Result<Note, WorkspaceError>>;

  /**
   * Creates a new text note.
   * @see {@link createNote}
   */
  createNote(title: string, body: string): Promise<Result<Note, WorkspaceError>>;

  /**
   * Creates a new checklist note.
   * @see {@link createListNote}
   */
  createListNote(title: string, items: readonly string[]): Promise<Result<Note, WorkspaceError>>;

  /**
   * Deletes a note (moves to trash).
   * @see {@link deleteNote}
   */
  deleteNote(noteName: string): Promise<Result<void, WorkspaceError>>;

  /**
   * Searches notes by query string.
   * @see {@link searchNotes}
   */
  searchNotes(
    query: string,
    options?: Omit<ListNotesOptions, 'filter'>,
  ): Promise<Result<ListNotesResponse, WorkspaceError>>;

  // -- Attachments ----------------------------------------------------------

  /**
   * Gets attachment metadata.
   * @see {@link getAttachment}
   */
  getAttachment(attachmentName: string): Promise<Result<Attachment, WorkspaceError>>;

  /**
   * Downloads attachment content as a buffer.
   * @see {@link downloadAttachment}
   */
  downloadAttachment(attachmentName: string): Promise<Result<ArrayBuffer, WorkspaceError>>;
};

/**
 * Creates a {@link KeepApi} instance bound to the given HTTP client.
 *
 * @param http - An authenticated HTTP client (typically with OAuth2 token interceptor).
 * @returns A KeepApi facade exposing all Keep operations.
 *
 * @example
 * ```ts
 * import { createHttpClient } from '@openworkspace/core';
 * import { keep } from '@openworkspace/keep';
 *
 * const http = createHttpClient();
 * const keepApi = keep(http);
 *
 * const notes = await keepApi.listNotes({
 *   pageSize: 10,
 *   filter: 'trashed=false',
 * });
 * ```
 */
export function keep(http: HttpClient): KeepApi {
  return {
    // Notes
    listNotes: (options) => listNotes(http, options),
    getNote: (noteName) => getNote(http, noteName),
    createNote: (title, body) => createNote(http, title, body),
    createListNote: (title, items) => createListNote(http, title, items),
    deleteNote: (noteName) => deleteNote(http, noteName),
    searchNotes: (query, options) => searchNotes(http, query, options),

    // Attachments
    getAttachment: (attachmentName) => getAttachment(http, attachmentName),
    downloadAttachment: (attachmentName) => downloadAttachment(http, attachmentName),
  };
}

// ---------------------------------------------------------------------------
// Kernel Plugin
// ---------------------------------------------------------------------------

/**
 * Plugin name used for kernel registration.
 */
const PLUGIN_NAME = 'keep';

/**
 * Creates a Keep kernel plugin.
 * The plugin stores the KeepApi instance in the kernel metadata so that
 * other plugins or CLI commands can retrieve it.
 *
 * @param http - An authenticated HTTP client.
 * @returns A Plugin that registers the Keep service with the kernel.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { keepPlugin } from '@openworkspace/keep';
 *
 * const kernel = createKernel();
 * const http = createHttpClient();
 * await kernel.use(keepPlugin(http));
 * await kernel.init();
 * ```
 */
export function keepPlugin(http: HttpClient): Plugin {
  const api = keep(http);

  return {
    name: PLUGIN_NAME,
    version: '0.1.0',

    setup(ctx: PluginContext): void {
      ctx.metadata.set(PLUGIN_NAME, api);
      ctx.logger.debug('Keep plugin initialized');
    },

    teardown(ctx: PluginContext): void {
      ctx.metadata.delete(PLUGIN_NAME);
      ctx.logger.debug('Keep plugin torn down');
    },
  };
}
