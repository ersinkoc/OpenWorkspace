/**
 * Response operations for Google Forms API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type {
  FormResponse,
  ListFormResponsesResponse,
  ListResponsesOptions,
} from './types.js';
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
 */
function toWorkspaceError(error: unknown): WorkspaceError {
  if (error instanceof WorkspaceError) {
    return error;
  }
  return new WorkspaceError(
    error instanceof Error ? error.message : String(error),
    'FORMS_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Response operations
// ---------------------------------------------------------------------------

/**
 * Lists responses for a form with optional pagination.
 *
 * @param http - Authenticated HTTP client.
 * @param formId - Form identifier.
 * @param options - Optional filtering / pagination parameters.
 * @returns A paginated list of form responses.
 *
 * @example
 * ```ts
 * const result = await listResponses(http, 'abc123', {
 *   pageSize: 50,
 * });
 * if (result.ok) {
 *   for (const response of result.value.responses) {
 *     console.log(response.respondentEmail);
 *   }
 * }
 * ```
 */
export async function listResponses(
  http: HttpClient,
  formId: string,
  options: ListResponsesOptions = {},
): Promise<Result<ListFormResponsesResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/forms/${encodeURIComponent(formId)}/responses${qs}`;

  const result = await http.get<ListFormResponsesResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets a single response by its identifier.
 *
 * @param http - Authenticated HTTP client.
 * @param formId - Form identifier.
 * @param responseId - Response identifier.
 * @returns The requested form response.
 *
 * @example
 * ```ts
 * const result = await getResponse(http, 'abc123', 'resp-456');
 * if (result.ok) {
 *   console.log('Submitted at:', result.value.lastSubmittedTime);
 * }
 * ```
 */
export async function getResponse(
  http: HttpClient,
  formId: string,
  responseId: string,
): Promise<Result<FormResponse, WorkspaceError>> {
  const url = `${BASE_URL}/forms/${encodeURIComponent(formId)}/responses/${encodeURIComponent(responseId)}`;

  const result = await http.get<FormResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
