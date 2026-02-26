/**
 * @openworkspace/tasks
 * Google Tasks API v1 service package for OpenWorkspace.
 * Zero-dependency -- uses HttpClient from @openworkspace/core.
 */

// Types
export type {
  Task,
  TaskLink,
  TaskList,
  TaskListsResponse,
  TasksResponse,
  ListTasksOptions,
  ListTaskListsOptions,
  TasksApi,
} from './types.js';

export { BASE_URL } from './types.js';

// TaskList operations
export {
  listTaskLists,
  getTaskList,
  createTaskList,
  updateTaskList,
  deleteTaskList,
} from './tasklists.js';

// Task operations
export {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  uncompleteTask,
  moveTask,
} from './task-ops.js';

// Plugin & facade
export { tasks, tasksPlugin } from './plugin.js';
