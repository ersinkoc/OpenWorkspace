/**
 * Calendar list, ACL, and color operations for Google Calendar API v3.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type {
  CalendarEntry,
  CalendarListResponse,
  AclRule,
  AclListResponse,
  CalendarColors,
} from './types.js';

/**
 * Google Calendar API v3 base URL.
 */
const BASE = 'https://www.googleapis.com/calendar/v3';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts a WorkspaceError from an HttpClient error result.
 */
function toWorkspaceError(error: unknown): WorkspaceError {
  if (error instanceof WorkspaceError) {
    return error;
  }
  return new WorkspaceError(
    error instanceof Error ? error.message : String(error),
    'CALENDAR_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Calendar list operations
// ---------------------------------------------------------------------------

/**
 * Options for listing calendars.
 */
export type ListCalendarsOptions = {
  /** Maximum number of entries returned. */
  readonly maxResults?: number;
  /** Token for paginating through results. */
  readonly pageToken?: string;
  /** Whether to include deleted entries. */
  readonly showDeleted?: boolean;
  /** Whether to include hidden entries. */
  readonly showHidden?: boolean;
  /** Sync token from a previous list response for incremental sync. */
  readonly syncToken?: string;
};

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
 * Lists calendars in the authenticated user's calendar list.
 *
 * @param http - Authenticated HTTP client.
 * @param options - Optional filtering / pagination parameters.
 * @returns A paginated list of calendar entries.
 *
 * @example
 * ```ts
 * const result = await listCalendars(http);
 * if (result.ok) {
 *   for (const cal of result.value.items) {
 *     console.log(cal.summary);
 *   }
 * }
 * ```
 */
export async function listCalendars(
  http: HttpClient,
  options: ListCalendarsOptions = {},
): Promise<Result<CalendarListResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE}/users/me/calendarList${qs}`;

  const result = await http.get<CalendarListResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Options for listing ACL rules.
 */
export type GetAclOptions = {
  /** Maximum number of ACL entries. */
  readonly maxResults?: number;
  /** Pagination token. */
  readonly pageToken?: string;
  /** Sync token for incremental sync. */
  readonly syncToken?: string;
};

/**
 * Lists access control list (ACL) rules for a calendar.
 *
 * @param http - Authenticated HTTP client.
 * @param calendarId - Calendar identifier.
 * @param options - Optional filtering / pagination parameters.
 * @returns A list of ACL rules for the calendar.
 *
 * @example
 * ```ts
 * const result = await getAcl(http, 'primary');
 * if (result.ok) {
 *   for (const rule of result.value) {
 *     console.log(`${rule.scope.type}: ${rule.role}`);
 *   }
 * }
 * ```
 */
export async function getAcl(
  http: HttpClient,
  calendarId: string,
  options: GetAclOptions = {},
): Promise<Result<readonly AclRule[], WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE}/calendars/${encodeURIComponent(calendarId)}/acl${qs}`;

  const result = await http.get<AclListResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data.items);
}

/**
 * Retrieves the calendar and event color definitions.
 * Colors are global and not specific to a single calendar.
 *
 * @param http - Authenticated HTTP client.
 * @returns The calendar and event color palettes.
 *
 * @example
 * ```ts
 * const result = await getColors(http);
 * if (result.ok) {
 *   console.log('Calendar colors:', Object.keys(result.value.calendar));
 *   console.log('Event colors:', Object.keys(result.value.event));
 * }
 * ```
 */
export async function getColors(
  http: HttpClient,
): Promise<Result<CalendarColors, WorkspaceError>> {
  const url = `${BASE}/colors`;

  const result = await http.get<CalendarColors>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
