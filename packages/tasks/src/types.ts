/**
 * Type definitions for Google Tasks API v1.
 * Maps Google Tasks JSON responses to clean TypeScript interfaces.
 */

// ---------------------------------------------------------------------------
// Core Task types
// ---------------------------------------------------------------------------

/**
 * A link attached to a task.
 */
export type TaskLink = {
  /** Type of the link (e.g. 'email'). */
  readonly type?: string;
  /** Description of the link. */
  readonly description?: string;
  /** The URL. */
  readonly link?: string;
};

/**
 * A task in a task list.
 * Corresponds to the `Task` resource in the Google Tasks API.
 */
export type Task = {
  /** Task identifier. */
  readonly id: string;
  /** ETag of the resource. */
  readonly etag?: string;
  /** Title of the task. */
  readonly title?: string;
  /** Last modification time of the task (RFC 3339). */
  readonly updated?: string;
  /** URL pointing to this task (used in the web UI). */
  readonly selfLink?: string;
  /** Parent task identifier (for subtasks). */
  readonly parent?: string;
  /** Position of the task among its sibling tasks. */
  readonly position?: string;
  /** Notes describing the task. */
  readonly notes?: string;
  /** Status of the task. */
  readonly status?: 'needsAction' | 'completed';
  /** Due date of the task (RFC 3339, date only). */
  readonly due?: string;
  /** Completion date of the task (RFC 3339). */
  readonly completed?: string;
  /** Flag indicating if the task is deleted. */
  readonly deleted?: boolean;
  /** Flag indicating if the task is hidden. */
  readonly hidden?: boolean;
  /** Collection of links associated with the task. */
  readonly links?: readonly TaskLink[];
  /** Type of the resource. */
  readonly kind?: string;
};

// ---------------------------------------------------------------------------
// TaskList types
// ---------------------------------------------------------------------------

/**
 * A task list.
 */
export type TaskList = {
  /** Task list identifier. */
  readonly id: string;
  /** ETag of the resource. */
  readonly etag?: string;
  /** Title of the task list. */
  readonly title?: string;
  /** Last modification time (RFC 3339). */
  readonly updated?: string;
  /** URL pointing to this task list. */
  readonly selfLink?: string;
  /** Type of the resource. */
  readonly kind?: string;
};

// ---------------------------------------------------------------------------
// List response wrappers
// ---------------------------------------------------------------------------

/**
 * Paginated list response for task lists.
 */
export type TaskListsResponse = {
  /** Type of the resource. */
  readonly kind: string;
  /** ETag of the collection. */
  readonly etag?: string;
  /** Collection of task lists. */
  readonly items: readonly TaskList[];
  /** Token for the next page of results. */
  readonly nextPageToken?: string;
};

/**
 * Paginated list response for tasks.
 */
export type TasksResponse = {
  /** Type of the resource. */
  readonly kind: string;
  /** ETag of the collection. */
  readonly etag?: string;
  /** Collection of tasks. */
  readonly items: readonly Task[];
  /** Token for the next page of results. */
  readonly nextPageToken?: string;
};

// ---------------------------------------------------------------------------
// Options / parameter types
// ---------------------------------------------------------------------------

/**
 * Options for listing tasks.
 */
export type ListTasksOptions = {
  /** Upper bound for a task's completion date (RFC 3339) to filter by. */
  readonly completedMax?: string;
  /** Lower bound for a task's completion date (RFC 3339) to filter by. */
  readonly completedMin?: string;
  /** Upper bound for a task's due date (RFC 3339) to filter by. */
  readonly dueMax?: string;
  /** Lower bound for a task's due date (RFC 3339) to filter by. */
  readonly dueMin?: string;
  /** Maximum number of tasks returned. */
  readonly maxResults?: number;
  /** Token for paginating through results. */
  readonly pageToken?: string;
  /** Flag indicating whether completed tasks are returned. Default: true. */
  readonly showCompleted?: boolean;
  /** Flag indicating whether deleted tasks are returned. Default: false. */
  readonly showDeleted?: boolean;
  /** Flag indicating whether hidden tasks are returned. Default: false. */
  readonly showHidden?: boolean;
  /** Lower bound for a task's last modification time (RFC 3339) to filter by. */
  readonly updatedMin?: string;
};

/**
 * Options for listing task lists.
 */
export type ListTaskListsOptions = {
  /** Maximum number of task lists returned. */
  readonly maxResults?: number;
  /** Token for paginating through results. */
  readonly pageToken?: string;
};

// ---------------------------------------------------------------------------
// API facade type
// ---------------------------------------------------------------------------

/**
 * Unified Tasks API surface that wraps all Google Tasks operations.
 */
export type TasksApi = {
  // -- TaskLists ------------------------------------------------------------
  listTaskLists(
    options?: ListTaskListsOptions,
  ): Promise<Result<TaskListsResponse, WorkspaceError>>;
  getTaskList(tasklistId: string): Promise<Result<TaskList, WorkspaceError>>;
  createTaskList(title: string): Promise<Result<TaskList, WorkspaceError>>;
  updateTaskList(
    tasklistId: string,
    title: string,
  ): Promise<Result<TaskList, WorkspaceError>>;
  deleteTaskList(tasklistId: string): Promise<Result<void, WorkspaceError>>;

  // -- Tasks ----------------------------------------------------------------
  listTasks(
    tasklistId: string,
    options?: ListTasksOptions,
  ): Promise<Result<TasksResponse, WorkspaceError>>;
  getTask(
    tasklistId: string,
    taskId: string,
  ): Promise<Result<Task, WorkspaceError>>;
  createTask(
    tasklistId: string,
    task: Partial<Task>,
  ): Promise<Result<Task, WorkspaceError>>;
  updateTask(
    tasklistId: string,
    taskId: string,
    task: Partial<Task>,
  ): Promise<Result<Task, WorkspaceError>>;
  deleteTask(
    tasklistId: string,
    taskId: string,
  ): Promise<Result<void, WorkspaceError>>;
  completeTask(
    tasklistId: string,
    taskId: string,
  ): Promise<Result<Task, WorkspaceError>>;
  uncompleteTask(
    tasklistId: string,
    taskId: string,
  ): Promise<Result<Task, WorkspaceError>>;
  moveTask(
    tasklistId: string,
    taskId: string,
    parent?: string,
    previous?: string,
  ): Promise<Result<Task, WorkspaceError>>;
};

// Import Result & WorkspaceError types for use in TasksApi
import type { Result, WorkspaceError } from '@openworkspace/core';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Google Tasks API v1 base URL.
 */
export const BASE_URL = 'https://tasks.googleapis.com/tasks/v1';
