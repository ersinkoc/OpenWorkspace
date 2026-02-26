/**
 * MCP tool definitions for Google Workspace services.
 * Registers tools for Gmail, Calendar, Drive, Sheets, Tasks, Contacts,
 * Docs, Slides, Classroom, Forms, Chat, Keep, Apps Script, People, and Groups.
 *
 * When an authenticated HttpClient is provided, tool handlers call real
 * service APIs.  Without one they return an authentication prompt so the
 * MCP server can start even before the user has logged in.
 */

import type { ToolRegistry } from './registry.js';
import type { HttpClient } from '@openworkspace/core';

import { createGmailApi } from '@openworkspace/gmail';
import { calendar as createCalendarApi } from '@openworkspace/calendar';
import { createDriveApi } from '@openworkspace/drive';
import { createSheetsApi } from '@openworkspace/sheets';
import { tasks as createTasksApi } from '@openworkspace/tasks';
import { contacts as createContactsApi } from '@openworkspace/contacts';
import { createDocsApi } from '@openworkspace/docs';
import { slides as createSlidesApi } from '@openworkspace/slides';
import { classroom as createClassroomApi } from '@openworkspace/classroom';
import { createFormsApi } from '@openworkspace/forms';
import { chat as createChatApi } from '@openworkspace/chat';
import { keep as createKeepApi } from '@openworkspace/keep';
import { appscript as createAppScriptApi } from '@openworkspace/appscript';
import { people as createPeopleApi } from '@openworkspace/people';
import { groups as createGroupsApi } from '@openworkspace/groups';

// ---------------------------------------------------------------------------
// Stub response returned when no HttpClient is available (unauthenticated).
// ---------------------------------------------------------------------------

/** Stub response returned by all tool handlers until services are wired. */
const STUB_RESPONSE = {
  message: 'Tool requires authentication. Configure with ows auth add <email>.',
};

// ---------------------------------------------------------------------------
// Helper: compute today/tomorrow/N-day time bounds for calendar tools.
// ---------------------------------------------------------------------------

function computeTimeBounds(params: Record<string, unknown>): {
  timeMin: string;
  timeMax: string;
} | null {
  const now = new Date();

  if (params.today) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { timeMin: start.toISOString(), timeMax: end.toISOString() };
  }

  if (params.tomorrow) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { timeMin: start.toISOString(), timeMax: end.toISOString() };
  }

  if (typeof params.days === 'number') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + (params.days as number));
    return { timeMin: start.toISOString(), timeMax: end.toISOString() };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers all Google Workspace MCP tools onto the given registry.
 *
 * When an authenticated `HttpClient` is provided, real service API instances
 * are created and every handler delegates to the corresponding service method.
 * Without an `HttpClient` every handler returns {@link STUB_RESPONSE}.
 *
 * Services covered:
 * - Gmail (search, read, send, labels)
 * - Calendar (events, create, freebusy)
 * - Drive (search, read, upload)
 * - Sheets (read, write)
 * - Tasks (list, create, complete)
 * - Contacts (search)
 * - Docs (get, create)
 * - Slides (get, create)
 * - Classroom (courses)
 * - Forms (get)
 * - Chat (send)
 * - Keep (list)
 * - Apps Script (run)
 * - People (me)
 * - Groups (list)
 * - Workspace (search)
 */
