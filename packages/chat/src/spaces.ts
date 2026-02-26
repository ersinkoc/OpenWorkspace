/**
 * Space operations for Google Chat API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { Space, ListSpacesResponse, ListSpacesOptions } from './types.js';
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
    'CHAT_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Space operations
// ---------------------------------------------------------------------------

/**
 * Lists spaces the authenticated user is a member of.
 *
 * @param http - Authenticated HTTP client.
 * @param options - Optional filtering / pagination parameters.
 * @returns A list of spaces.
 *
 * @example
 * ```ts
 * const result = await listSpaces(http, {
 *   pageSize: 10,
 *   filter: 'spaceType = "SPACE"',
 * });
 * if (result.ok) {
 *   for (const space of result.value.spaces ?? []) {
 *     console.log(space.displayName);
 *   }
 * }
 * ```
 */
export async function listSpaces(
  http: HttpClient,
  options: ListSpacesOptions = {},
): Promise<Result<ListSpacesResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/spaces${qs}`;

  const result = await http.get<ListSpacesResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets a single space by its resource name.
 *
 * @param http - Authenticated HTTP client.
 * @param spaceName - Space resource name (e.g., `spaces/AAAA`).
 * @returns The requested space.
 *
 * @example
 * ```ts
 * const result = await getSpace(http, 'spaces/AAAA');
 * if (result.ok) console.log(result.value.displayName);
 * ```
 */
export async function getSpace(
  http: HttpClient,
  spaceName: string,
): Promise<Result<Space, WorkspaceError>> {
  const url = `${BASE_URL}/${spaceName}`;

  const result = await http.get<Space>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new space.
 *
 * @param http - Authenticated HTTP client.
 * @param displayName - Display name for the new space.
 * @param spaceType - Type of space to create (defaults to 'SPACE').
 * @returns The newly created space.
 *
 * @example
 * ```ts
 * const result = await createSpace(http, 'My New Space');
 * if (result.ok) console.log('Created:', result.value.name);
 * ```
 */
export async function createSpace(
  http: HttpClient,
  displayName: string,
  spaceType: 'SPACE' | 'DM' = 'SPACE',
): Promise<Result<Space, WorkspaceError>> {
  const url = `${BASE_URL}/spaces`;

  const result = await http.post<Space>(url, {
    body: {
      displayName,
      spaceType,
    },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Finds a space by its display name.
 * Returns the first matching space, or undefined if none found.
 *
 * @param http - Authenticated HTTP client.
 * @param displayName - Display name to search for.
 * @returns The first matching space, or undefined if not found.
 *
 * @example
 * ```ts
 * const result = await findSpace(http, 'Team Room');
 * if (result.ok && result.value) {
 *   console.log('Found:', result.value.name);
 * }
 * ```
 */
export async function findSpace(
  http: HttpClient,
  displayName: string,
): Promise<Result<Space | undefined, WorkspaceError>> {
  const result = await listSpaces(http);
  if (!result.ok) {
    return err(result.error);
  }

  const space = result.value.spaces?.find(
    (s: Space) => s.displayName === displayName,
  );
  return ok(space);
}
