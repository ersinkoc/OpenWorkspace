/**
 * Tests for @openworkspace/tasks.
 * Uses mock HttpClient to verify all operations without network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import { tasks, tasksPlugin } from './plugin.js';
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
import type { Task, TaskList, TaskListsResponse, TasksResponse } from './types.js';

// ---------------------------------------------------------------------------
// Mock HttpClient factory
// ---------------------------------------------------------------------------

type MockHttpClient = HttpClient & {
  _getHandler: ReturnType<typeof vi.fn>;
  _postHandler: ReturnType<typeof vi.fn>;
  _patchHandler: ReturnType<typeof vi.fn>;
  _putHandler: ReturnType<typeof vi.fn>;
  _deleteHandler: ReturnType<typeof vi.fn>;
};

function mockResponse<T>(data: T, status = 200): Result<HttpResponse<T>, NetworkError> {
  return ok({
    status,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    data,
  });
}

function mockError(message: string, status = 500): Result<never, NetworkError> {
  return err(new NetworkError(message, { status }, status));
}

function createMockHttp(): MockHttpClient {
  const getHandler = vi.fn();
  const postHandler = vi.fn();
  const patchHandler = vi.fn();
  const putHandler = vi.fn();
  const deleteHandler = vi.fn();

  return {
    request: vi.fn(),
    get: getHandler,
    post: postHandler,
    put: putHandler,
    patch: patchHandler,
    delete: deleteHandler,
    interceptors: { request: [], response: [], error: [] },
    _getHandler: getHandler,
    _postHandler: postHandler,
    _patchHandler: patchHandler,
    _putHandler: putHandler,
    _deleteHandler: deleteHandler,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TASK_FIXTURE: Task = {
  id: 'task-1',
  kind: 'tasks#task',
  etag: '"etag-123"',
  title: 'Buy groceries',
  updated: '2025-06-01T10:00:00Z',
  selfLink: 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/task-1',
  status: 'needsAction',
  notes: 'Milk, eggs, bread',
  due: '2025-06-15T00:00:00Z',
};

const TASKS_RESPONSE_FIXTURE: TasksResponse = {
  kind: 'tasks#tasks',
  etag: '"etag-456"',
  items: [TASK_FIXTURE],
};

const TASKLIST_FIXTURE: TaskList = {
  id: 'list-1',
  kind: 'tasks#taskList',
  etag: '"etag-789"',
  title: 'My Tasks',
  updated: '2025-06-01T09:00:00Z',
  selfLink: 'https://tasks.googleapis.com/tasks/v1/users/@me/lists/list-1',
};

const TASKLISTS_RESPONSE_FIXTURE: TaskListsResponse = {
  kind: 'tasks#taskLists',
  etag: '"etag-abc"',
  items: [TASKLIST_FIXTURE],
};

// ---------------------------------------------------------------------------
// Tests: Plugin creation
// ---------------------------------------------------------------------------

describe('tasks()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a TasksApi with all expected methods', () => {
    const api = tasks(http);

    expect(typeof api.listTaskLists).toBe('function');
    expect(typeof api.getTaskList).toBe('function');
    expect(typeof api.createTaskList).toBe('function');
    expect(typeof api.updateTaskList).toBe('function');
    expect(typeof api.deleteTaskList).toBe('function');
    expect(typeof api.listTasks).toBe('function');
    expect(typeof api.getTask).toBe('function');
    expect(typeof api.createTask).toBe('function');
    expect(typeof api.updateTask).toBe('function');
    expect(typeof api.deleteTask).toBe('function');
    expect(typeof api.completeTask).toBe('function');
    expect(typeof api.uncompleteTask).toBe('function');
    expect(typeof api.moveTask).toBe('function');
  });
});

describe('tasksPlugin()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a plugin with the correct name and version', () => {
    const plugin = tasksPlugin(http);

    expect(plugin.name).toBe('tasks');
    expect(plugin.version).toBe('0.1.0');
    expect(typeof plugin.setup).toBe('function');
    expect(typeof plugin.teardown).toBe('function');
  });

  it('stores TasksApi in metadata on setup', () => {
    const plugin = tasksPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);

    expect(metadata.has('tasks')).toBe(true);
    const api = metadata.get('tasks') as ReturnType<typeof tasks>;
    expect(typeof api.listTaskLists).toBe('function');
  });

  it('removes TasksApi from metadata on teardown', () => {
    const plugin = tasksPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);
    expect(metadata.has('tasks')).toBe(true);

    plugin.teardown!(ctx);
    expect(metadata.has('tasks')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: TaskList operations
// ---------------------------------------------------------------------------

describe('listTaskLists()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of task lists on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(TASKLISTS_RESPONSE_FIXTURE));

    const result = await listTaskLists(http, { maxResults: 10 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
      const first = result.value.items[0];
      expect(first?.title).toBe('My Tasks');
    }

    expect(http._getHandler).toHaveBeenCalledOnce();
    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/users/@me/lists');
    expect(url).toContain('maxResults=10');
  });

  it('returns error on network failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Connection refused'));

    const result = await listTaskLists(http);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Connection refused');
    }
  });

  it('does not append query string when no options provided', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(TASKLISTS_RESPONSE_FIXTURE));

    await listTaskLists(http);

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toBe('https://tasks.googleapis.com/tasks/v1/users/@me/lists');
  });
});

describe('getTaskList()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a single task list on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(TASKLIST_FIXTURE));

    const result = await getTaskList(http, 'list-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('list-1');
      expect(result.value.title).toBe('My Tasks');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/users/@me/lists/list-1');
  });

  it('returns error when task list not found', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Not Found', 404));

    const result = await getTaskList(http, 'nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not Found');
    }
  });
});

describe('createTaskList()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a task list and returns it', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(TASKLIST_FIXTURE));

    const result = await createTaskList(http, 'Shopping List');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('list-1');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/users/@me/lists');

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({ title: 'Shopping List' });
  });
});

describe('updateTaskList()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('patches a task list and returns the updated version', async () => {
    const updatedList = { ...TASKLIST_FIXTURE, title: 'Updated Tasks' };
    http._patchHandler.mockResolvedValueOnce(mockResponse(updatedList));

    const result = await updateTaskList(http, 'list-1', 'Updated Tasks');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('Updated Tasks');
    }

    expect(http._patchHandler).toHaveBeenCalledOnce();
    const url = http._patchHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/users/@me/lists/list-1');
  });
});

describe('deleteTaskList()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('deletes a task list successfully', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockResponse(null, 204));

    const result = await deleteTaskList(http, 'list-1');

    expect(result.ok).toBe(true);
    expect(http._deleteHandler).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Tests: Task operations
// ---------------------------------------------------------------------------

describe('listTasks()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of tasks on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(TASKS_RESPONSE_FIXTURE));

    const result = await listTasks(http, '@default', {
      showCompleted: true,
      maxResults: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
      const first = result.value.items[0];
      expect(first?.title).toBe('Buy groceries');
    }

    expect(http._getHandler).toHaveBeenCalledOnce();
    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/lists/%40default/tasks');
    expect(url).toContain('showCompleted=true');
    expect(url).toContain('maxResults=10');
  });

  it('returns error on network failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Connection refused'));

    const result = await listTasks(http, '@default');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Connection refused');
    }
  });

  it('does not append query string when no options provided', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(TASKS_RESPONSE_FIXTURE));

    await listTasks(http, '@default');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toBe('https://tasks.googleapis.com/tasks/v1/lists/%40default/tasks');
  });
});

describe('getTask()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a single task on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(TASK_FIXTURE));

    const result = await getTask(http, '@default', 'task-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('task-1');
      expect(result.value.title).toBe('Buy groceries');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/lists/%40default/tasks/task-1');
  });

  it('returns error when task not found', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Not Found', 404));

    const result = await getTask(http, '@default', 'nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not Found');
    }
  });
});

describe('createTask()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a task and returns it', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(TASK_FIXTURE));

    const result = await createTask(http, '@default', {
      title: 'Buy groceries',
      notes: 'Milk, eggs, bread',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('task-1');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/lists/%40default/tasks');
  });

  it('sends task body in request config', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(TASK_FIXTURE));

    await createTask(http, '@default', {
      title: 'Buy groceries',
      notes: 'Milk, eggs, bread',
    });

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({
      title: 'Buy groceries',
      notes: 'Milk, eggs, bread',
    });
  });
});

describe('updateTask()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('patches a task and returns the updated version', async () => {
    const updatedTask = { ...TASK_FIXTURE, title: 'Buy groceries (updated)' };
    http._patchHandler.mockResolvedValueOnce(mockResponse(updatedTask));

    const result = await updateTask(http, '@default', 'task-1', {
      title: 'Buy groceries (updated)',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('Buy groceries (updated)');
    }

    expect(http._patchHandler).toHaveBeenCalledOnce();
    const url = http._patchHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/lists/%40default/tasks/task-1');
  });
});

describe('deleteTask()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('deletes a task successfully', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockResponse(null, 204));

    const result = await deleteTask(http, '@default', 'task-1');

    expect(result.ok).toBe(true);
    expect(http._deleteHandler).toHaveBeenCalledOnce();
  });
});

describe('completeTask()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('marks a task as completed', async () => {
    const completedTask = { ...TASK_FIXTURE, status: 'completed' as const };
    http._patchHandler.mockResolvedValueOnce(mockResponse(completedTask));

    const result = await completeTask(http, '@default', 'task-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('completed');
    }

    const config = http._patchHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({ status: 'completed' });
  });
});

describe('uncompleteTask()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('marks a task as needsAction', async () => {
    const reopenedTask = { ...TASK_FIXTURE, status: 'needsAction' as const };
    http._patchHandler.mockResolvedValueOnce(mockResponse(reopenedTask));

    const result = await uncompleteTask(http, '@default', 'task-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('needsAction');
    }

    const config = http._patchHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({ status: 'needsAction' });
  });
});

describe('moveTask()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('moves a task without parameters', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(TASK_FIXTURE));

    const result = await moveTask(http, '@default', 'task-1');

    expect(result.ok).toBe(true);

    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/lists/%40default/tasks/task-1/move');
    expect(url).not.toContain('parent=');
    expect(url).not.toContain('previous=');
  });

  it('moves a task with parent parameter', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(TASK_FIXTURE));

    const result = await moveTask(http, '@default', 'task-1', 'parent-id');

    expect(result.ok).toBe(true);

    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('parent=parent-id');
  });

  it('moves a task with previous parameter', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(TASK_FIXTURE));

    const result = await moveTask(http, '@default', 'task-1', undefined, 'sibling-id');

    expect(result.ok).toBe(true);

    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('previous=sibling-id');
  });

  it('moves a task with both parent and previous parameters', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(TASK_FIXTURE));

    const result = await moveTask(http, '@default', 'task-1', 'parent-id', 'sibling-id');

    expect(result.ok).toBe(true);

    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('parent=parent-id');
    expect(url).toContain('previous=sibling-id');
  });
});

// ---------------------------------------------------------------------------
// Tests: TasksApi facade
// ---------------------------------------------------------------------------

describe('TasksApi facade', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates listTaskLists through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(TASKLISTS_RESPONSE_FIXTURE));

    const api = tasks(http);
    const result = await api.listTaskLists({ maxResults: 5 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
    }
  });

  it('delegates createTaskList through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(TASKLIST_FIXTURE));

    const api = tasks(http);
    const result = await api.createTaskList('Shopping List');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('list-1');
    }
  });

  it('delegates listTasks through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(TASKS_RESPONSE_FIXTURE));

    const api = tasks(http);
    const result = await api.listTasks('@default', { maxResults: 5 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
    }
  });

  it('delegates createTask through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(TASK_FIXTURE));

    const api = tasks(http);
    const result = await api.createTask('@default', {
      title: 'Test task',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('task-1');
    }
  });

  it('delegates completeTask through the facade', async () => {
    const completedTask = { ...TASK_FIXTURE, status: 'completed' as const };
    http._patchHandler.mockResolvedValueOnce(mockResponse(completedTask));

    const api = tasks(http);
    const result = await api.completeTask('@default', 'task-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('completed');
    }
  });

  it('delegates moveTask through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(TASK_FIXTURE));

    const api = tasks(http);
    const result = await api.moveTask('@default', 'task-1', 'parent-id', 'sibling-id');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('task-1');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: URL encoding
// ---------------------------------------------------------------------------

describe('URL encoding', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('encodes special characters in tasklistId', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(TASKS_RESPONSE_FIXTURE));

    await listTasks(http, 'list/with/slashes');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/lists/list%2Fwith%2Fslashes/tasks');
  });

  it('encodes special characters in taskId', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(TASK_FIXTURE));

    await getTask(http, '@default', 'task/with/slashes');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/tasks/task%2Fwith%2Fslashes');
  });
});
