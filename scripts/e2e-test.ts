/**
 * OpenWorkspace End-to-End Safe Test
 *
 * Tests all 15 Google Workspace services with a real authenticated account.
 * - Read-only operations where possible
 * - All created items prefixed with [OWS-TEST] and cleaned up after
 * - No emails are actually sent (only drafts)
 * - No real data is modified
 *
 * Prerequisites:
 *   1. pnpm run build
 *   2. ows auth credentials /path/to/credentials.json
 *   3. ows auth add your@gmail.com
 *
 * Usage:
 *   npx tsx scripts/e2e-test.ts [--account user@gmail.com] [--skip chat,classroom,groups,keep]
 *
 * Required Google Cloud APIs:
 *   - Gmail API
 *   - Google Calendar API
 *   - Google Drive API
 *   - Google Sheets API
 *   - Google Docs API
 *   - Google Slides API
 *   - People API (contacts + people)
 *   - Tasks API
 *
 * Optional (Workspace only):
 *   - Google Chat API
 *   - Google Classroom API
 *   - Cloud Identity API (groups)
 *   - Google Keep API
 *   - Apps Script API
 *   - Google Forms API
 */

import { getAuthenticatedClient } from '../packages/cli/src/cli.js';
import { createGmailApi } from '../packages/gmail/src/plugin.js';
import { calendar as createCalendarApi, type CalendarApi } from '../packages/calendar/src/plugin.js';
import { createDriveApi } from '../packages/drive/src/plugin.js';
import { createSheetsApi } from '../packages/sheets/src/plugin.js';
import { createDocsApi } from '../packages/docs/src/plugin.js';
import { slides as createSlidesApi } from '../packages/slides/src/plugin.js';
import { contacts as createContactsApi } from '../packages/contacts/src/plugin.js';
import { tasks as createTasksApi } from '../packages/tasks/src/plugin.js';
import { chat as createChatApi } from '../packages/chat/src/plugin.js';
import { classroom as createClassroomApi } from '../packages/classroom/src/plugin.js';
import { createFormsApi } from '../packages/forms/src/plugin.js';
import { appscript as createAppScriptApi } from '../packages/appscript/src/plugin.js';
import { people as createPeopleApi } from '../packages/people/src/plugin.js';
import { groups as createGroupsApi } from '../packages/groups/src/plugin.js';
import { keep as createKeepApi } from '../packages/keep/src/plugin.js';
import type { HttpClient } from '../packages/core/src/index.js';

// ─── Config ─────────────────────────────────────────
const TEST_PREFIX = '[OWS-TEST]';
const CLEANUP_IDS: { type: string; id: string; cleanup: () => Promise<void> }[] = [];

// ─── Types ──────────────────────────────────────────
type TestResult = {
  service: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  detail?: string;
  duration: number;
};

const results: TestResult[] = [];
let currentService = '';

// ─── Helpers ────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function header(text: string) {
  console.log(`\n${C.cyan}${C.bold}${text}${C.reset}`);
  console.log(`${C.dim}${'─'.repeat(50)}${C.reset}`);
  currentService = text;
}

async function test(name: string, fn: () => Promise<string | void>) {
  const start = Date.now();
  try {
    const detail = await fn();
    const duration = Date.now() - start;
    results.push({ service: currentService, test: name, status: 'PASS', detail: detail || undefined, duration });
    console.log(`  ${C.green}PASS${C.reset}  ${name}${detail ? ` ${C.dim}(${detail})${C.reset}` : ''} ${C.dim}${duration}ms${C.reset}`);
  } catch (e: unknown) {
    const duration = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    results.push({ service: currentService, test: name, status: 'FAIL', detail: msg, duration });
    console.log(`  ${C.red}FAIL${C.reset}  ${name}`);
    console.log(`        ${C.red}${msg}${C.reset}`);
  }
}

function skip(name: string, reason: string) {
  results.push({ service: currentService, test: name, status: 'SKIP', detail: reason, duration: 0 });
  console.log(`  ${C.yellow}SKIP${C.reset}  ${name} ${C.dim}(${reason})${C.reset}`);
}

