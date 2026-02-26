/**
 * Contact CRUD operations for Google People API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type {
  Person,
  ListConnectionsResponse,
  SearchResponse,
  ListContactsOptions,
  SearchContactsOptions,
  CreateContactOptions,
  UpdateContactOptions,
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
// Contact operations
// ---------------------------------------------------------------------------

/**
 * Lists the authenticated user's contacts.
 *
 * @param http - Authenticated HTTP client.
 * @param options - Optional filtering / pagination parameters.
 * @returns A paginated list of contacts.
 *
 * @example
 * ```ts
 * const result = await listContacts(http, {
 *   pageSize: 100,
 *   personFields: 'names,emailAddresses',
 * });
 * if (result.ok) {
 *   for (const person of result.value.connections || []) {
 *     console.log(person.names?.[0]?.displayName);
 *   }
 * }
 * ```
 */
export async function listContacts(
  http: HttpClient,
  options: ListContactsOptions = {},
): Promise<Result<ListConnectionsResponse, WorkspaceError>> {
  const params = {
    pageSize: options.pageSize,
    pageToken: options.pageToken,
    personFields: options.personFields ?? DEFAULT_PERSON_FIELDS,
    sortOrder: options.sortOrder,
    syncToken: options.syncToken,
    sources: options.sources,
  };
  const qs = toQueryString(params);
  const url = `${BASE_URL}/people/me/connections${qs}`;

  const result = await http.get<ListConnectionsResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets a single contact by its resource name.
 *
 * @param http - Authenticated HTTP client.
 * @param resourceName - The resource name of the person (e.g., "people/c1234567890").
 * @param personFields - Fields to request (defaults to DEFAULT_PERSON_FIELDS).
 * @returns The requested person.
 *
 * @example
 * ```ts
 * const result = await getContact(http, 'people/c1234567890');
 * if (result.ok) {
 *   console.log(result.value.names?.[0]?.displayName);
 * }
 * ```
 */
export async function getContact(
  http: HttpClient,
  resourceName: string,
  personFields: string = DEFAULT_PERSON_FIELDS,
): Promise<Result<Person, WorkspaceError>> {
  const qs = toQueryString({ personFields });
  const url = `${BASE_URL}/${resourceName}${qs}`;

  const result = await http.get<Person>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new contact.
 *
 * @param http - Authenticated HTTP client.
 * @param person - The person data to create.
 * @returns The newly created person.
 *
 * @example
 * ```ts
 * const result = await createContact(http, {
 *   names: [{ givenName: 'John', familyName: 'Doe' }],
 *   emailAddresses: [{ value: 'john@example.com' }],
 * });
 * if (result.ok) {
 *   console.log('Created:', result.value.resourceName);
 * }
 * ```
 */
export async function createContact(
  http: HttpClient,
  person: CreateContactOptions,
): Promise<Result<Person, WorkspaceError>> {
  const { personFields, sources, ...body } = person;
  const qs = toQueryString({
    personFields: personFields ?? DEFAULT_PERSON_FIELDS,
    sources,
  });
  const url = `${BASE_URL}/people:createContact${qs}`;

  const result = await http.post<Person>(url, {
    body: body as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Updates an existing contact.
 * Uses PATCH semantics -- only the provided fields are modified.
 *
 * @param http - Authenticated HTTP client.
 * @param resourceName - The resource name of the person.
 * @param person - The person data to update.
 * @param updatePersonFields - Comma-separated list of fields to update (e.g., "names,emailAddresses").
 * @returns The updated person.
 *
 * @example
 * ```ts
 * const result = await updateContact(
 *   http,
 *   'people/c1234567890',
 *   { names: [{ givenName: 'Jane', familyName: 'Doe' }] },
 *   'names'
 * );
 * if (result.ok) {
 *   console.log('Updated:', result.value.names?.[0]?.displayName);
 * }
 * ```
 */
export async function updateContact(
  http: HttpClient,
  resourceName: string,
  person: UpdateContactOptions,
  updatePersonFields: string,
): Promise<Result<Person, WorkspaceError>> {
  const { sources, ...body } = person;
  const qs = toQueryString({
    updatePersonFields,
    personFields: DEFAULT_PERSON_FIELDS,
    sources,
  });
  const url = `${BASE_URL}/${resourceName}:updateContact${qs}`;

  const result = await http.patch<Person>(url, {
    body: body as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Deletes a contact.
 *
 * @param http - Authenticated HTTP client.
 * @param resourceName - The resource name of the person.
 * @returns `void` on success.
 *
 * @example
 * ```ts
 * const result = await deleteContact(http, 'people/c1234567890');
 * if (result.ok) {
 *   console.log('Contact deleted');
 * }
 * ```
 */
export async function deleteContact(
  http: HttpClient,
  resourceName: string,
): Promise<Result<void, WorkspaceError>> {
  const url = `${BASE_URL}/${resourceName}:deleteContact`;

  const result = await http.delete(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(undefined);
}

/**
 * Searches contacts by name or email.
 *
 * @param http - Authenticated HTTP client.
 * @param query - The search query.
 * @param options - Optional search parameters.
 * @returns A list of matching contacts.
 *
 * @example
 * ```ts
 * const result = await searchContacts(http, 'john@example.com');
 * if (result.ok) {
 *   for (const match of result.value.results || []) {
 *     console.log(match.person.names?.[0]?.displayName);
 *   }
 * }
 * ```
 */
export async function searchContacts(
  http: HttpClient,
  query: string,
  options: SearchContactsOptions = {},
): Promise<Result<SearchResponse, WorkspaceError>> {
  const params = {
    query,
    pageSize: options.pageSize,
    readMask: options.personFields ?? DEFAULT_PERSON_FIELDS,
    sources: options.sources,
  };
  const qs = toQueryString(params);
  const url = `${BASE_URL}/people:searchContacts${qs}`;

  const result = await http.get<SearchResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
