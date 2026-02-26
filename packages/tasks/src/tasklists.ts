/**
 * TaskList operations for Google Tasks API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { TaskList, TaskListsResponse, ListTaskListsOptions } from './types.js';
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
 * The HttpClient returns NetworkError which already extends WorkspaceError.
 */
function toWorkspaceError(error: unknown): WorkspaceError {
  if (error instanceof WorkspaceError) {
    return error;
  }
  return new WorkspaceError(
    error instanceof Error ? error.message : String(error),
    'TASKS_ERROR',
  );
}

// ---------------------------------------------------------------------------
// TaskList operations
// ---------------------------------------------------------------------------

/**
 * Lists all task lists for the authenticated user.
 *
 * @param http - Authenticated HTTP client.
 * @param options - Optional pagination parameters.
 * @returns A paginated list of task lists.
 *
 * @example
 * ```ts
 * const result = await listTaskLists(http, { maxResults: 10 });
 * if (result.ok) {
 *   for (const list of result.value.items) {
 *     console.log(list.title);
 *   }
 * }
 * ```
 */
export async function listTaskLists(
  http: HttpClient,
  options: ListTaskListsOptions = {},
): Promise<Result<TaskListsResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/users/@me/lists${qs}`;

  const result = await http.get<TaskListsResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets a single task list by its identifier.
 *
 * @param http - Authenticated HTTP client.
 * @param tasklistId - Task list identifier.
 * @returns The requested task list.
 *
 * @example
 * ```ts
 * const result = await getTaskList(http, 'MTIzNDU2Nzg5MDEyMzQ1Njc4OTA');
 * if (result.ok) console.log(result.value.title);
 * ```
 */
export async function getTaskList(
  http: HttpClient,
  tasklistId: string,
): Promise<Result<TaskList, WorkspaceError>> {
  const url = `${BASE_URL}/users/@me/lists/${encodeURIComponent(tasklistId)}`;

  const result = await http.get<TaskList>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new task list.
 *
 * @param http - Authenticated HTTP client.
 * @param title - Title of the new task list.
 * @returns The newly created task list.
 *
 * @example
 * ```ts
 * const result = await createTaskList(http, 'Shopping List');
 * if (result.ok) console.log('Created:', result.value.id);
 * ```
 */
export async function createTaskList(
  http: HttpClient,
  title: string,
): Promise<Result<TaskList, WorkspaceError>> {
  const url = `${BASE_URL}/users/@me/lists`;

  const result = await http.post<TaskList>(url, {
    body: { title },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Updates an existing task list (renames it).
 *
 * @param http - Authenticated HTTP client.
 * @param tasklistId - Task list identifier.
 * @param title - New title for the task list.
 * @returns The updated task list.
 *
 * @example
 * ```ts
 * const result = await updateTaskList(http, 'abc123', 'Grocery Shopping');
 * if (result.ok) console.log('Updated:', result.value.title);
 * ```
 */
export async function updateTaskList(
  http: HttpClient,
  tasklistId: string,
  title: string,
): Promise<Result<TaskList, WorkspaceError>> {
  const url = `${BASE_URL}/users/@me/lists/${encodeURIComponent(tasklistId)}`;

  const result = await http.patch<TaskList>(url, {
    body: { title },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Deletes a task list.
 *
 * @param http - Authenticated HTTP client.
 * @param tasklistId - Task list identifier.
 * @returns `void` on success.
 *
 * @example
 * ```ts
 * const result = await deleteTaskList(http, 'abc123');
 * if (result.ok) console.log('Deleted');
 * ```
 */
export async function deleteTaskList(
  http: HttpClient,
  tasklistId: string,
): Promise<Result<void, WorkspaceError>> {
  const url = `${BASE_URL}/users/@me/lists/${encodeURIComponent(tasklistId)}`;

  const result = await http.delete(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(undefined);
}
