/**
 * Guardian operations for Google Classroom API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { Guardian, ListGuardiansResponse } from './types.js';
import { BASE_URL } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a query-string from an options object.
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
    'CLASSROOM_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Guardian operations
// ---------------------------------------------------------------------------

/**
 * Lists guardians for a student.
 *
 * @param http - Authenticated HTTP client.
 * @param studentId - Student identifier (or "me" for current user).
 * @param options - Optional pagination parameters.
 * @returns A paginated list of guardians.
 *
 * @example
 * ```ts
 * const result = await listGuardians(http, 'me');
 * if (result.ok) {
 *   for (const guardian of result.value.guardians ?? []) {
 *     console.log(guardian.invitedEmailAddress);
 *   }
 * }
 * ```
 */
export async function listGuardians(
  http: HttpClient,
  studentId: string,
  options: {
    readonly pageSize?: number;
    readonly pageToken?: string;
  } = {},
): Promise<Result<ListGuardiansResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/userProfiles/${encodeURIComponent(studentId)}/guardians${qs}`;

  const result = await http.get<ListGuardiansResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Invites a guardian for a student.
 *
 * @param http - Authenticated HTTP client.
 * @param studentId - Student identifier (or "me" for current user).
 * @param email - Email address of the guardian to invite.
 * @returns The newly created guardian invitation.
 *
 * @example
 * ```ts
 * const result = await inviteGuardian(http, 'me', 'parent@example.com');
 * if (result.ok) console.log('Invited:', result.value.invitedEmailAddress);
 * ```
 */
export async function inviteGuardian(
  http: HttpClient,
  studentId: string,
  email: string,
): Promise<Result<Guardian, WorkspaceError>> {
  const url = `${BASE_URL}/userProfiles/${encodeURIComponent(studentId)}/guardianInvitations`;

  const result = await http.post<Guardian>(url, {
    body: { invitedEmailAddress: email },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
