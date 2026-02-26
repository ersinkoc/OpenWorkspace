/**
 * Example: Task Manager
 * List, create, and complete tasks using Google Tasks.
 */
import { createHttpClient, createAuthEngine, createFileTokenStore } from '@openworkspace/core';
import {
  listTaskLists,
  listTasks,
  createTask,
  completeTask,
  createTaskList,
} from '@openworkspace/tasks';

async function main() {
  const tokenStore = createFileTokenStore();
  const auth = createAuthEngine({ tokenStore });
  const http = createHttpClient({
    defaultHeaders: { Authorization: `Bearer ${await auth.getAccessToken()}` },
  });

  // Step 1: List existing task lists
  const listsResult = await listTaskLists(http);
  if (!listsResult.ok) {
    console.error('Failed to list task lists:', listsResult.error.message);
    return;
  }

  const taskLists = listsResult.value.items ?? [];
  console.log(`Task lists: ${taskLists.length}`);
  for (const tl of taskLists) {
    console.log(`  - ${tl.title} (${tl.id})`);
  }

  // Step 2: Create a new task list for the project
  const newListResult = await createTaskList(http, { title: 'Sprint 42' });
  if (!newListResult.ok) {
    console.error('Failed to create list:', newListResult.error.message);
    return;
  }

  const listId = newListResult.value.id;
  console.log(`\nCreated list: ${newListResult.value.title}`);

  // Step 3: Add tasks with due dates
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const taskNames = ['Write unit tests', 'Update documentation', 'Code review'];

  for (const title of taskNames) {
    const result = await createTask(http, listId, { title, due: tomorrow });
    if (result.ok) {
      console.log(`  Added: ${result.value.title}`);
    }
  }

  // Step 4: List tasks and complete the first one
  const tasksResult = await listTasks(http, listId);
  if (tasksResult.ok) {
    const tasks = tasksResult.value.items ?? [];
    console.log(`\nTasks in Sprint 42: ${tasks.length}`);

    if (tasks.length > 0) {
      const doneResult = await completeTask(http, listId, tasks[0].id);
      if (doneResult.ok) {
        console.log(`Completed: ${tasks[0].title}`);
      }
    }
  }
}

main().catch(console.error);
