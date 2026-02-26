/**
 * Operation-level tests for @openworkspace/tasks.
 * Covers tasklists and task-ops modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';

import { listTaskLists, getTaskList, createTaskList, updateTaskList, deleteTaskList } from './tasklists.js';
import { listTasks, getTask, createTask, updateTask, deleteTask, completeTask, uncompleteTask, moveTask } from './task-ops.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createMockHttp(): HttpClient {
  const methods = ['request', 'get', 'post', 'put', 'patch', 'delete'] as const;
  const mock = { interceptors: { request: [], response: [], error: [] } } as unknown as HttpClient;
  for (const method of methods) {
    (mock as Record<string, unknown>)[method] = vi.fn();
  }
  return mock;
}

function mockOk<T>(data: T): Result<HttpResponse<T>, NetworkError> {
  return ok({ status: 200, statusText: 'OK', headers: {}, data });
}

function mockErr(message: string, statusCode?: number): Result<never, NetworkError> {
  return err(new NetworkError(message, { url: 'test' }, statusCode));
}

// ---------------------------------------------------------------------------
// tasklists.ts
// ---------------------------------------------------------------------------

describe('tasklists operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listTaskLists', () => {
    it('should GET task lists', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ items: [{ id: 'tl1', title: 'Todo' }] }));
      const result = await listTaskLists(http);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.items[0]?.title).toBe('Todo');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/users/@me/lists');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listTaskLists(http);
      expect(result.ok).toBe(false);
    });

    it('should wrap non-WorkspaceError', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(err(new Error('raw') as unknown as NetworkError));
      const result = await listTaskLists(http);
      expect(result.ok).toBe(false);
    });
  });

  describe('getTaskList', () => {
    it('should GET a task list by id', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ id: 'tl1', title: 'Todo' }));
      const result = await getTaskList(http, 'tl1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe('tl1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getTaskList(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('createTaskList', () => {
    it('should POST new task list', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'tl2', title: 'Shopping' }));
      const result = await createTaskList(http, 'Shopping');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('Shopping');
      expect(vi.mocked(http.post).mock.calls[0]?.[1]?.body).toEqual({ title: 'Shopping' });
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createTaskList(http, 'X');
      expect(result.ok).toBe(false);
    });
  });

  describe('updateTaskList', () => {
    it('should PATCH task list title', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockOk({ id: 'tl1', title: 'Grocery' }));
      const result = await updateTaskList(http, 'tl1', 'Grocery');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('Grocery');
    });

    it('should propagate error', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await updateTaskList(http, 'x', 'Y');
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteTaskList', () => {
    it('should DELETE task list', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await deleteTaskList(http, 'tl1');
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await deleteTaskList(http, 'x');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// task-ops.ts
// ---------------------------------------------------------------------------

describe('task-ops operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listTasks', () => {
    it('should GET tasks in a list', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ items: [{ id: 't1', title: 'Buy milk' }] }));
      const result = await listTasks(http, '@default');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.items[0]?.title).toBe('Buy milk');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/lists/%40default/tasks');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listTasks(http, 'x');
      expect(result.ok).toBe(false);
    });

    it('should wrap non-WorkspaceError', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(err(new Error('raw') as unknown as NetworkError));
      const result = await listTasks(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('getTask', () => {
    it('should GET a single task', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ id: 't1', title: 'Buy milk' }));
      const result = await getTask(http, '@default', 't1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe('t1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getTask(http, 'x', 'y');
      expect(result.ok).toBe(false);
    });
  });

  describe('createTask', () => {
    it('should POST new task', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 't2', title: 'Buy eggs' }));
      const result = await createTask(http, '@default', { title: 'Buy eggs' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('Buy eggs');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createTask(http, 'x', {});
      expect(result.ok).toBe(false);
    });
  });

  describe('updateTask', () => {
    it('should PATCH task', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockOk({ id: 't1', title: 'Updated' }));
      const result = await updateTask(http, '@default', 't1', { title: 'Updated' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('Updated');
    });

    it('should propagate error', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await updateTask(http, 'x', 'y', {});
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteTask', () => {
    it('should DELETE task', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await deleteTask(http, '@default', 't1');
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await deleteTask(http, 'x', 'y');
      expect(result.ok).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('should PATCH with status completed', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockOk({ id: 't1', status: 'completed' }));
      const result = await completeTask(http, '@default', 't1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.patch).mock.calls[0]?.[1]?.body).toEqual({ status: 'completed' });
    });
  });

  describe('uncompleteTask', () => {
    it('should PATCH with status needsAction', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockOk({ id: 't1', status: 'needsAction' }));
      const result = await uncompleteTask(http, '@default', 't1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.patch).mock.calls[0]?.[1]?.body).toEqual({ status: 'needsAction' });
    });
  });

  describe('moveTask', () => {
    it('should POST to move endpoint', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 't1' }));
      const result = await moveTask(http, '@default', 't1', 'parent1');
      expect(result.ok).toBe(true);
      const url = vi.mocked(http.post).mock.calls[0]?.[0] as string;
      expect(url).toContain('/move');
      expect(url).toContain('parent=parent1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await moveTask(http, 'x', 'y');
      expect(result.ok).toBe(false);
    });
  });
});
