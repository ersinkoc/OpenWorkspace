/**
 * Profile operations for Google People API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type {
  PersonProfile,
  GetPeopleResponse,
  SearchDirectoryResponse,
  SearchProfilesOptions,
} from './types.js';
import { BASE_URL, DEFAULT_PROFILE_FIELDS } from './types.js';

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
    'PEOPLE_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Profile operations
// ---------------------------------------------------------------------------

/**
 * Gets a user profile.
 *
 * @param http - Authenticated HTTP client.
 * @param resourceName - Resource name of the person (e.g., "people/me" or "people/123456789").
 *                       Defaults to "people/me" for the authenticated user.
 * @param personFields - Comma-separated list of person fields to return.
 *                       Defaults to names, emails, phones, photos, organizations, locations, and relations.
 * @returns The person profile.
 *
 * @example
 * ```ts
 * const result = await getProfile(http);
 * if (result.ok) {
 *   console.log(result.value.names?.[0]?.displayName);
 * }
 * ```
 */
export async function getProfile(
  http: HttpClient,
  resourceName: string = 'people/me',
  personFields: string = DEFAULT_PROFILE_FIELDS,
): Promise<Result<PersonProfile, WorkspaceError>> {
  const qs = toQueryString({ personFields });
  const url = `${BASE_URL}/${resourceName}${qs}`;

  const result = await http.get<PersonProfile>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets a profile by email address.
 * This is a convenience method that searches for a profile by email.
 *
 * @param http - Authenticated HTTP client.
 * @param email - Email address to search for.
 * @returns The person profile matching the email address.
 *
 * @example
 * ```ts
 * const result = await getProfileByEmail(http, 'alice@example.com');
 * if (result.ok) {
 *   console.log(result.value.names?.[0]?.displayName);
 * }
 * ```
 */
export async function getProfileByEmail(
  http: HttpClient,
  email: string,
): Promise<Result<PersonProfile, WorkspaceError>> {
  const searchResult = await searchProfiles(http, email, {
    pageSize: 1,
    readMask: DEFAULT_PROFILE_FIELDS,
  });

  if (!searchResult.ok) {
    return err(searchResult.error);
  }

  const person = searchResult.value.people?.[0];
  if (!person) {
    return err(new WorkspaceError(`No profile found for email: ${email}`, 'PEOPLE_NOT_FOUND'));
  }

  return ok(person);
}

/**
 * Gets multiple profiles in a single batch request.
 *
 * @param http - Authenticated HTTP client.
 * @param resourceNames - Array of resource names to fetch.
 * @param personFields - Comma-separated list of person fields to return.
 *                       Defaults to names, emails, phones, photos, organizations, locations, and relations.
 * @returns Batch response containing individual person responses.
 *
 * @example
 * ```ts
 * const result = await getBatchProfiles(http, [
 *   'people/123456789',
 *   'people/987654321',
 * ]);
 * if (result.ok) {
 *   for (const response of result.value.responses ?? []) {
 *     console.log(response.person?.names?.[0]?.displayName);
 *   }
 * }
 * ```
 */
export async function getBatchProfiles(
  http: HttpClient,
  resourceNames: readonly string[],
  personFields: string = DEFAULT_PROFILE_FIELDS,
): Promise<Result<GetPeopleResponse, WorkspaceError>> {
  const params: Record<string, unknown> = { personFields };

  // Add resource names as repeated query parameters
  for (const name of resourceNames) {
    if (!params.resourceNames) {
      params.resourceNames = [];
    }
    (params.resourceNames as string[]).push(name);
  }

  // Build query string with repeated resourceNames parameters
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const item of value) {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
        }
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
  }
  const qs = parts.length > 0 ? `?${parts.join('&')}` : '';

  const url = `${BASE_URL}/people:batchGet${qs}`;

  const result = await http.get<GetPeopleResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Searches directory profiles.
 * Requires the appropriate directory API scope to access organization directory.
 *
 * @param http - Authenticated HTTP client.
 * @param query - Search query string.
 * @param options - Search options including pagination and field selection.
 * @returns Search results containing matching profiles.
 *
 * @example
 * ```ts
 * const result = await searchProfiles(http, 'engineering', {
 *   pageSize: 10,
 *   readMask: 'names,emailAddresses,organizations',
 * });
 * if (result.ok) {
 *   for (const person of result.value.people ?? []) {
 *     console.log(person.names?.[0]?.displayName);
 *   }
 * }
 * ```
 */
export async function searchProfiles(
  http: HttpClient,
  query: string,
  options: SearchProfilesOptions = {},
): Promise<Result<SearchDirectoryResponse, WorkspaceError>> {
  const { readMask = DEFAULT_PROFILE_FIELDS, pageSize, pageToken } = options;

  const qs = toQueryString({
    query,
    readMask,
    pageSize,
    pageToken,
  });

  const url = `${BASE_URL}/people:searchDirectoryPeople${qs}`;

  const result = await http.get<SearchDirectoryResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
