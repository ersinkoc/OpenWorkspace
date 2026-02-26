/**
 * Student submission operations for Google Classroom API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { StudentSubmission, ListStudentSubmissionsResponse } from './types.js';
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
// Submission operations
// ---------------------------------------------------------------------------

/**
 * Lists student submissions for a course work item.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param courseWorkId - Course work identifier.
 * @param options - Optional pagination parameters.
 * @returns A paginated list of student submissions.
 *
 * @example
 * ```ts
 * const result = await listSubmissions(http, '12345', 'work123');
 * if (result.ok) {
 *   for (const submission of result.value.studentSubmissions ?? []) {
 *     console.log(submission.userId, submission.state);
 *   }
 * }
 * ```
 */
export async function listSubmissions(
  http: HttpClient,
  courseId: string,
  courseWorkId: string,
  options: {
    readonly pageSize?: number;
    readonly pageToken?: string;
  } = {},
): Promise<Result<ListStudentSubmissionsResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(courseWorkId)}/studentSubmissions${qs}`;

  const result = await http.get<ListStudentSubmissionsResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets a single student submission by its identifier.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param courseWorkId - Course work identifier.
 * @param submissionId - Submission identifier.
 * @returns The requested student submission.
 *
 * @example
 * ```ts
 * const result = await getSubmission(http, '12345', 'work123', 'sub456');
 * if (result.ok) console.log(result.value.state);
 * ```
 */
export async function getSubmission(
  http: HttpClient,
  courseId: string,
  courseWorkId: string,
  submissionId: string,
): Promise<Result<StudentSubmission, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(courseWorkId)}/studentSubmissions/${encodeURIComponent(submissionId)}`;

  const result = await http.get<StudentSubmission>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Grades a student submission by setting the assigned grade.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param courseWorkId - Course work identifier.
 * @param submissionId - Submission identifier.
 * @param grade - Grade to assign.
 * @returns The updated student submission.
 *
 * @example
 * ```ts
 * const result = await gradeSubmission(http, '12345', 'work123', 'sub456', 95);
 * if (result.ok) console.log('Graded:', result.value.assignedGrade);
 * ```
 */
export async function gradeSubmission(
  http: HttpClient,
  courseId: string,
  courseWorkId: string,
  submissionId: string,
  grade: number,
): Promise<Result<StudentSubmission, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(courseWorkId)}/studentSubmissions/${encodeURIComponent(submissionId)}?updateMask=assignedGrade`;

  const result = await http.patch<StudentSubmission>(url, {
    body: { assignedGrade: grade },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Returns a student submission to the student.
 *
 * @param http - Authenticated HTTP client.
 * @param courseId - Course identifier.
 * @param courseWorkId - Course work identifier.
 * @param submissionId - Submission identifier.
 * @returns The returned student submission.
 *
 * @example
 * ```ts
 * const result = await returnSubmission(http, '12345', 'work123', 'sub456');
 * if (result.ok) console.log('Returned:', result.value.state);
 * ```
 */
export async function returnSubmission(
  http: HttpClient,
  courseId: string,
  courseWorkId: string,
  submissionId: string,
): Promise<Result<StudentSubmission, WorkspaceError>> {
  const url = `${BASE_URL}/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(courseWorkId)}/studentSubmissions/${encodeURIComponent(submissionId)}:return`;

  const result = await http.post<StudentSubmission>(url, {
    body: {},
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
