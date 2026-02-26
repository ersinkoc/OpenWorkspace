/**
 * Announcement operations for Google Classroom API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { Announcement, ListAnnouncementsResponse } from './types.js';
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
// Announcement operations
// ---------------------------------------------------------------------------

/**
 * Lists announcements for a course.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param options - Optional pagination parameters.
 * @returns A paginated list of announcements.
 *
 * @example
 * ```ts
 * const result = await listAnnouncements(http, '12345');
 * if (result.ok) {
 *   for (const announcement of result.value.announcements ?? []) {
 *     console.log(announcement.text);
 *   }
 * }
 * ```
 */
export async function listAnnouncements(
  http: HttpClient,
  courseId: string,
  options: {
    readonly pageSize?: number;
    readonly pageToken?: string;
  } = {},
): Promise<Result<ListAnnouncementsResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/announcements${qs}`;

  const result = await http.get<ListAnnouncementsResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new announcement for a course.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param text - Text of the announcement.
 * @returns The newly created announcement.
 *
 * @example
 * ```ts
 * const result = await createAnnouncement(http, '12345', 'Class is cancelled tomorrow.');
 * if (result.ok) console.log('Created:', result.value.id);
 * ```
 */
export async function createAnnouncement(
  http: HttpClient,
  courseId: string,
  text: string,
): Promise<Result<Announcement, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/announcements`;

  const result = await http.post<Announcement>(url, {
    body: { text },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Deletes an announcement.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param announcementId - Announcement identifier.
 * @returns `void` on success.
 *
 * @example
 * ```ts
 * const result = await deleteAnnouncement(http, '12345', 'ann123');
 * if (result.ok) console.log('Deleted');
 * ```
 */
export async function deleteAnnouncement(
  http: HttpClient,
  courseId: string,
  announcementId: string,
): Promise<Result<void, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/announcements/${encodeURIComponent(announcementId)}`;

  const result = await http.delete(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(undefined);
}
