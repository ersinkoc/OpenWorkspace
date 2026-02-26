/**
 * Other contacts operations for Google People API v1.
 * These operations manage contacts discovered through interactions.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type {
  ListConnectionsResponse,
  SearchResponse,
  ListOtherContactsOptions,
} from './types.js';
import { BASE_URL, DEFAULT_PERSON_FIELDS } from './types.js';

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
      if (Array.isArray(value)) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.join(','))}`);
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Extracts a WorkspaceError from an HttpClient error result.
 */
function toWorkspaceError(error: unknown): WorkspaceError {
  if (error instanceof WorkspaceError) {
    return error;
  }
  return new WorkspaceError(
    error instanceof Error ? error.message : String(error),
    'CONTACTS_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Other contacts operations
// ---------------------------------------------------------------------------

/**
 * Lists other contacts (contacts discovered through interactions).
 * These are auto-created contacts from email interactions, etc.
 *
 * @param http - Authenticated HTTP client.
 * @param options - Optional filtering / pagination parameters.
 * @returns A paginated list of other contacts.
 *
 * @example
 * ```ts
 * const result = await listOtherContacts(http, {
 *   pageSize: 100,
 * });
 * if (result.ok) {
 *   for (const person of result.value.connections || []) {
 *     console.log(person.emailAddresses?.[0]?.value);
 *   }
 * }
 * ```
 */
export async function listOtherContacts(
  http: HttpClient,
  options: ListOtherContactsOptions = {},
): Promise<Result<ListConnectionsResponse, WorkspaceError>> {
  const params = {
    pageSize: options.pageSize,
    pageToken: options.pageToken,
    readMask: options.personFields ?? DEFAULT_PERSON_FIELDS,
  };
  const qs = toQueryString(params);
  const url = `${BASE_URL}/otherContacts${qs}`;

  const result = await http.get<ListConnectionsResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Searches other contacts.
 *
 * @param http - Authenticated HTTP client.
 * @param query - The search query.
 * @returns A list of matching other contacts.
 *
 * @example
 * ```ts
 * const result = await searchOtherContacts(http, 'example.com');
 * if (result.ok) {
 *   for (const match of result.value.results || []) {
 *     console.log(match.person.emailAddresses?.[0]?.value);
 *   }
 * }
 * ```
 */
export async function searchOtherContacts(
  http: HttpClient,
  query: string,
): Promise<Result<SearchResponse, WorkspaceError>> {
  const params = {
    query,
    readMask: DEFAULT_PERSON_FIELDS,
  };
  const qs = toQueryString(params);
  const url = `${BASE_URL}/otherContacts:search${qs}`;

  const result = await http.get<SearchResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
