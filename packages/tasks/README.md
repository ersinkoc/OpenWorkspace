# @openworkspace/tasks

> Google Tasks API client for OpenWorkspace -- task lists, tasks CRUD.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/tasks @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { listTaskLists, listTasks, createTask, completeTask } from '@openworkspace/tasks';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// List task lists
const lists = await listTaskLists(http);
if (lists.ok) {
  for (const tl of lists.value.items ?? []) {
    console.log(tl.title);
  }
}

// List tasks in a list
const tasks = await listTasks(http, 'taskListId');
if (tasks.ok) {
  for (const t of tasks.value.items ?? []) {
    console.log(t.title, t.status);
  }
}

// Create a task
await createTask(http, 'taskListId', { title: 'Buy groceries', notes: 'Milk, eggs, bread' });

// Mark complete
await completeTask(http, 'taskListId', 'taskId');
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

### Task Lists

- `listTaskLists(http, options)` -- List all task lists
- `getTaskList(http, id)` -- Get a task list
- `createTaskList(http, title)` -- Create a task list
- `updateTaskList(http, id, title)` -- Rename a task list
- `deleteTaskList(http, id)` -- Delete a task list

### Tasks

- `listTasks(http, taskListId, options)` -- List tasks
- `getTask(http, taskListId, taskId)` -- Get a task
- `createTask(http, taskListId, task)` -- Create a task
- `updateTask(http, taskListId, taskId, task)` -- Update a task
- `deleteTask(http, taskListId, taskId)` -- Delete a task
- `completeTask(http, taskListId, taskId)` -- Mark task completed
- `uncompleteTask(http, taskListId, taskId)` -- Mark task not completed
- `moveTask(http, taskListId, taskId, options)` -- Reorder a task

## License

[MIT](../../LICENSE)