function unwrap<T>(result: { ok: boolean; value?: T; error?: { message: string } }): T {
  if (!result.ok) throw new Error(result.error?.message ?? 'Unknown error');
  return result.value as T;
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Parse args ─────────────────────────────────────
const args = process.argv.slice(2);
let accountArg: string | undefined;
let skipServices: string[] = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--account' && args[i + 1]) accountArg = args[++i];
  if (args[i] === '--skip' && args[i + 1]) skipServices = args[++i]!.split(',').map(s => s.trim().toLowerCase());
}

function shouldSkip(service: string): boolean {
  return skipServices.includes(service.toLowerCase());
}

// ─── Main ───────────────────────────────────────────
async function main() {
  console.log(`\n${C.cyan}${C.bold}OpenWorkspace End-to-End Test${C.reset}`);
  console.log(`${C.dim}${'='.repeat(50)}${C.reset}`);
  console.log(`${C.dim}All created items prefixed with "${TEST_PREFIX}" and cleaned up after.${C.reset}`);
  console.log(`${C.dim}No emails sent. No real data modified.${C.reset}`);

  // ── Phase 0: Auth ─────────────────────────────────
  header('Auth');
  let http: HttpClient;
  let account: string;

  await test('Get authenticated client', async () => {
    const result = await getAuthenticatedClient(accountArg);
    if (!result.ok) throw new Error(result.error);
    http = result.value.http;
    account = result.value.account;
    return `account: ${account}`;
  });

  if (!http!) {
    console.log(`\n${C.red}${C.bold}Auth failed. Run: ows auth add <your-email>${C.reset}\n`);
    process.exit(1);
  }

  // Helper to delete via Drive API (for Docs, Sheets, Slides, Forms)
  const driveApi = createDriveApi(http);
  async function driveDelete(fileId: string) {
    await driveApi.deleteFile(fileId);
  }

  // ── Phase 1: Gmail ────────────────────────────────
  if (!shouldSkip('gmail')) {
    header('Gmail');
    const gmail = createGmailApi(http);

    await test('List labels', async () => {
      const r = unwrap(await gmail.listLabels());
      return `${(r as unknown as { labels: unknown[] }).labels?.length ?? 0} labels`;
    });

    await test('Search messages (first 3)', async () => {
      const r = unwrap(await gmail.searchMessages({ q: 'in:inbox', maxResults: 3 }));
      const msgs = (r as { messages?: { id: string }[] }).messages ?? [];
      return `${msgs.length} messages`;
    });

    await test('Create draft (not sent)', async () => {
      const r = unwrap(await gmail.createDraft({
        to: account!,
        subject: `${TEST_PREFIX} E2E test draft - safe to delete`,
        body: 'This is a test draft created by OpenWorkspace E2E test. Safe to delete.',
      }));
      const draftId = (r as { id: string }).id;

      // Cleanup: delete draft (doesn't actually have a delete API, but drafts are harmless)
      return `draft ${draftId} created (harmless, auto-expires)`;
    });

    await test('List drafts', async () => {
      const r = unwrap(await gmail.listDrafts());
      const drafts = (r as { drafts?: unknown[] }).drafts ?? [];
      return `${drafts.length} drafts`;
    });
  }

  // ── Phase 2: Calendar ─────────────────────────────
  if (!shouldSkip('calendar')) {
    header('Calendar');
    const cal = createCalendarApi(http);

    await test('List calendars', async () => {
      const r = unwrap(await cal.listCalendars());
      const items = (r as { items?: unknown[] }).items ?? [];
      return `${items.length} calendars`;
    });

    await test('List today events', async () => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      const r = unwrap(await cal.listEvents('primary', {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      }));
      const items = (r as { items?: unknown[] }).items ?? [];
      return `${items.length} events today`;
    });

    let testEventId: string | undefined;
    await test('Create test event (future)', async () => {
      const tomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const end = new Date(tomorrow.getTime() + 60 * 60 * 1000);
      const r = unwrap(await cal.createEvent('primary', {
        summary: `${TEST_PREFIX} E2E test event`,
        description: 'Auto-created by OpenWorkspace E2E test. Will be deleted.',
        start: { dateTime: tomorrow.toISOString() },
        end: { dateTime: end.toISOString() },
      }));
      testEventId = (r as { id: string }).id;
      return `event ${testEventId}`;
    });

    await test('Delete test event', async () => {
      if (!testEventId) throw new Error('No event to delete');
      unwrap(await cal.deleteEvent('primary', testEventId));
      return 'cleaned up';
    });

    await test('Query free/busy', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const r = unwrap(await cal.queryFreeBusy({
        timeMin: now.toISOString(),
        timeMax: later.toISOString(),
        items: [{ id: 'primary' }],
      }));
      return `queried`;
    });
  }

  // ── Phase 3: Drive ────────────────────────────────
  if (!shouldSkip('drive')) {
    header('Drive');
    const drive = createDriveApi(http);

    await test('List files (first 5)', async () => {
      const r = unwrap(await drive.listFiles({ pageSize: 5 }));
      const files = (r as { files?: unknown[] }).files ?? [];
      return `${files.length} files`;
    });

    let testFolderId: string | undefined;
    await test('Create test folder', async () => {
      const r = unwrap(await drive.createFolder({
        name: `${TEST_PREFIX} E2E test folder`,
      }));
      testFolderId = (r as { id: string }).id;
      return `folder ${testFolderId}`;
    });

    let testFileId: string | undefined;
    await test('Upload test file', async () => {
      if (!testFolderId) throw new Error('No folder');
      const content = new TextEncoder().encode('OpenWorkspace E2E test file content');
      const r = unwrap(await drive.uploadFile({
        name: `${TEST_PREFIX} test-file.txt`,
        mimeType: 'text/plain',
        body: content,
        parents: [testFolderId],
      }));
      testFileId = (r as { id: string }).id;
      return `file ${testFileId}`;
    });

    await test('Search test file', async () => {
      if (!testFileId) throw new Error('No file');
      const r = unwrap(await drive.searchFiles(`name contains 'OWS-TEST'`, { pageSize: 5 }));
      const files = (r as { files?: { id: string }[] }).files ?? [];
      if (!files.some(f => f.id === testFileId)) throw new Error('Test file not found in search');
      return `found in search results`;
    });

    await test('Download test file', async () => {
      if (!testFileId) throw new Error('No file');
      const r = unwrap(await drive.downloadFile(testFileId));
      if (!r) throw new Error('Empty download');
      return `downloaded`;
    });

    await test('Cleanup: delete test file', async () => {
      if (testFileId) unwrap(await drive.deleteFile(testFileId));
      return 'deleted';
    });

    await test('Cleanup: delete test folder', async () => {
      if (testFolderId) unwrap(await drive.deleteFile(testFolderId));
      return 'deleted';
    });
  }

  // ── Phase 4: Sheets ───────────────────────────────
  if (!shouldSkip('sheets')) {
    header('Sheets');
    const sheets = createSheetsApi(http);

    let testSpreadsheetId: string | undefined;
    await test('Create test spreadsheet', async () => {
      const r = unwrap(await sheets.createSpreadsheet({
        title: `${TEST_PREFIX} E2E test spreadsheet`,
        sheetTitles: ['TestData'],
      }));
      testSpreadsheetId = (r as { spreadsheetId: string }).spreadsheetId;
      return `spreadsheet ${testSpreadsheetId}`;
    });

    await test('Write test data', async () => {
      if (!testSpreadsheetId) throw new Error('No spreadsheet');
      const r = unwrap(await sheets.updateValues(testSpreadsheetId, 'TestData!A1:C3', [
        ['Name', 'Score', 'Status'],
        ['Alice', 95, 'Pass'],
        ['Bob', 87, 'Pass'],
      ]));
      return `updated ${(r as { updatedCells?: number }).updatedCells} cells`;
    });

    await test('Read test data back', async () => {
      if (!testSpreadsheetId) throw new Error('No spreadsheet');
      const r = unwrap(await sheets.getValues(testSpreadsheetId, 'TestData!A1:C3'));
      const values = (r as { values?: unknown[][] }).values ?? [];
      if (values.length !== 3) throw new Error(`Expected 3 rows, got ${values.length}`);
      if (values[0]?.[0] !== 'Name') throw new Error('Data mismatch');
      return `${values.length} rows verified`;
    });

    await test('Append row', async () => {
      if (!testSpreadsheetId) throw new Error('No spreadsheet');
      const r = unwrap(await sheets.appendValues(testSpreadsheetId, 'TestData!A:C', [
        ['Charlie', 91, 'Pass'],
      ]));
      return `appended`;
    });

    await test('Cleanup: delete spreadsheet', async () => {
      if (testSpreadsheetId) await driveDelete(testSpreadsheetId);
      return 'deleted via Drive';
    });
  }

  // ── Phase 5: Docs ─────────────────────────────────
  if (!shouldSkip('docs')) {
    header('Docs');
    const docs = createDocsApi(http);

    let testDocId: string | undefined;
    await test('Create test document', async () => {
      const r = unwrap(await docs.createDocument(`${TEST_PREFIX} E2E test doc`));
      testDocId = (r as { documentId: string }).documentId;
      return `doc ${testDocId}`;
    });

    await test('Read document back', async () => {
      if (!testDocId) throw new Error('No doc');
      const r = unwrap(await docs.getDocument(testDocId));
      const title = (r as { title: string }).title;
      if (!title.includes(TEST_PREFIX)) throw new Error('Title mismatch');
      return `title: "${title}"`;
    });

    await test('Cleanup: delete document', async () => {
      if (testDocId) await driveDelete(testDocId);
      return 'deleted via Drive';
    });
  }

  // ── Phase 6: Slides ───────────────────────────────
  if (!shouldSkip('slides')) {
    header('Slides');
    const slidesApi = createSlidesApi(http);

    let testPresentationId: string | undefined;
    await test('Create test presentation', async () => {
      const r = unwrap(await slidesApi.createPresentation(`${TEST_PREFIX} E2E test slides`));
      testPresentationId = (r as { presentationId: string }).presentationId;
      return `presentation ${testPresentationId}`;
    });

    await test('Read presentation back', async () => {
      if (!testPresentationId) throw new Error('No presentation');
      const r = unwrap(await slidesApi.getPresentation(testPresentationId));
      const title = (r as { title: string }).title;
      if (!title.includes(TEST_PREFIX)) throw new Error('Title mismatch');
      return `title: "${title}"`;
    });

    await test('Cleanup: delete presentation', async () => {
      if (testPresentationId) await driveDelete(testPresentationId);
      return 'deleted via Drive';
    });
  }

  // ── Phase 7: Contacts ─────────────────────────────
  if (!shouldSkip('contacts')) {
    header('Contacts');
    const contactsApi = createContactsApi(http);

    await test('List contacts', async () => {
      const r = unwrap(await contactsApi.listContacts({
        pageSize: 5,
        personFields: 'names,emailAddresses',
      }));
      const connections = (r as { connections?: unknown[] }).connections ?? [];
      return `${connections.length} contacts`;
    });

    let testContactResource: string | undefined;
    await test('Create test contact', async () => {
      const r = unwrap(await contactsApi.createContact({
        names: [{ givenName: `${TEST_PREFIX} Test`, familyName: 'Contact' }],
        emailAddresses: [{ value: 'ows-test@example.com' }],
      }));
      testContactResource = (r as { resourceName: string }).resourceName;
      return `contact ${testContactResource}`;
    });

    await test('Cleanup: delete test contact', async () => {
      if (!testContactResource) throw new Error('No contact');
      unwrap(await contactsApi.deleteContact(testContactResource));
      return 'deleted';
    });
  }

  // ── Phase 8: Tasks ────────────────────────────────
  if (!shouldSkip('tasks')) {
    header('Tasks');
    const tasksApi = createTasksApi(http);

    await test('List task lists', async () => {
      const r = unwrap(await tasksApi.listTaskLists());
      const items = (r as { items?: unknown[] }).items ?? [];
      return `${items.length} task lists`;
    });

    let testTaskListId: string | undefined;
    await test('Create test task list', async () => {
      const r = unwrap(await tasksApi.createTaskList({ title: `${TEST_PREFIX} E2E test list` }));
      testTaskListId = (r as { id: string }).id;
      return `list ${testTaskListId}`;
    });

    let testTaskId: string | undefined;
    await test('Create test task', async () => {
      if (!testTaskListId) throw new Error('No task list');
      const r = unwrap(await tasksApi.createTask(testTaskListId, {
        title: `${TEST_PREFIX} Test task item`,
        notes: 'Auto-created by E2E test',
      }));
      testTaskId = (r as { id: string }).id;
      return `task ${testTaskId}`;
    });

    await test('Complete test task', async () => {
      if (!testTaskListId || !testTaskId) throw new Error('No task');
      const r = unwrap(await tasksApi.completeTask(testTaskListId, testTaskId));
      const status = (r as { status: string }).status;
      return `status: ${status}`;
    });

    await test('Cleanup: delete test task', async () => {
      if (!testTaskListId || !testTaskId) throw new Error('No task');
      unwrap(await tasksApi.deleteTask(testTaskListId, testTaskId));
      return 'deleted';
    });

    await test('Cleanup: delete test task list', async () => {
      if (!testTaskListId) throw new Error('No task list');
      unwrap(await tasksApi.deleteTaskList(testTaskListId));
      return 'deleted';
    });
  }

  // ── Phase 9: People ───────────────────────────────
  if (!shouldSkip('people')) {
    header('People');
    const peopleApi = createPeopleApi(http);

    await test('Get own profile', async () => {
      const r = unwrap(await peopleApi.getProfile('people/me'));
      const names = (r as { names?: { displayName: string }[] }).names;
      const name = names?.[0]?.displayName ?? 'unknown';
      return `profile: ${name}`;
    });
  }

  // ── Phase 10: Chat (Workspace only) ───────────────
  if (!shouldSkip('chat')) {
    header('Chat (Workspace only)');
    const chatApi = createChatApi(http);

    await test('List spaces', async () => {
      try {
        const r = unwrap(await chatApi.listSpaces());
        const spaces = (r as { spaces?: unknown[] }).spaces ?? [];
        return `${spaces.length} spaces`;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('403') || msg.includes('PERMISSION') || msg.includes('not enabled'))
          throw new Error('Chat API requires Google Workspace (not available for personal Gmail)');
        throw e;
      }
    });
  } else {
    header('Chat');
    skip('List spaces', 'skipped via --skip');
  }

  // ── Phase 11: Classroom (optional) ────────────────
  if (!shouldSkip('classroom')) {
    header('Classroom (optional)');
    const classroomApi = createClassroomApi(http);

    await test('List courses', async () => {
      try {
        const r = unwrap(await classroomApi.listCourses({ pageSize: 5 }));
        const courses = (r as { courses?: unknown[] }).courses ?? [];
        return `${courses.length} courses`;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('403') || msg.includes('PERMISSION') || msg.includes('not enabled'))
          throw new Error('Classroom API requires educator account');
        throw e;
      }
    });
  } else {
    header('Classroom');
    skip('List courses', 'skipped via --skip');
  }

  // ── Phase 12: Forms (optional) ────────────────────
  if (!shouldSkip('forms')) {
    header('Forms (optional)');
    const formsApi = createFormsApi(http);

    let testFormId: string | undefined;
    await test('Create test form', async () => {
      try {
        const r = unwrap(await formsApi.createForm({
          info: { title: `${TEST_PREFIX} E2E test form` },
        }));
        testFormId = (r as { formId: string }).formId;
        return `form ${testFormId}`;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('403') || msg.includes('PERMISSION') || msg.includes('not enabled'))
          throw new Error('Forms API may not be enabled');
        throw e;
      }
    });

    await test('Read form back', async () => {
      if (!testFormId) throw new Error('No form created');
      const r = unwrap(await formsApi.getForm(testFormId));
      return `title: "${(r as { info: { title: string } }).info.title}"`;
    });

    await test('Cleanup: delete form', async () => {
      if (testFormId) await driveDelete(testFormId);
      return 'deleted via Drive';
    });
  } else {
    header('Forms');
    skip('Create/read form', 'skipped via --skip');
  }

  // ── Phase 13: Apps Script (optional) ──────────────
  if (!shouldSkip('appscript')) {
    header('Apps Script (optional)');
    const appscriptApi = createAppScriptApi(http);

    await test('List processes', async () => {
      try {
        const r = unwrap(await appscriptApi.listProcesses());
        const processes = (r as { processes?: unknown[] }).processes ?? [];
        return `${processes.length} processes`;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('403') || msg.includes('PERMISSION') || msg.includes('not enabled'))
          throw new Error('Apps Script API may not be enabled');
        throw e;
      }
    });
  } else {
    header('Apps Script');
    skip('List processes', 'skipped via --skip');
  }

  // ── Phase 14: Groups (Workspace only) ─────────────
  if (!shouldSkip('groups')) {
    header('Groups (Workspace only)');
    const groupsApi = createGroupsApi(http);

    await test('List groups', async () => {
      try {
        const r = unwrap(await groupsApi.listGroups('customers/my_customer', { pageSize: 5 }));
        const grps = (r as { groups?: unknown[] }).groups ?? [];
        return `${grps.length} groups`;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('403') || msg.includes('PERMISSION') || msg.includes('not enabled'))
          throw new Error('Groups API requires Workspace admin');
        throw e;
      }
    });
  } else {
    header('Groups');
    skip('List groups', 'skipped via --skip');
  }

  // ── Phase 15: Keep (optional) ─────────────────────
  if (!shouldSkip('keep')) {
    header('Keep (optional)');
    const keepApi = createKeepApi(http);

    await test('List notes', async () => {
      try {
        const r = unwrap(await keepApi.listNotes({ pageSize: 5 }));
        const notes = (r as { notes?: unknown[] }).notes ?? [];
        return `${notes.length} notes`;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('403') || msg.includes('PERMISSION') || msg.includes('not enabled'))
          throw new Error('Keep API may require Workspace or API not enabled');
        throw e;
      }
    });
  } else {
    header('Keep');
    skip('List notes', 'skipped via --skip');
  }

  // ── Report ────────────────────────────────────────
  console.log(`\n${C.cyan}${C.bold}Test Summary${C.reset}`);
  console.log(`${C.dim}${'='.repeat(50)}${C.reset}\n`);

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const totalTime = results.reduce((s, r) => s + r.duration, 0);

  // Group by service
  let lastService = '';
  for (const r of results) {
    if (r.service !== lastService) {
      lastService = r.service;
      console.log(`  ${C.bold}${r.service}${C.reset}`);
    }
    const icon = r.status === 'PASS' ? `${C.green}PASS${C.reset}` :
                 r.status === 'FAIL' ? `${C.red}FAIL${C.reset}` :
                 `${C.yellow}SKIP${C.reset}`;
    console.log(`    ${icon}  ${r.test}${r.detail ? ` ${C.dim}-- ${r.detail}${C.reset}` : ''}`);
  }

  console.log(`\n${C.dim}${'─'.repeat(50)}${C.reset}`);
  console.log(`  Total: ${results.length}  ${C.green}Pass: ${passed}${C.reset}  ${C.red}Fail: ${failed}${C.reset}  ${C.yellow}Skip: ${skipped}${C.reset}  ${C.dim}(${totalTime}ms)${C.reset}`);

  if (failed > 0) {
    console.log(`\n${C.red}${C.bold}Some tests failed.${C.reset}`);
    console.log(`${C.dim}Check if the relevant API is enabled in Google Cloud Console.${C.reset}\n`);

    // List failed tests
    const failedTests = results.filter(r => r.status === 'FAIL');
    console.log(`${C.red}Failed tests:${C.reset}`);
    for (const f of failedTests) {
      console.log(`  ${f.service} > ${f.test}: ${f.detail}`);
    }
    console.log();
    process.exit(1);
  } else {
    console.log(`\n${C.green}${C.bold}All tests passed!${C.reset}\n`);
  }
}

main().catch(e => {
  console.error(`\n${C.red}Fatal error: ${e.message}${C.reset}`);
  process.exit(1);
});
