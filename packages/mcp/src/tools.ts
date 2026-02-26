/**
 * MCP tool definitions for Google Workspace services.
 * Registers tools for Gmail, Calendar, Drive, Sheets, Tasks, Contacts,
 * Docs, Slides, Classroom, Forms, Chat, Keep, Apps Script, People, and Groups.
 *
 * All handlers are stubs that return an authentication prompt.
 * They will be wired to real service APIs in a later phase.
 */

import type { ToolRegistry } from './registry.js';

/** Stub response returned by all tool handlers until services are wired. */
const STUB_RESPONSE = {
  message: 'Tool requires authentication. Configure with ows auth add <email>.',
};

/**
 * Creates a stub handler that returns the authentication prompt.
 */
function stubHandler(): (params: Record<string, unknown>) => Promise<unknown> {
  return async () => STUB_RESPONSE;
}

/**
 * Registers all Google Workspace MCP tools onto the given registry.
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
export function registerServiceTools(registry: ToolRegistry): void {
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
    handler: stubHandler(),
  });

  registry.register({
    name: 'gmail_read',
    description: 'Read a Gmail thread or message',
    parameters: {
      threadId: { type: 'string', description: 'Gmail thread ID to read', required: true },
      includeBody: { type: 'boolean', description: 'Whether to include the full message body' },
    },
    handler: stubHandler(),
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
    handler: stubHandler(),
  });

  registry.register({
    name: 'gmail_labels',
    description: 'List Gmail labels',
    parameters: {},
    handler: stubHandler(),
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
    handler: stubHandler(),
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
    handler: stubHandler(),
  });

  registry.register({
    name: 'calendar_freebusy',
    description: 'Check availability across calendars',
    parameters: {
      calendars: { type: 'array', description: 'List of calendar IDs to check', required: true },
      from: { type: 'string', description: 'Start of time range (ISO 8601)', required: true },
      to: { type: 'string', description: 'End of time range (ISO 8601)', required: true },
    },
    handler: stubHandler(),
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
    handler: stubHandler(),
  });

  registry.register({
    name: 'drive_read',
    description: 'Get file metadata or content',
    parameters: {
      fileId: { type: 'string', description: 'Drive file ID', required: true },
    },
    handler: stubHandler(),
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
    handler: stubHandler(),
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
    handler: stubHandler(),
  });

  registry.register({
    name: 'sheets_write',
    description: 'Write values to spreadsheet cells',
    parameters: {
      spreadsheetId: { type: 'string', description: 'Google Sheets spreadsheet ID', required: true },
      range: { type: 'string', description: 'A1 notation range to write (e.g. Sheet1!A1:B10)', required: true },
      values: { type: 'array', description: 'Two-dimensional array of cell values to write', required: true },
    },
    handler: stubHandler(),
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
    handler: stubHandler(),
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
    handler: stubHandler(),
  });

  registry.register({
    name: 'tasks_complete',
    description: 'Mark a task as completed',
    parameters: {
      tasklistId: { type: 'string', description: 'Task list ID', required: true },
      taskId: { type: 'string', description: 'Task ID', required: true },
    },
    handler: stubHandler(),
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
    handler: stubHandler(),
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
    handler: stubHandler(),
  });

  registry.register({
    name: 'docs_create',
    description: 'Create a Google Doc',
    parameters: {
      title: { type: 'string', description: 'Document title', required: true },
    },
    handler: stubHandler(),
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
    handler: stubHandler(),
  });

  registry.register({
    name: 'slides_create',
    description: 'Create a presentation',
    parameters: {
      title: { type: 'string', description: 'Presentation title', required: true },
    },
    handler: stubHandler(),
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
    handler: stubHandler(),
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
    handler: stubHandler(),
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
    handler: stubHandler(),
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
    handler: stubHandler(),
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
    handler: stubHandler(),
  });

  // ---------------------------------------------------------------------------
  // People
  // ---------------------------------------------------------------------------

  registry.register({
    name: 'people_me',
    description: 'Get own profile',
    parameters: {},
    handler: stubHandler(),
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
    handler: stubHandler(),
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
    handler: stubHandler(),
  });
}
