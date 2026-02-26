/**
 * Student and teacher (roster) operations for Google Classroom API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { Student, Teacher, ListStudentsResponse, ListTeachersResponse } from './types.js';
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
// Student operations
// ---------------------------------------------------------------------------

/**
 * Lists students enrolled in a course.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param options - Optional pagination parameters.
 * @returns A paginated list of students.
 *
 * @example
 * ```ts
 * const result = await listStudents(http, '12345');
 * if (result.ok) {
 *   for (const student of result.value.students ?? []) {
 *     console.log(student.profile.name.fullName);
 *   }
 * }
 * ```
 */
export async function listStudents(
  http: HttpClient,
  courseId: string,
  options: {
    readonly pageSize?: number;
    readonly pageToken?: string;
  } = {},
): Promise<Result<ListStudentsResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/students${qs}`;

  const result = await http.get<ListStudentsResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Adds a student to a course using an enrollment code.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param enrollmentCode - Enrollment code for the course.
 * @returns The newly added student.
 *
 * @example
 * ```ts
 * const result = await addStudent(http, '12345', 'abc123');
 * if (result.ok) console.log('Added:', result.value.userId);
 * ```
 */
export async function addStudent(
  http: HttpClient,
  courseId: string,
  enrollmentCode: string,
): Promise<Result<Student, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/students?enrollmentCode=${encodeURIComponent(enrollmentCode)}`;

  const result = await http.post<Student>(url, {
    body: { userId: 'me' },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Removes a student from a course.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param userId - User identifier of the student to remove.
 * @returns `void` on success.
 *
 * @example
 * ```ts
 * const result = await removeStudent(http, '12345', 'student123');
 * if (result.ok) console.log('Removed');
 * ```
 */
export async function removeStudent(
  http: HttpClient,
  courseId: string,
  userId: string,
): Promise<Result<void, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/students/${encodeURIComponent(userId)}`;

  const result = await http.delete(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Teacher operations
// ---------------------------------------------------------------------------

/**
 * Lists teachers of a course.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param options - Optional pagination parameters.
 * @returns A paginated list of teachers.
 *
 * @example
 * ```ts
 * const result = await listTeachers(http, '12345');
 * if (result.ok) {
 *   for (const teacher of result.value.teachers ?? []) {
 *     console.log(teacher.profile.name.fullName);
 *   }
 * }
 * ```
 */
export async function listTeachers(
  http: HttpClient,
  courseId: string,
  options: {
    readonly pageSize?: number;
    readonly pageToken?: string;
  } = {},
): Promise<Result<ListTeachersResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/teachers${qs}`;

  const result = await http.get<ListTeachersResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Adds a teacher to a course.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param userId - User identifier of the teacher to add.
 * @returns The newly added teacher.
 *
 * @example
 * ```ts
 * const result = await addTeacher(http, '12345', 'teacher123');
 * if (result.ok) console.log('Added:', result.value.userId);
 * ```
 */
export async function addTeacher(
  http: HttpClient,
  courseId: string,
  userId: string,
): Promise<Result<Teacher, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/teachers`;

  const result = await http.post<Teacher>(url, {
    body: { userId },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Removes a teacher from a course.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param userId - User identifier of the teacher to remove.
 * @returns `void` on success.
 *
 * @example
 * ```ts
 * const result = await removeTeacher(http, '12345', 'teacher123');
 * if (result.ok) console.log('Removed');
 * ```
 */
export async function removeTeacher(
  http: HttpClient,
  courseId: string,
  userId: string,
): Promise<Result<void, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/teachers/${encodeURIComponent(userId)}`;

  const result = await http.delete(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(undefined);
}
