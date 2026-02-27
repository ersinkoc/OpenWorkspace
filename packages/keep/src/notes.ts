/**
 * Note operations for Google Keep API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { Note, ListNotesResponse, ListNotesOptions } from './types.js';
import { BASE_URL } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a query-string from an options object.
 * Drops `undefined` values and correctly encodes all values.
 */
function toQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Extracts a WorkspaceError from an HttpClient error result.
 * The HttpClient returns NetworkError which already extends WorkspaceError.
 */
function toWorkspaceError(error: unknown): WorkspaceError {
  if (error instanceof WorkspaceError) {
    return error;
  }
  return new WorkspaceError(
    error instanceof Error ? error.message : String(error),
    'KEEP_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Note operations
// ---------------------------------------------------------------------------

/**
 * Lists notes with optional pagination and filtering.
 *
 * @param http - Authenticated HTTP client.
 * @param options - Optional filtering / pagination parameters.
 * @returns A paginated list of notes.
 *
 * @example
 * ```ts
 * const result = await listNotes(http, {
 *   pageSize: 10,
 *   filter: 'trashed=false',
 * });
 * if (result.ok) {
 *   for (const note of result.value.notes) {
 *     console.log(note.title);
 *   }
 * }
 * ```
 */
export async function listNotes(
  http: HttpClient,
  options: ListNotesOptions = {},
): Promise<Result<ListNotesResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/notes${qs}`;

  const result = await http.get<ListNotesResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets a single note by its resource name.
 *
 * @param http - Authenticated HTTP client.
 * @param noteName - Note resource name (format: `notes/{note_id}`).
 * @returns The requested note.
 *
 * @example
 * ```ts
 * const result = await getNote(http, 'notes/abc123');
 * if (result.ok) console.log(result.value.title);
 * ```
 */
export async function getNote(
  http: HttpClient,
  noteName: string,
): Promise<Result<Note, WorkspaceError>> {
  const url = `${BASE_URL}/${noteName}`;

  const result = await http.get<Note>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new text note.
 *
 * @param http - Authenticated HTTP client.
 * @param title - Title of the note.
 * @param body - Body text of the note.
 * @returns The newly created note.
 *
 * @example
 * ```ts
 * const result = await createNote(http, 'Meeting Notes', 'Discussed project timeline...');
 * if (result.ok) console.log('Created:', result.value.name);
 * ```
 */
export async function createNote(
  http: HttpClient,
  title: string,
  body: string,
): Promise<Result<Note, WorkspaceError>> {
  const url = `${BASE_URL}/notes`;

  const result = await http.post<Note>(url, {
    body: {
      title,
      body: {
        text: { text: body },
      },
    },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new checklist note.
 *
 * @param http - Authenticated HTTP client.
 * @param title - Title of the note.
 * @param items - Array of checklist item texts.
 * @returns The newly created checklist note.
 *
 * @example
 * ```ts
 * const result = await createListNote(http, 'Shopping List', [
 *   'Milk',
 *   'Eggs',
 *   'Bread',
 * ]);
 * if (result.ok) console.log('Created:', result.value.name);
 * ```
 */
export async function createListNote(
  http: HttpClient,
  title: string,
  items: readonly string[],
): Promise<Result<Note, WorkspaceError>> {
  const url = `${BASE_URL}/notes`;

  const listItems = items.map((item) => ({
    text: { text: item },
    checked: false,
  }));

  const result = await http.post<Note>(url, {
    body: {
      title,
      body: {
        list: { listItems },
      },
    },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Deletes a note (moves to trash).
 *
 * @param http - Authenticated HTTP client.
 * @param noteName - Note resource name (format: `notes/{note_id}`).
 * @returns `void` on success.
 *
 * @example
 * ```ts
 * const result = await deleteNote(http, 'notes/abc123');
 * if (result.ok) console.log('Deleted');
 * ```
 */
export async function deleteNote(
  http: HttpClient,
  noteName: string,
): Promise<Result<void, WorkspaceError>> {
  const url = `${BASE_URL}/${noteName}`;

  const result = await http.delete(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(undefined);
}

/**
 * Searches notes by query string.
 * The Keep API does not support free-text search, so this fetches all notes
 * and filters client-side by matching the query against note titles and body text.
 *
 * @param http - Authenticated HTTP client.
 * @param query - Search query string (case-insensitive substring match).
 * @param options - Additional pagination parameters.
 * @returns A list of matching notes.
 *
 * @example
 * ```ts
 * const result = await searchNotes(http, 'meeting', {
 *   pageSize: 5,
 * });
 * if (result.ok) {
 *   console.log(`Found ${result.value.notes.length} notes`);
 * }
 * ```
 */
export async function searchNotes(
  http: HttpClient,
  query: string,
  options: Omit<ListNotesOptions, 'filter'> = {},
): Promise<Result<ListNotesResponse, WorkspaceError>> {
  // Keep API does not support free-text search -- fetch all and filter client-side
  const result = await listNotes(http, options);
  if (!result.ok) return result;

  const lowerQuery = query.toLowerCase();
  const filtered = (result.value.notes ?? []).filter(note => {
    const title = note.title ?? '';
    const bodyText = note.body?.text?.text ?? '';
    const listText = (note.body?.list?.listItems ?? []).map(li => li.text?.text ?? '').join(' ');
    return (
      title.toLowerCase().includes(lowerQuery) ||
      bodyText.toLowerCase().includes(lowerQuery) ||
      listText.toLowerCase().includes(lowerQuery)
    );
  });

  return ok({ ...result.value, notes: filtered });
}
