/**
 * Tasks service plugin for OpenWorkspace.
 * Wraps all task operations into a single TasksApi facade
 * and exposes a `tasks()` factory function.
 */

import type { HttpClient, Result, Plugin, PluginContext } from '@openworkspace/core';
import type { WorkspaceError } from '@openworkspace/core';
import type {
  Task,
  TaskList,
  TaskListsResponse,
  TasksResponse,
  ListTaskListsOptions,
  ListTasksOptions,
  TasksApi,
} from './types.js';
import {
  listTaskLists,
  getTaskList,
  createTaskList,
  updateTaskList,
  deleteTaskList,
} from './tasklists.js';
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  uncompleteTask,
  moveTask,
} from './task-ops.js';

// ---------------------------------------------------------------------------
// TasksApi facade factory
// ---------------------------------------------------------------------------

/**
 * Creates a {@link TasksApi} instance bound to the given HTTP client.
 *
 * @param http - An authenticated HTTP client (typically with OAuth2 token interceptor).
 * @returns A TasksApi facade exposing all tasks operations.
 *
 * @example
 * ```ts
 * import { createHttpClient } from '@openworkspace/core';
 * import { tasks } from '@openworkspace/tasks';
 *
 * const http = createHttpClient();
 * const api = tasks(http);
 *
 * const lists = await api.listTaskLists();
 * if (lists.ok) {
 *   console.log('Task lists:', lists.value.items);
 * }
 * ```
 */
export function tasks(http: HttpClient): TasksApi {
  return {
    // TaskLists
    listTaskLists: (options) => listTaskLists(http, options),
    getTaskList: (tasklistId) => getTaskList(http, tasklistId),
    createTaskList: (title) => createTaskList(http, title),
    updateTaskList: (tasklistId, title) => updateTaskList(http, tasklistId, title),
    deleteTaskList: (tasklistId) => deleteTaskList(http, tasklistId),

    // Tasks
    listTasks: (tasklistId, options) => listTasks(http, tasklistId, options),
    getTask: (tasklistId, taskId) => getTask(http, tasklistId, taskId),
    createTask: (tasklistId, task) => createTask(http, tasklistId, task),
    updateTask: (tasklistId, taskId, task) => updateTask(http, tasklistId, taskId, task),
    deleteTask: (tasklistId, taskId) => deleteTask(http, tasklistId, taskId),
    completeTask: (tasklistId, taskId) => completeTask(http, tasklistId, taskId),
    uncompleteTask: (tasklistId, taskId) => uncompleteTask(http, tasklistId, taskId),
    moveTask: (tasklistId, taskId, parent, previous) =>
      moveTask(http, tasklistId, taskId, parent, previous),
  };
}

// ---------------------------------------------------------------------------
// Kernel Plugin
// ---------------------------------------------------------------------------

/**
 * Plugin name used for kernel registration.
 */
const PLUGIN_NAME = 'tasks';

/**
 * Creates a Tasks kernel plugin.
 * The plugin stores the TasksApi instance in the kernel metadata so that
 * other plugins or CLI commands can retrieve it.
 *
 * @param http - An authenticated HTTP client.
 * @returns A Plugin that registers the tasks service with the kernel.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { tasksPlugin } from '@openworkspace/tasks';
 *
 * const kernel = createKernel();
 * const http = createHttpClient();
 * await kernel.use(tasksPlugin(http));
 * await kernel.init();
 * ```
 */
export function tasksPlugin(http: HttpClient): Plugin {
  const api = tasks(http);

  return {
    name: PLUGIN_NAME,
    version: '0.1.0',

    setup(ctx: PluginContext): void {
      ctx.metadata.set(PLUGIN_NAME, api);
      ctx.logger.debug('Tasks plugin initialized');
    },

    teardown(ctx: PluginContext): void {
      ctx.metadata.delete(PLUGIN_NAME);
      ctx.logger.debug('Tasks plugin torn down');
    },
  };
}
