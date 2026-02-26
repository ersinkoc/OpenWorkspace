/**
 * Directory operations for Google People API v1.
 * These operations list and search the organization's directory.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type {
  ListConnectionsResponse,
  SearchResponse,
  ListDirectoryPeopleOptions,
  SearchContactsOptions,
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
// Directory operations
// ---------------------------------------------------------------------------

/**
 * Lists people in the organization's directory.
 * Requires domain-wide delegation or G Suite/Workspace admin permissions.
 *
 * @param http - Authenticated HTTP client.
 * @param options - Optional filtering / pagination parameters.
 * @returns A paginated list of directory people.
 *
 * @example
 * ```ts
 * const result = await listDirectoryPeople(http, {
 *   pageSize: 100,
 *   sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'],
 * });
 * if (result.ok) {
 *   for (const person of result.value.connections || []) {
 *     console.log(person.names?.[0]?.displayName);
 *   }
 * }
 * ```
 */
export async function listDirectoryPeople(
  http: HttpClient,
  options: ListDirectoryPeopleOptions = {},
): Promise<Result<ListConnectionsResponse, WorkspaceError>> {
  const params = {
    pageSize: options.pageSize,
    pageToken: options.pageToken,
    readMask: options.personFields ?? DEFAULT_PERSON_FIELDS,
    sources: options.sources ?? ['DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'],
    mergeSources: options.mergeSources,
  };
  const qs = toQueryString(params);
  const url = `${BASE_URL}/people:listDirectoryPeople${qs}`;

  const result = await http.get<ListConnectionsResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Searches the organization's directory.
 *
 * @param http - Authenticated HTTP client.
 * @param query - The search query.
 * @param options - Optional search parameters.
 * @returns A list of matching directory people.
 *
 * @example
 * ```ts
 * const result = await searchDirectoryPeople(http, 'john');
 * if (result.ok) {
 *   for (const match of result.value.results || []) {
 *     console.log(match.person.names?.[0]?.displayName);
 *   }
 * }
 * ```
 */
export async function searchDirectoryPeople(
  http: HttpClient,
  query: string,
  options: SearchContactsOptions = {},
): Promise<Result<SearchResponse, WorkspaceError>> {
  const params = {
    query,
    pageSize: options.pageSize,
    readMask: options.personFields ?? DEFAULT_PERSON_FIELDS,
    sources: options.sources ?? ['DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'],
  };
  const qs = toQueryString(params);
  const url = `${BASE_URL}/people:searchDirectoryPeople${qs}`;

  const result = await http.get<SearchResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
