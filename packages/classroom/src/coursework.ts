/**
 * Course work operations for Google Classroom API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { CourseWork, ListCourseWorkResponse, Material } from './types.js';
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
// Course work operations
// ---------------------------------------------------------------------------

/**
 * Lists course work for a course.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param options - Optional pagination parameters.
 * @returns A paginated list of course work.
 *
 * @example
 * ```ts
 * const result = await listCourseWork(http, '12345');
 * if (result.ok) {
 *   for (const work of result.value.courseWork ?? []) {
 *     console.log(work.title);
 *   }
 * }
 * ```
 */
export async function listCourseWork(
  http: HttpClient,
  courseId: string,
  options: {
    readonly pageSize?: number;
    readonly pageToken?: string;
  } = {},
): Promise<Result<ListCourseWorkResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/courseWork${qs}`;

  const result = await http.get<ListCourseWorkResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets a single course work item by its identifier.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param courseWorkId - Course work identifier.
 * @returns The requested course work.
 *
 * @example
 * ```ts
 * const result = await getCourseWork(http, '12345', 'work123');
 * if (result.ok) console.log(result.value.title);
 * ```
 */
export async function getCourseWork(
  http: HttpClient,
  courseId: string,
  courseWorkId: string,
): Promise<Result<CourseWork, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(courseWorkId)}`;

  const result = await http.get<CourseWork>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new course work item.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param courseWork - Course work details.
 * @returns The newly created course work.
 *
 * @example
 * ```ts
 * const result = await createCourseWork(http, '12345', {
 *   title: 'Homework 1',
 *   workType: 'ASSIGNMENT',
 *   maxPoints: 100,
 * });
 * if (result.ok) console.log('Created:', result.value.id);
 * ```
 */
export async function createCourseWork(
  http: HttpClient,
  courseId: string,
  courseWork: {
    readonly title: string;
    readonly description?: string;
    readonly materials?: readonly Material[];
    readonly workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
    readonly maxPoints?: number;
    readonly dueDate?: { readonly year: number; readonly month: number; readonly day: number };
    readonly dueTime?: { readonly hours: number; readonly minutes: number };
  },
): Promise<Result<CourseWork, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/courseWork`;

  const result = await http.post<CourseWork>(url, {
    body: courseWork as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Updates an existing course work item.
 * Uses PATCH semantics -- only the provided fields are modified.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param courseWorkId - Course work identifier.
 * @param courseWork - Fields to update.
 * @returns The updated course work.
 *
 * @example
 * ```ts
 * const result = await updateCourseWork(http, '12345', 'work123', {
 *   title: 'Homework 1 (Updated)',
 * });
 * if (result.ok) console.log('Updated:', result.value.title);
 * ```
 */
export async function updateCourseWork(
  http: HttpClient,
  courseId: string,
  courseWorkId: string,
  courseWork: {
    readonly title?: string;
    readonly description?: string;
    readonly maxPoints?: number;
    readonly dueDate?: { readonly year: number; readonly month: number; readonly day: number };
    readonly dueTime?: { readonly hours: number; readonly minutes: number };
  },
): Promise<Result<CourseWork, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(courseWorkId)}`;

  const result = await http.patch<CourseWork>(url, {
    body: courseWork as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Deletes a course work item.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param courseWorkId - Course work identifier.
 * @returns `void` on success.
 *
 * @example
 * ```ts
 * const result = await deleteCourseWork(http, '12345', 'work123');
 * if (result.ok) console.log('Deleted');
 * ```
 */
export async function deleteCourseWork(
  http: HttpClient,
  courseId: string,
  courseWorkId: string,
): Promise<Result<void, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(courseWorkId)}`;

  const result = await http.delete(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(undefined);
}
