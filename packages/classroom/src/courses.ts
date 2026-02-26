/**
 * Course operations for Google Classroom API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { Course, ListCoursesResponse } from './types.js';
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
    'CLASSROOM_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Course operations
// ---------------------------------------------------------------------------

/**
 * Lists courses visible to the authenticated user.
 *
 * @param http - Authenticated HTTP client.
 * @param options - Optional filtering / pagination parameters.
 * @returns A paginated list of courses.
 *
 * @example
 * ```ts
 * const result = await listCourses(http, { studentId: 'me' });
 * if (result.ok) {
 *   for (const course of result.value.courses ?? []) {
 *     console.log(course.name);
 *   }
 * }
 * ```
 */
export async function listCourses(
  http: HttpClient,
  options: {
    readonly studentId?: string;
    readonly teacherId?: string;
    readonly pageSize?: number;
    readonly pageToken?: string;
  } = {},
): Promise<Result<ListCoursesResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/courses${qs}`;

  const result = await http.get<ListCoursesResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets a single course by its identifier.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @returns The requested course.
 *
 * @example
 * ```ts
 * const result = await getCourse(http, '12345');
 * if (result.ok) console.log(result.value.name);
 * ```
 */
export async function getCourse(
  http: HttpClient,
  courseId: string,
): Promise<Result<Course, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}`;

  const result = await http.get<Course>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new course.
 *
 * @param http - Authenticated HTTP client.
 * @param course - Course details.
 * @returns The newly created course.
 *
 * @example
 * ```ts
 * const result = await createCourse(http, {
 *   name: 'Math 101',
 *   section: 'Section A',
 *   ownerId: 'me',
 * });
 * if (result.ok) console.log('Created:', result.value.id);
 * ```
 */
export async function createCourse(
  http: HttpClient,
  course: {
    readonly name: string;
    readonly section?: string;
    readonly descriptionHeading?: string;
    readonly description?: string;
    readonly room?: string;
    readonly ownerId: string;
  },
): Promise<Result<Course, WorkspaceError>> {
  const url = `${BASE_URL}/courses`;

  const result = await http.post<Course>(url, {
    body: course as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Updates an existing course.
 * Uses PATCH semantics -- only the provided fields are modified.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param course - Fields to update.
 * @returns The updated course.
 *
 * @example
 * ```ts
 * const result = await updateCourse(http, '12345', {
 *   name: 'Math 102',
 * });
 * if (result.ok) console.log('Updated:', result.value.name);
 * ```
 */
export async function updateCourse(
  http: HttpClient,
  courseId: string,
  course: {
    readonly name?: string;
    readonly section?: string;
    readonly descriptionHeading?: string;
    readonly description?: string;
    readonly room?: string;
  },
): Promise<Result<Course, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}`;

  const result = await http.patch<Course>(url, {
    body: course as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Deletes a course.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @returns `void` on success.
 *
 * @example
 * ```ts
 * const result = await deleteCourse(http, '12345');
 * if (result.ok) console.log('Deleted');
 * ```
 */
export async function deleteCourse(
  http: HttpClient,
  courseId: string,
): Promise<Result<void, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}`;

  const result = await http.delete(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(undefined);
}

/**
 * Archives a course by updating its state to ARCHIVED.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @returns The updated course with state ARCHIVED.
 *
 * @example
 * ```ts
 * const result = await archiveCourse(http, '12345');
 * if (result.ok) console.log('Archived:', result.value.courseState);
 * ```
 */
export async function archiveCourse(
  http: HttpClient,
  courseId: string,
): Promise<Result<Course, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}?updateMask=courseState`;

  const result = await http.patch<Course>(url, {
    body: { courseState: 'ARCHIVED' },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