export function registerServiceTools(registry: ToolRegistry, http?: HttpClient): void {
  // Create API instances only when an authenticated http client is available
  const gmailApi = http ? createGmailApi(http) : null;
  const calendarApi = http ? createCalendarApi(http) : null;
  const driveApi = http ? createDriveApi(http) : null;
  const sheetsApi = http ? createSheetsApi(http) : null;
  const tasksApi = http ? createTasksApi(http) : null;
  const contactsApi = http ? createContactsApi(http) : null;
  const docsApi = http ? createDocsApi(http) : null;
  const slidesApi = http ? createSlidesApi(http) : null;
  const classroomApi = http ? createClassroomApi(http) : null;
  const formsApi = http ? createFormsApi(http) : null;
  const chatApi = http ? createChatApi(http) : null;
  const keepApi = http ? createKeepApi(http) : null;
  const appscriptApi = http ? createAppScriptApi(http) : null;
  const peopleApi = http ? createPeopleApi(http) : null;
  const groupsApi = http ? createGroupsApi(http) : null;

  // ---------------------------------------------------------------------------
  // Gmail
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'gmail_search',
    description: 'Search Gmail threads by query',
    parameters: {
      query: { type: 'string', description: 'Gmail search query string', required: true },
      max: { type: 'number', description: 'Maximum number of results to return' },
    },
    handler: async (params) => {
      if (!gmailApi) return STUB_RESPONSE;
      const result = await gmailApi.searchMessages({
        q: params.query as string,
        maxResults: params.max as number | undefined,
      });
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  registry.register({
    name: 'gmail_read',
    description: 'Read a Gmail thread or message',
    parameters: {
      threadId: { type: 'string', description: 'Gmail thread ID to read', required: true },
      includeBody: { type: 'boolean', description: 'Whether to include the full message body' },
    },
    handler: async (params) => {
      if (!gmailApi) return STUB_RESPONSE;
      const format = params.includeBody ? 'full' : 'metadata';
      const result = await gmailApi.getThread({
        id: params.threadId as string,
        format,
      });
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  registry.register({
    name: 'gmail_send',
    description: 'Send an email',
    parameters: {
      to: { type: 'string', description: 'Recipient email address', required: true },
      subject: { type: 'string', description: 'Email subject line', required: true },
      body: { type: 'string', description: 'Email body content', required: true },
      html: { type: 'boolean', description: 'Whether the body is HTML' },
    },
    handler: async (params) => {
      if (!gmailApi) return STUB_RESPONSE;
      const options: Record<string, unknown> = {
        to: params.to as string,
        subject: params.subject as string,
      };
      if (params.html) {
        options.html = params.body as string;
      } else {
        options.body = params.body as string;
      }
      const result = await gmailApi.sendMessage(options as Parameters<typeof gmailApi.sendMessage>[0]);
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  registry.register({
    name: 'gmail_labels',
    description: 'List Gmail labels',
    parameters: {},
    handler: async () => {
      if (!gmailApi) return STUB_RESPONSE;
      const result = await gmailApi.listLabels();
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // Calendar
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'calendar_events',
    description: 'List calendar events',
    parameters: {
      calendarId: { type: 'string', description: 'Calendar ID to list events from' },
      today: { type: 'boolean', description: 'Only show events for today' },
      tomorrow: { type: 'boolean', description: 'Only show events for tomorrow' },
      days: { type: 'number', description: 'Number of days ahead to list events for' },
    },
    handler: async (params) => {
      if (!calendarApi) return STUB_RESPONSE;
      const calendarId = (params.calendarId as string) || 'primary';
      const bounds = computeTimeBounds(params);
      const result = await calendarApi.listEvents(calendarId, {
        ...(bounds ?? {}),
        singleEvents: true,
        orderBy: 'startTime',
      });
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  registry.register({
    name: 'calendar_create',
    description: 'Create a calendar event',
    parameters: {
      summary: { type: 'string', description: 'Event title / summary', required: true },
      start: { type: 'string', description: 'Event start time (ISO 8601)', required: true },
      end: { type: 'string', description: 'Event end time (ISO 8601)', required: true },
      attendees: { type: 'array', description: 'List of attendee email addresses' },
      location: { type: 'string', description: 'Event location' },
    },
    handler: async (params) => {
      if (!calendarApi) return STUB_RESPONSE;
      const attendees = params.attendees
        ? (params.attendees as string[]).map((email) => ({ email }))
        : undefined;
      const result = await calendarApi.createEvent('primary', {
        summary: params.summary as string,
        start: { dateTime: params.start as string },
        end: { dateTime: params.end as string },
        attendees,
        location: params.location as string | undefined,
      });
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  registry.register({
    name: 'calendar_freebusy',
    description: 'Check availability across calendars',
    parameters: {
      calendars: { type: 'array', description: 'List of calendar IDs to check', required: true },
      from: { type: 'string', description: 'Start of time range (ISO 8601)', required: true },
      to: { type: 'string', description: 'End of time range (ISO 8601)', required: true },
    },
    handler: async (params) => {
      if (!calendarApi) return STUB_RESPONSE;
      const items = (params.calendars as string[]).map((id) => ({ id }));
      const result = await calendarApi.queryFreeBusy({
        timeMin: params.from as string,
        timeMax: params.to as string,
        items,
      });
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // Drive
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'drive_search',
    description: 'Search files in Google Drive',
    parameters: {
      query: { type: 'string', description: 'Drive search query', required: true },
      max: { type: 'number', description: 'Maximum number of results to return' },
    },
    handler: async (params) => {
      if (!driveApi) return STUB_RESPONSE;
      const result = await driveApi.searchFiles(params.query as string, {
        pageSize: params.max as number | undefined,
      });
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  registry.register({
    name: 'drive_read',
    description: 'Get file metadata or content',
    parameters: {
      fileId: { type: 'string', description: 'Drive file ID', required: true },
    },
    handler: async (params) => {
      if (!driveApi) return STUB_RESPONSE;
      const result = await driveApi.getFile(params.fileId as string);
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  registry.register({
    name: 'drive_upload',
    description: 'Upload a file to Drive',
    parameters: {
      content: { type: 'string', description: 'File content to upload', required: true },
      name: { type: 'string', description: 'File name', required: true },
      mimeType: { type: 'string', description: 'MIME type of the file' },
      parent: { type: 'string', description: 'Parent folder ID in Drive' },
    },
    handler: async (params) => {
      if (!driveApi) return STUB_RESPONSE;
      const body = new TextEncoder().encode(params.content as string);
      const result = await driveApi.uploadFile({
        name: params.name as string,
        mimeType: (params.mimeType as string) || 'text/plain',
        body,
        parents: params.parent ? [params.parent as string] : undefined,
      });
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // Sheets
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'sheets_read',
    description: 'Read spreadsheet cell values',
    parameters: {
      spreadsheetId: { type: 'string', description: 'Google Sheets spreadsheet ID', required: true },
      range: { type: 'string', description: 'A1 notation range to read (e.g. Sheet1!A1:B10)', required: true },
    },
    handler: async (params) => {
      if (!sheetsApi) return STUB_RESPONSE;
      const result = await sheetsApi.getValues(
        params.spreadsheetId as string,
        params.range as string,
      );
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  registry.register({
    name: 'sheets_write',
    description: 'Write values to spreadsheet cells',
    parameters: {
      spreadsheetId: { type: 'string', description: 'Google Sheets spreadsheet ID', required: true },
      range: { type: 'string', description: 'A1 notation range to write (e.g. Sheet1!A1:B10)', required: true },
      values: { type: 'array', description: 'Two-dimensional array of cell values to write', required: true },
    },
    handler: async (params) => {
      if (!sheetsApi) return STUB_RESPONSE;
      const result = await sheetsApi.updateValues(
        params.spreadsheetId as string,
        params.range as string,
        params.values as (string | number | boolean | null)[][],
      );
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'tasks_list',
    description: 'List tasks in a tasklist',
    parameters: {
      tasklistId: { type: 'string', description: 'Task list ID', required: true },
      max: { type: 'number', description: 'Maximum number of tasks to return' },
    },
    handler: async (params) => {
      if (!tasksApi) return STUB_RESPONSE;
      const result = await tasksApi.listTasks(params.tasklistId as string, {
        maxResults: params.max as number | undefined,
      });
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  registry.register({
    name: 'tasks_create',
    description: 'Create a new task',
    parameters: {
      tasklistId: { type: 'string', description: 'Task list ID', required: true },
      title: { type: 'string', description: 'Task title', required: true },
      due: { type: 'string', description: 'Due date (ISO 8601)' },
      notes: { type: 'string', description: 'Task notes' },
    },
    handler: async (params) => {
      if (!tasksApi) return STUB_RESPONSE;
      const result = await tasksApi.createTask(params.tasklistId as string, {
        title: params.title as string,
        due: params.due as string | undefined,
        notes: params.notes as string | undefined,
      });
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  registry.register({
    name: 'tasks_complete',
    description: 'Mark a task as completed',
    parameters: {
      tasklistId: { type: 'string', description: 'Task list ID', required: true },
      taskId: { type: 'string', description: 'Task ID', required: true },
    },
    handler: async (params) => {
      if (!tasksApi) return STUB_RESPONSE;
      const result = await tasksApi.completeTask(
        params.tasklistId as string,
        params.taskId as string,
      );
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'contacts_search',
    description: 'Search contacts by name or email',
    parameters: {
      query: { type: 'string', description: 'Search query for contacts', required: true },
      max: { type: 'number', description: 'Maximum number of results to return' },
    },
    handler: async (params) => {
      if (!contactsApi) return STUB_RESPONSE;
      const result = await contactsApi.searchContacts(params.query as string, {
        pageSize: params.max as number | undefined,
      });
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // Docs
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'docs_get',
    description: 'Get a Google Doc',
    parameters: {
      documentId: { type: 'string', description: 'Google Doc document ID', required: true },
    },
    handler: async (params) => {
      if (!docsApi) return STUB_RESPONSE;
      const result = await docsApi.getDocument(params.documentId as string);
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  registry.register({
    name: 'docs_create',
    description: 'Create a Google Doc',
    parameters: {
      title: { type: 'string', description: 'Document title', required: true },
    },
    handler: async (params) => {
      if (!docsApi) return STUB_RESPONSE;
      const result = await docsApi.createDocument(params.title as string);
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // Slides
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'slides_get',
    description: 'Get a presentation',
    parameters: {
      presentationId: { type: 'string', description: 'Google Slides presentation ID', required: true },
    },
    handler: async (params) => {
      if (!slidesApi) return STUB_RESPONSE;
      const result = await slidesApi.getPresentation(params.presentationId as string);
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  registry.register({
    name: 'slides_create',
    description: 'Create a presentation',
    parameters: {
      title: { type: 'string', description: 'Presentation title', required: true },
    },
    handler: async (params) => {
      if (!slidesApi) return STUB_RESPONSE;
      const result = await slidesApi.createPresentation(params.title as string);
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // Classroom
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'classroom_courses',
    description: 'List courses',
    parameters: {
      max: { type: 'number', description: 'Maximum number of courses to return' },
    },
    handler: async (params) => {
      if (!classroomApi) return STUB_RESPONSE;
      const result = await classroomApi.listCourses({
        pageSize: params.max as number | undefined,
      });
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // Forms
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'forms_get',
    description: 'Get a form',
    parameters: {
      formId: { type: 'string', description: 'Google Form ID', required: true },
    },
    handler: async (params) => {
      if (!formsApi) return STUB_RESPONSE;
      const result = await formsApi.getForm(params.formId as string);
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'chat_send',
    description: 'Send a chat message',
    parameters: {
      spaceName: { type: 'string', description: 'Chat space name', required: true },
      text: { type: 'string', description: 'Message text', required: true },
    },
    handler: async (params) => {
      if (!chatApi) return STUB_RESPONSE;
      const result = await chatApi.sendMessage(
        params.spaceName as string,
        params.text as string,
      );
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // Keep
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'keep_list',
    description: 'List Keep notes',
    parameters: {
      max: { type: 'number', description: 'Maximum number of notes to return' },
    },
    handler: async (params) => {
      if (!keepApi) return STUB_RESPONSE;
      const result = await keepApi.listNotes({
        pageSize: params.max as number | undefined,
      });
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // Apps Script
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'appscript_run',
    description: 'Run an Apps Script function',
    parameters: {
      scriptId: { type: 'string', description: 'Apps Script project ID', required: true },
      function: { type: 'string', description: 'Function name to execute', required: true },
    },
    handler: async (params) => {
      if (!appscriptApi) return STUB_RESPONSE;
      const result = await appscriptApi.runFunction(
        params.scriptId as string,
        params.function as string,
      );
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // People
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'people_me',
    description: 'Get own profile',
    parameters: {},
    handler: async () => {
      if (!peopleApi) return STUB_RESPONSE;
      const result = await peopleApi.getProfile('people/me');
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // Groups
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'groups_list',
    description: 'List groups',
    parameters: {
      max: { type: 'number', description: 'Maximum number of groups to return' },
    },
    handler: async (params) => {
      if (!groupsApi) return STUB_RESPONSE;
      const result = await groupsApi.listGroups('customers/my_customer', {
        pageSize: params.max as number | undefined,
      });
      if (!result.ok) return { error: result.error.message };
      return result.value;
    },
  });

  // ---------------------------------------------------------------------------
  // Workspace (cross-service)
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'workspace_search',
    description: 'Search across Gmail, Drive, and Calendar',
    parameters: {
      query: { type: 'string', description: 'Search query', required: true },
      services: { type: 'array', description: 'List of services to search (gmail, drive, calendar)' },
      max: { type: 'number', description: 'Maximum number of results per service' },
    },
    handler: async (params) => {
      if (!gmailApi && !driveApi && !calendarApi) return STUB_RESPONSE;

      const query = params.query as string;
      const services = (params.services as string[] | undefined) ?? ['gmail', 'drive', 'calendar'];
      const max = params.max as number | undefined;
      const results: Record<string, unknown> = {};

      const searches = services.map(async (service) => {
        try {
          switch (service) {
            case 'gmail': {
              if (!gmailApi) break;
              const r = await gmailApi.searchMessages({ q: query, maxResults: max });
              results.gmail = r.ok ? r.value : { error: r.error.message };
              break;
            }
            case 'drive': {
              if (!driveApi) break;
              const r = await driveApi.searchFiles(query, { pageSize: max });
              results.drive = r.ok ? r.value : { error: r.error.message };
              break;
            }
            case 'calendar': {
              if (!calendarApi) break;
              const r = await calendarApi.searchEvents('primary', query, { maxResults: max });
              results.calendar = r.ok ? r.value : { error: r.error.message };
              break;
            }
          }
        } catch (error) {
          results[service] = { error: error instanceof Error ? error.message : String(error) };
        }
      });

      await Promise.all(searches);
      return results;
    },
  });
}
