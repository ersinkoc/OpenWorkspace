/**
 * Task operations for Google Tasks API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { Task, TasksResponse, ListTasksOptions } from './types.js';
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
// Task operations
// ---------------------------------------------------------------------------

/**
 * Lists tasks in the specified task list.
 *
 * @param http - Authenticated HTTP client.
 * @param tasklistId - Task list identifier.
 * @param options - Optional filtering / pagination parameters.
 * @returns A paginated list of tasks.
 *
 * @example
 * ```ts
 * const result = await listTasks(http, '@default', {
 *   showCompleted: true,
 *   maxResults: 10,
 * });
 * if (result.ok) {
 *   for (const task of result.value.items) {
 *     console.log(task.title);
 *   }
 * }
 * ```
 */
export async function listTasks(
  http: HttpClient,
  tasklistId: string,
  options: ListTasksOptions = {},
): Promise<Result<TasksResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/lists/${encodeURIComponent(tasklistId)}/tasks${qs}`;

  const result = await http.get<TasksResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets a single task by its identifier.
 *
 * @param http - Authenticated HTTP client.
 * @param tasklistId - Task list identifier.
 * @param taskId - Task identifier.
 * @returns The requested task.
 *
 * @example
 * ```ts
 * const result = await getTask(http, '@default', 'abc123');
 * if (result.ok) console.log(result.value.title);
 * ```
 */
export async function getTask(
  http: HttpClient,
  tasklistId: string,
  taskId: string,
): Promise<Result<Task, WorkspaceError>> {
  const url = `${BASE_URL}/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`;

  const result = await http.get<Task>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new task in the specified task list.
 *
 * @param http - Authenticated HTTP client.
 * @param tasklistId - Task list identifier.
 * @param task - Task details (title, notes, due, etc.).
 * @returns The newly created task.
 *
 * @example
 * ```ts
 * const result = await createTask(http, '@default', {
 *   title: 'Buy groceries',
 *   notes: 'Milk, eggs, bread',
 *   due: '2025-06-15T00:00:00Z',
 * });
 * if (result.ok) console.log('Created:', result.value.id);
 * ```
 */
export async function createTask(
  http: HttpClient,
  tasklistId: string,
  task: Partial<Task>,
): Promise<Result<Task, WorkspaceError>> {
  const url = `${BASE_URL}/lists/${encodeURIComponent(tasklistId)}/tasks`;

  const result = await http.post<Task>(url, {
    body: task as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Updates an existing task.
 * Uses PATCH semantics -- only the provided fields are modified.
 *
 * @param http - Authenticated HTTP client.
 * @param tasklistId - Task list identifier.
 * @param taskId - Task identifier.
 * @param task - Fields to update.
 * @returns The updated task.
 *
 * @example
 * ```ts
 * const result = await updateTask(http, '@default', 'abc123', {
 *   title: 'Buy groceries (updated)',
 * });
 * if (result.ok) console.log('Updated:', result.value.title);
 * ```
 */
export async function updateTask(
  http: HttpClient,
  tasklistId: string,
  taskId: string,
  task: Partial<Task>,
): Promise<Result<Task, WorkspaceError>> {
  const url = `${BASE_URL}/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`;

  const result = await http.patch<Task>(url, {
    body: task as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Deletes a task from the specified task list.
 *
 * @param http - Authenticated HTTP client.
 * @param tasklistId - Task list identifier.
 * @param taskId - Task identifier.
 * @returns `void` on success.
 *
 * @example
 * ```ts
 * const result = await deleteTask(http, '@default', 'abc123');
 * if (result.ok) console.log('Deleted');
 * ```
 */
export async function deleteTask(
  http: HttpClient,
  tasklistId: string,
  taskId: string,
): Promise<Result<void, WorkspaceError>> {
  const url = `${BASE_URL}/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`;

  const result = await http.delete(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(undefined);
}

/**
 * Marks a task as completed.
 * This is a convenience wrapper around {@link updateTask} that sets status to 'completed'.
 *
 * @param http - Authenticated HTTP client.
 * @param tasklistId - Task list identifier.
 * @param taskId - Task identifier.
 * @returns The updated task.
 *
 * @example
 * ```ts
 * const result = await completeTask(http, '@default', 'abc123');
 * if (result.ok) console.log('Task completed');
 * ```
 */
export async function completeTask(
  http: HttpClient,
  tasklistId: string,
  taskId: string,
): Promise<Result<Task, WorkspaceError>> {
  return updateTask(http, tasklistId, taskId, { status: 'completed' });
}

/**
 * Marks a task as needing action (uncompletes it).
 * This is a convenience wrapper around {@link updateTask} that sets status to 'needsAction'.
 *
 * @param http - Authenticated HTTP client.
 * @param tasklistId - Task list identifier.
 * @param taskId - Task identifier.
 * @returns The updated task.
 *
 * @example
 * ```ts
 * const result = await uncompleteTask(http, '@default', 'abc123');
 * if (result.ok) console.log('Task reopened');
 * ```
 */
export async function uncompleteTask(
  http: HttpClient,
  tasklistId: string,
  taskId: string,
): Promise<Result<Task, WorkspaceError>> {
  return updateTask(http, tasklistId, taskId, { status: 'needsAction' });
}

/**
 * Moves a task to a different position in the task list or makes it a subtask.
 *
 * @param http - Authenticated HTTP client.
 * @param tasklistId - Task list identifier.
 * @param taskId - Task identifier.
 * @param parent - Optional parent task identifier (makes this a subtask).
 * @param previous - Optional identifier of the previous sibling task (for ordering).
 * @returns The moved task.
 *
 * @example
 * ```ts
 * // Move task to the top of the list
 * const result = await moveTask(http, '@default', 'abc123');
 *
 * // Make task a subtask of another
 * const result = await moveTask(http, '@default', 'abc123', 'parent-id');
 *
 * // Move task after a specific sibling
 * const result = await moveTask(http, '@default', 'abc123', undefined, 'sibling-id');
 * ```
 */
export async function moveTask(
  http: HttpClient,
  tasklistId: string,
  taskId: string,
  parent?: string,
  previous?: string,
): Promise<Result<Task, WorkspaceError>> {
  const qs = toQueryString({ parent, previous });
  const url = `${BASE_URL}/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}/move${qs}`;

  const result = await http.post<Task>(url, {});
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
