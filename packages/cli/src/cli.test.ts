import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mock variables (accessible inside vi.mock factories) ───

const {
  mockListAccounts,
  mockGetToken,
  mockIsTokenValid,
  mockBrowserFlow,
  mockHeadlessFlow,
  mockDeviceCodeFlow,
  mockStoreRemove,
  mockConfigSave,
  mockConfigGet,
  mockConfigSet,
  mockConfigGetAll,
  mockConfigList,
  mockConfigGetPath,
  mockHttpInterceptors,
  mockToolRegistryList,
  mockParseYaml,
  mockExecutePipeline,
  mockCreateBuiltinActions,
  mockGmailApi,
  mockCalendarApi,
  mockDriveApi,
  mockSheetsApi,
  mockDocsApi,
  mockSlidesApi,
  mockContactsApi,
  mockTasksApi,
  mockChatApi,
  mockClassroomApi,
  mockFormsApi,
  mockAppScriptApi,
  mockPeopleApi,
  mockGroupsApi,
  mockKeepApi,
  mockParseArgs,
} = vi.hoisted(() => {
  const mockListAccounts = vi.fn();
  const mockGetToken = vi.fn();
  const mockIsTokenValid = vi.fn();
  const mockBrowserFlow = vi.fn();
  const mockHeadlessFlow = vi.fn();
  const mockDeviceCodeFlow = vi.fn();
  const mockStoreRemove = vi.fn();
  const mockConfigSave = vi.fn();
  const mockConfigGet = vi.fn();
  const mockConfigSet = vi.fn();
  const mockConfigGetAll = vi.fn();
  const mockConfigList = vi.fn();
  const mockConfigGetPath = vi.fn();
  const mockHttpInterceptors = { request: [] as unknown[] };
  const mockToolRegistryList = vi.fn();
  const mockParseYaml = vi.fn();
  const mockExecutePipeline = vi.fn();
  const mockCreateBuiltinActions = vi.fn();

  const mockGmailApi = {
    searchMessages: vi.fn(),
    getThread: vi.fn(),
    sendMessage: vi.fn(),
    listLabels: vi.fn(),
    listDrafts: vi.fn(),
  };
  const mockCalendarApi = {
    listEvents: vi.fn(),
    createEvent: vi.fn(),
    queryFreeBusy: vi.fn(),
  };
  const mockDriveApi = {
    listFiles: vi.fn(),
    searchFiles: vi.fn(),
    uploadFile: vi.fn(),
    downloadFile: vi.fn(),
  };
  const mockSheetsApi = {
    getValues: vi.fn(),
    updateValues: vi.fn(),
    createSpreadsheet: vi.fn(),
  };
  const mockDocsApi = {
    getDocument: vi.fn(),
    createDocument: vi.fn(),
    exportDocument: vi.fn(),
  };
  const mockSlidesApi = {
    getPresentation: vi.fn(),
    createPresentation: vi.fn(),
    exportPresentation: vi.fn(),
  };
  const mockContactsApi = {
    listContacts: vi.fn(),
    searchContacts: vi.fn(),
    createContact: vi.fn(),
  };
  const mockTasksApi = {
    listTaskLists: vi.fn(),
    listTasks: vi.fn(),
    createTask: vi.fn(),
    completeTask: vi.fn(),
  };
  const mockChatApi = {
    listSpaces: vi.fn(),
    listMessages: vi.fn(),
    sendMessage: vi.fn(),
  };
  const mockClassroomApi = {
    listCourses: vi.fn(),
    listStudents: vi.fn(),
    listCourseWork: vi.fn(),
  };
  const mockFormsApi = {
    getForm: vi.fn(),
    listResponses: vi.fn(),
  };
  const mockAppScriptApi = {
    getProject: vi.fn(),
    runFunction: vi.fn(),
  };
  const mockPeopleApi = {
    getProfile: vi.fn(),
    searchProfiles: vi.fn(),
  };
  const mockGroupsApi = {
    listGroups: vi.fn(),
    listMembers: vi.fn(),
  };
  const mockKeepApi = {
    listNotes: vi.fn(),
    getNote: vi.fn(),
  };
  const mockParseArgs = vi.fn();

  return {
    mockListAccounts,
    mockGetToken,
    mockIsTokenValid,
    mockBrowserFlow,
    mockHeadlessFlow,
    mockDeviceCodeFlow,
    mockStoreRemove,
    mockConfigSave,
    mockConfigGet,
    mockConfigSet,
    mockConfigGetAll,
    mockConfigList,
    mockConfigGetPath,
    mockHttpInterceptors,
    mockToolRegistryList,
    mockParseYaml,
    mockExecutePipeline,
    mockCreateBuiltinActions,
    mockGmailApi,
    mockCalendarApi,
    mockDriveApi,
    mockSheetsApi,
    mockDocsApi,
    mockSlidesApi,
    mockContactsApi,
    mockTasksApi,
    mockChatApi,
    mockClassroomApi,
    mockFormsApi,
    mockAppScriptApi,
    mockPeopleApi,
    mockGroupsApi,
    mockKeepApi,
    mockParseArgs,
  };
});

// ── Mock all external dependencies ─────────────────────────────────

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  copyFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from('file-content')),
  writeFile: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return {
    ...actual,
    resolve: vi.fn((p: string) => p),
    join: vi.fn((...args: string[]) => args.join('/')),
    basename: vi.fn((p: string) => {
      const parts = p.split(/[/\\]/);
      return parts[parts.length - 1] ?? p;
    }),
  };
});

vi.mock('@openworkspace/core', () => ({
  createAuthEngine: vi.fn(() => ({
    listAccounts: mockListAccounts,
    getToken: mockGetToken,
    isTokenValid: mockIsTokenValid,
    browserFlow: mockBrowserFlow,
    headlessFlow: mockHeadlessFlow,
    deviceCodeFlow: mockDeviceCodeFlow,
  })),
  loadCredentialsFile: vi.fn().mockResolvedValue({
    ok: true,
    value: { clientId: 'test-client-id', clientSecret: 'test-secret' },
  }),
  createTokenStore: vi.fn(() => ({
    remove: mockStoreRemove,
  })),
  createConfigStore: vi.fn().mockResolvedValue({
    save: mockConfigSave,
    get: mockConfigGet,
    set: mockConfigSet,
    getAll: mockConfigGetAll,
    list: mockConfigList,
    getPath: mockConfigGetPath,
  }),
  createHttpClient: vi.fn(() => ({
    interceptors: mockHttpInterceptors,
    get: vi.fn(),
    post: vi.fn(),
  })),
  createMemoryTokenStore: vi.fn(),
  createServiceAccountAuth: vi.fn(),
  loadServiceAccountKey: vi.fn(),
  getDefaultConfigDir: vi.fn(() => '/mock/config'),
  getScopeDescription: vi.fn(),
  SCOPES: {
    GMAIL: { MODIFY: 'https://www.googleapis.com/auth/gmail.modify' },
    CALENDAR: { FULL: 'https://www.googleapis.com/auth/calendar' },
    DRIVE: { FULL: 'https://www.googleapis.com/auth/drive' },
    SHEETS: { FULL: 'https://www.googleapis.com/auth/spreadsheets' },
    DOCS: { FULL: 'https://www.googleapis.com/auth/documents' },
    SLIDES: { FULL: 'https://www.googleapis.com/auth/presentations' },
    CONTACTS: { FULL: 'https://www.googleapis.com/auth/contacts' },
    TASKS: { FULL: 'https://www.googleapis.com/auth/tasks' },
    CHAT: { SPACES: 'https://www.googleapis.com/auth/chat.spaces', MESSAGES: 'https://www.googleapis.com/auth/chat.messages' },
    CLASSROOM: { COURSES: 'https://www.googleapis.com/auth/classroom.courses', ROSTERS_READONLY: 'https://www.googleapis.com/auth/classroom.rosters.readonly' },
    FORMS: { FULL: 'https://www.googleapis.com/auth/forms.body', RESPONSES_READONLY: 'https://www.googleapis.com/auth/forms.responses.readonly' },
    APPSCRIPT: { PROJECTS: 'https://www.googleapis.com/auth/script.projects' },
    PEOPLE: { READONLY: 'https://www.googleapis.com/auth/contacts.readonly' },
    GROUPS: { READONLY: 'https://www.googleapis.com/auth/cloud-identity.groups.readonly' },
    KEEP: { FULL: 'https://www.googleapis.com/auth/keep' },
  },
  ok: (v: unknown) => ({ ok: true, value: v }),
  err: (e: unknown) => ({ ok: false, error: e }),
  ValidationError: class ValidationError extends Error {
    constructor(msg: string) { super(msg); this.name = 'ValidationError'; }
  },
}));

vi.mock('@openworkspace/mcp', () => ({
  createToolRegistry: vi.fn(() => ({
    list: mockToolRegistryList,
  })),
}));

vi.mock('@openworkspace/pipeline', () => ({
  parseYaml: (...args: unknown[]) => mockParseYaml(...args),
  executePipeline: (...args: unknown[]) => mockExecutePipeline(...args),
  createBuiltinActions: (...args: unknown[]) => mockCreateBuiltinActions(...args),
}));

vi.mock('@openworkspace/gmail', () => ({
  createGmailApi: vi.fn(() => mockGmailApi),
}));

vi.mock('@openworkspace/calendar', () => ({
  calendar: vi.fn(() => mockCalendarApi),
}));

vi.mock('@openworkspace/drive', () => ({
  createDriveApi: vi.fn(() => mockDriveApi),
}));

vi.mock('@openworkspace/sheets', () => ({
  createSheetsApi: vi.fn(() => mockSheetsApi),
}));

vi.mock('@openworkspace/docs', () => ({
  createDocsApi: vi.fn(() => mockDocsApi),
}));

vi.mock('@openworkspace/slides', () => ({
  slides: vi.fn(() => mockSlidesApi),
}));

vi.mock('@openworkspace/contacts', () => ({
  contacts: vi.fn(() => mockContactsApi),
}));

vi.mock('@openworkspace/tasks', () => ({
  tasks: vi.fn(() => mockTasksApi),
}));

vi.mock('@openworkspace/chat', () => ({
  chat: vi.fn(() => mockChatApi),
}));

vi.mock('@openworkspace/classroom', () => ({
  classroom: vi.fn(() => mockClassroomApi),
}));

vi.mock('@openworkspace/forms', () => ({
  createFormsApi: vi.fn(() => mockFormsApi),
}));

vi.mock('@openworkspace/appscript', () => ({
  appscript: vi.fn(() => mockAppScriptApi),
}));

vi.mock('@openworkspace/people', () => ({
  people: vi.fn(() => mockPeopleApi),
}));

vi.mock('@openworkspace/groups', () => ({
  groups: vi.fn(() => mockGroupsApi),
}));

vi.mock('@openworkspace/keep', () => ({
  keep: vi.fn(() => mockKeepApi),
}));

vi.mock('./parser.js', async () => {
  const actual = await vi.importActual<typeof import('./parser.js')>('./parser.js');
  return {
    ...actual,
    parseArgs: (...args: unknown[]) => {
      if (mockParseArgs.getMockImplementation()) {
        return mockParseArgs(...args);
      }
      return actual.parseArgs(...(args as Parameters<typeof actual.parseArgs>));
    },
  };
});

// ── Imports (after mocks are set up) ───────────────────────────────

import { main, getAuthenticatedClient, createSubcommandDispatcher } from './cli.js';
import { loadCredentialsFile } from '@openworkspace/core';
import * as fs from 'fs/promises';

// ── Helpers ─────────────────────────────────────────────────────────

function setupAuthSuccess() {
  (loadCredentialsFile as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    value: { clientId: 'test-client-id', clientSecret: 'test-secret' },
  });
  mockListAccounts.mockResolvedValue({ ok: true, value: ['user@example.com'] });
  mockGetToken.mockResolvedValue({ ok: true, value: 'mock-access-token' });
  mockHttpInterceptors.request = [];
}

function setupAuthNoCredentials() {
  (loadCredentialsFile as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: false,
    error: { message: 'File not found' },
  });
}

function setupAuthTokenFailure() {
  (loadCredentialsFile as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    value: { clientId: 'test-client-id', clientSecret: 'test-secret' },
  });
  mockListAccounts.mockResolvedValue({ ok: true, value: ['user@example.com'] });
  mockGetToken.mockResolvedValue({
    ok: false,
    error: { message: 'Token expired and refresh failed' },
  });
}

/** Set process.argv so main() sees the given CLI tokens. */
function setArgs(...tokens: string[]) {
  process.argv = ['node', 'ows', ...tokens];
}

// ── Tests ──────────────────────────────────────────────────────────

describe('cli', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let savedArgv: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['NODE_ENV'] = 'test';
    savedArgv = process.argv;
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockHttpInterceptors.request = [];
    setupAuthSuccess();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.argv = savedArgv;
  });

  // ── getAuthenticatedClient ──────────────────────────────────────

  describe('getAuthenticatedClient', () => {
    it('should return an authenticated client when credentials and token exist', async () => {
      setupAuthSuccess();
      const result = await getAuthenticatedClient();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.account).toBe('user@example.com');
        expect(result.value.http).toBeDefined();
      }
    });

    it('should return error when no credentials are found', async () => {
      setupAuthNoCredentials();
      const result = await getAuthenticatedClient();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('No credentials found');
      }
    });

    it('should return error when no accounts exist', async () => {
      (loadCredentialsFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: { clientId: 'id', clientSecret: 'secret' },
      });
      mockListAccounts.mockResolvedValue({ ok: true, value: [] });
      const result = await getAuthenticatedClient();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('No authorized accounts');
      }
    });

    it('should return error when listAccounts fails', async () => {
      (loadCredentialsFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: { clientId: 'id', clientSecret: 'secret' },
      });
      mockListAccounts.mockResolvedValue({
        ok: false,
        error: { message: 'Store read error' },
      });
      const result = await getAuthenticatedClient();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('Store read error');
      }
    });

    it('should return error when token retrieval fails', async () => {
      setupAuthTokenFailure();
      const result = await getAuthenticatedClient();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Token expired');
      }
    });

    it('should use the provided account email directly', async () => {
      setupAuthSuccess();
      const result = await getAuthenticatedClient('specific@example.com');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.account).toBe('specific@example.com');
      }
      expect(mockListAccounts).not.toHaveBeenCalled();
    });

    it('should attach a request interceptor that adds the Authorization header', async () => {
      setupAuthSuccess();
      const result = await getAuthenticatedClient();
      expect(result.ok).toBe(true);
      // The interceptor was pushed to mockHttpInterceptors.request
      expect(mockHttpInterceptors.request.length).toBe(1);
      const interceptor = mockHttpInterceptors.request[0] as (url: string, config: Record<string, unknown>) => unknown;
      const output = interceptor('https://example.com', { headers: { 'X-Custom': 'yes' } });
      expect(output).toEqual({
        url: 'https://example.com',
        config: {
          headers: {
            'X-Custom': 'yes',
            Authorization: 'Bearer mock-access-token',
          },
        },
      });
    });
  });

  // ── createSubcommandDispatcher ──────────────────────────────────

  describe('createSubcommandDispatcher', () => {
    it('should dispatch to matching subcommand', async () => {
      const handler = vi.fn().mockResolvedValue(0);
      const dispatcher = createSubcommandDispatcher('test', [
        { name: 'sub1', description: 'Subcommand 1', handler },
      ]);
      const code = await dispatcher({ _: ['sub1', 'arg1'], flags: {}, raw: [] });
      expect(code).toBe(0);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ _: ['arg1'] }),
      );
    });

    it('should show usage when no matching subcommand', async () => {
      const dispatcher = createSubcommandDispatcher('test', [
        { name: 'sub1', description: 'Subcommand 1', handler: vi.fn() },
      ]);
      const code = await dispatcher({ _: ['unknown'], flags: {}, raw: [] });
      expect(code).toBe(1);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: ows test'));
    });

    it('should show usage when no subcommand given', async () => {
      const dispatcher = createSubcommandDispatcher('test', [
        { name: 'sub1', description: 'Subcommand 1', handler: vi.fn() },
      ]);
      const code = await dispatcher({ _: [], flags: {}, raw: [] });
      expect(code).toBe(1);
    });
  });

  // ── parseArgs error path ────────────────────────────────────

  describe('parseArgs error handling', () => {
    it('should return 1 and print error when parseArgs fails', async () => {
      mockParseArgs.mockImplementation(() => ({
        ok: false,
        error: { message: 'Unknown option --bad' },
      }));
      setArgs('--bad');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Unknown option --bad');
      mockParseArgs.mockImplementation(undefined as never);
    });
  });

  // ── Global flags ────────────────────────────────────────────────

  describe('global flags', () => {
    it('--version should output version 0.1.0', async () => {
      setArgs('--version');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('0.1.0');
    });

    it('-v should output version 0.1.0', async () => {
      setArgs('-v');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('0.1.0');
    });

    it('--help with no command should show help', async () => {
      setArgs('--help');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalled();
    });

    it('no args should show help', async () => {
      setArgs();
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalled();
    });

    it('unknown command should return 1', async () => {
      setArgs('nonexistent');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Unknown command: nonexistent');
    });

    it('--help with a command should show command help', async () => {
      setArgs('gmail', '--help');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalled();
    });
  });

  // ── Auth commands ───────────────────────────────────────────────

  describe('auth credentials', () => {
    it('should copy credentials file and show success', async () => {
      (loadCredentialsFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: { clientId: 'my-client-id', clientSecret: 'secret' },
      });

      setArgs('auth', 'credentials', '/path/to/creds.json');
      const code = await main();
      expect(code).toBe(0);
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.copyFile).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Credentials stored'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('my-client-id'));
    });

    it('should return error when file path is missing', async () => {
      setArgs('auth', 'credentials');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Credentials file path is required');
    });

    it('should return error when credentials file is invalid', async () => {
      (loadCredentialsFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: { message: 'Invalid credentials format' },
      });

      setArgs('auth', 'credentials', '/bad/creds.json');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Invalid credentials format');
    });
  });

  describe('auth add', () => {
    it('should authorize via browser flow by default', async () => {
      setupAuthSuccess();
      mockBrowserFlow.mockResolvedValue({ ok: true, value: {} });

      setArgs('auth', 'add', 'test@example.com');
      const code = await main();
      expect(code).toBe(0);
      expect(mockBrowserFlow).toHaveBeenCalledWith('test@example.com');
      expect(logSpy).toHaveBeenCalledWith('Account test@example.com authorized successfully.');
    });

    it('should return error when email is missing', async () => {
      setArgs('auth', 'add');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Account email is required');
    });

    it('should handle device code flow', async () => {
      const mockPoll = vi.fn().mockResolvedValue({ ok: true, value: {} });
      mockDeviceCodeFlow.mockResolvedValue({
        ok: true,
        value: {
          verificationUrl: 'https://google.com/device',
          userCode: 'ABCD-1234',
          poll: mockPoll,
        },
      });
      setupAuthSuccess();

      setArgs('auth', 'add', 'user@test.com', '--device');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('Go to: https://google.com/device');
      expect(logSpy).toHaveBeenCalledWith('Enter code: ABCD-1234');
      expect(logSpy).toHaveBeenCalledWith('Account user@test.com authorized successfully.');
    });

    it('should handle headless flow', async () => {
      mockHeadlessFlow.mockResolvedValue({
        ok: true,
        value: { authUrl: 'https://accounts.google.com/auth?code=xyz' },
      });
      setupAuthSuccess();

      setArgs('auth', 'add', 'user@test.com', '--headless');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://accounts.google.com/auth?code=xyz'),
      );
    });

    it('should handle browser flow failure', async () => {
      setupAuthSuccess();
      mockBrowserFlow.mockResolvedValue({
        ok: false,
        error: { message: 'Browser launch failed' },
      });

      setArgs('auth', 'add', 'user@test.com');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Browser launch failed');
    });

    it('should handle device code flow failure', async () => {
      mockDeviceCodeFlow.mockResolvedValue({
        ok: false,
        error: { message: 'Device code error' },
      });
      setupAuthSuccess();

      setArgs('auth', 'add', 'user@test.com', '--device');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Device code error');
    });

    it('should handle device code poll failure', async () => {
      const mockPoll = vi.fn().mockResolvedValue({ ok: false, error: { message: 'Poll timed out' } });
      mockDeviceCodeFlow.mockResolvedValue({
        ok: true,
        value: { verificationUrl: 'https://google.com/device', userCode: 'ABCD', poll: mockPoll },
      });
      setupAuthSuccess();

      setArgs('auth', 'add', 'user@test.com', '--device');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Poll timed out');
    });

    it('should handle headless flow failure', async () => {
      mockHeadlessFlow.mockResolvedValue({
        ok: false,
        error: { message: 'Headless error' },
      });
      setupAuthSuccess();

      setArgs('auth', 'add', 'user@test.com', '--headless');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Headless error');
    });

    it('should error when no credentials for auth add', async () => {
      setupAuthNoCredentials();

      setArgs('auth', 'add', 'user@test.com');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No credentials found'));
    });
  });

  describe('auth list', () => {
    it('should list authorized accounts', async () => {
      setupAuthSuccess();
      mockListAccounts.mockResolvedValue({
        ok: true,
        value: ['user1@example.com', 'user2@example.com'],
      });

      setArgs('auth', 'list');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('Authorized Accounts:\n');
      expect(logSpy).toHaveBeenCalledWith('  user1@example.com');
      expect(logSpy).toHaveBeenCalledWith('  user2@example.com');
    });

    it('should output JSON format when --json flag', async () => {
      setupAuthSuccess();
      mockListAccounts.mockResolvedValue({ ok: true, value: ['user@test.com'] });
      mockIsTokenValid.mockResolvedValue({ ok: true, value: true });

      setArgs('auth', 'list', '--json');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('"account": "user@test.com"'),
      );
    });

    it('should show check status when --check flag', async () => {
      setupAuthSuccess();
      mockListAccounts.mockResolvedValue({ ok: true, value: ['user@test.com'] });
      mockIsTokenValid.mockResolvedValue({ ok: true, value: true });

      setArgs('auth', 'list', '--check');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('  user@test.com [valid]');
    });

    it('should show empty message when no credentials', async () => {
      setupAuthNoCredentials();

      setArgs('auth', 'list');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No credentials configured'));
    });

    it('should show empty JSON when no credentials and --json', async () => {
      setupAuthNoCredentials();

      setArgs('auth', 'list', '--json');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ accounts: [] }));
    });

    it('should show empty message when no accounts', async () => {
      setupAuthSuccess();
      mockListAccounts.mockResolvedValue({ ok: true, value: [] });

      setArgs('auth', 'list');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No authorized accounts'));
    });

    it('should show empty JSON when no accounts and --json', async () => {
      setupAuthSuccess();
      mockListAccounts.mockResolvedValue({ ok: true, value: [] });

      setArgs('auth', 'list', '--json');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ accounts: [] }));
    });

    it('should error when listAccounts fails', async () => {
      setupAuthSuccess();
      mockListAccounts.mockResolvedValue({ ok: false, error: { message: 'Store error' } });

      setArgs('auth', 'list');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Store error');
    });
  });

  describe('auth remove', () => {
    it('should remove an account', async () => {
      mockStoreRemove.mockResolvedValue({ ok: true, value: undefined });

      setArgs('auth', 'remove', 'user@test.com');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('Account user@test.com removed.');
    });

    it('should error when email is missing', async () => {
      setArgs('auth', 'remove');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Account email is required');
    });

    it('should error when remove fails', async () => {
      mockStoreRemove.mockResolvedValue({
        ok: false,
        error: { message: 'Account not found' },
      });

      setArgs('auth', 'remove', 'user@test.com');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Account not found');
    });
  });

  describe('auth status', () => {
    it('should show status with credentials configured', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      setArgs('auth', 'status');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('configured'));
    });

    it('should show status with no credentials', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));

      setArgs('auth', 'status');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('Credentials: not configured');
    });

    it('should output JSON when --json flag', async () => {
      (fs.access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      setArgs('auth', 'status', '--json');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('"credentialsConfigured":true'),
      );
    });
  });

  describe('auth subcommand help', () => {
    it('should show auth usage when no subcommand given', async () => {
      setArgs('auth');
      const code = await main();
      expect(code).toBe(1);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: ows auth'));
    });
  });

  // ── Config commands ─────────────────────────────────────────────

  describe('config path', () => {
    it('should display config path', async () => {
      mockConfigGetPath.mockReturnValue('/mock/config/ows.json5');

      setArgs('config', 'path');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('/mock/config/ows.json5');
    });
  });

  describe('config list', () => {
    it('should list config values', async () => {
      mockConfigList.mockReturnValue(['key1', 'key2']);
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'key1') return 'value1';
        if (key === 'key2') return 42;
        return undefined;
      });

      setArgs('config', 'list');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('key1 = "value1"');
      expect(logSpy).toHaveBeenCalledWith('key2 = 42');
    });

    it('should list config values as JSON', async () => {
      mockConfigGetAll.mockReturnValue({ key1: 'value1' });

      setArgs('config', 'list', '--json');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"key1": "value1"'));
    });
  });

  describe('config get', () => {
    it('should get a config value', async () => {
      mockConfigGet.mockReturnValue('the-value');

      setArgs('config', 'get', 'myKey');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('"the-value"');
    });

    it('should error when key is missing', async () => {
      setArgs('config', 'get');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Configuration key is required');
    });

    it('should error when key not found', async () => {
      mockConfigGet.mockReturnValue(undefined);

      setArgs('config', 'get', 'missing');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Configuration key not found: missing');
    });

    it('should output JSON when --json flag', async () => {
      mockConfigGet.mockReturnValue('val');

      setArgs('config', 'get', 'myKey', '--json');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"myKey"'));
    });
  });

  describe('config set', () => {
    it('should set a config value', async () => {
      mockConfigSave.mockResolvedValue({ ok: true });

      setArgs('config', 'set', 'theme', '"dark"');
      const code = await main();
      expect(code).toBe(0);
      expect(mockConfigSet).toHaveBeenCalled();
      expect(mockConfigSave).toHaveBeenCalled();
    });

    it('should error when key is missing', async () => {
      setArgs('config', 'set');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Configuration key is required');
    });

    it('should error when value is missing', async () => {
      setArgs('config', 'set', 'theme');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Configuration value is required');
    });

    it('should error when save fails', async () => {
      mockConfigSave.mockResolvedValue({ ok: false, error: { message: 'Disk full' } });

      setArgs('config', 'set', 'k', 'v');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error saving config: Disk full');
    });
  });

  // ── MCP commands ────────────────────────────────────────────────

  describe('mcp tools', () => {
    it('should list tools', async () => {
      mockToolRegistryList.mockReturnValue([
        { name: 'tool1', description: 'Tool 1', parameters: {} },
        { name: 'tool2', description: 'Tool 2', parameters: { arg1: { type: 'string', required: true } } },
      ]);

      setArgs('mcp', 'tools');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('Available Tools:\n');
      expect(logSpy).toHaveBeenCalledWith('  tool1');
      expect(logSpy).toHaveBeenCalledWith('  tool2');
    });

    it('should list tools as JSON', async () => {
      mockToolRegistryList.mockReturnValue([{ name: 'tool1', description: 'A', parameters: {} }]);

      setArgs('mcp', 'tools', '--json');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"name": "tool1"'));
    });
  });

  // ── Pipeline commands ───────────────────────────────────────────

  describe('pipeline run', () => {
    it('should run pipeline successfully', async () => {
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('steps:\n  - action: echo');
      mockParseYaml.mockReturnValue({ ok: true, value: { steps: [{ action: 'echo' }] } });
      mockCreateBuiltinActions.mockReturnValue({});
      mockExecutePipeline.mockResolvedValue({ success: true, outputs: { result: 'done' } });

      setArgs('pipeline', 'run', 'pipeline.yaml');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('Pipeline completed successfully');
      expect(logSpy).toHaveBeenCalledWith('  result: "done"');
    });

    it('should error when no file provided', async () => {
      setArgs('pipeline', 'run');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Pipeline file is required');
    });

    it('should error when YAML parsing fails', async () => {
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('bad yaml');
      mockParseYaml.mockReturnValue({ ok: false, error: { message: 'Invalid YAML' } });

      setArgs('pipeline', 'run', 'bad.yaml');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error parsing pipeline: Invalid YAML');
    });

    it('should error when pipeline has no steps', async () => {
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('data: 1');
      mockParseYaml.mockReturnValue({ ok: true, value: { data: 1 } });

      setArgs('pipeline', 'run', 'no-steps.yaml');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Invalid pipeline format');
    });

    it('should handle pipeline execution failure', async () => {
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('steps:\n  - action: fail');
      mockParseYaml.mockReturnValue({ ok: true, value: { steps: [{ action: 'fail' }] } });
      mockCreateBuiltinActions.mockReturnValue({});
      mockExecutePipeline.mockResolvedValue({ success: false, error: 'Step failed', outputs: {} });

      setArgs('pipeline', 'run', 'fail.yaml');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Pipeline failed: Step failed');
    });

    it('should output JSON when --json flag', async () => {
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('steps:\n  - action: echo');
      mockParseYaml.mockReturnValue({ ok: true, value: { steps: [{ action: 'echo' }] } });
      mockCreateBuiltinActions.mockReturnValue({});
      mockExecutePipeline.mockResolvedValue({ success: true, outputs: {} });

      setArgs('pipeline', 'run', 'pipeline.yaml', '--json');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"success": true'));
    });

    it('should handle readFile error', async () => {
      (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT: file not found'));

      setArgs('pipeline', 'run', 'missing.yaml');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: ENOENT: file not found');
    });
  });

  // ── Gmail commands ──────────────────────────────────────────────

  describe('gmail', () => {
    it('search should return messages', async () => {
      setupAuthSuccess();
      mockGmailApi.searchMessages.mockResolvedValue({
        ok: true,
        value: { messages: [{ id: '1', subject: 'Test' }] },
      });

      setArgs('gmail', 'search', 'test query');
      const code = await main();
      expect(code).toBe(0);
      expect(mockGmailApi.searchMessages).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalled();
    });

    it('search should error when query missing', async () => {
      setArgs('gmail', 'search');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Search query is required');
    });

    it('search should handle API error', async () => {
      setupAuthSuccess();
      mockGmailApi.searchMessages.mockResolvedValue({
        ok: false,
        error: { message: 'Gmail API error' },
      });

      setArgs('gmail', 'search', 'test');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Gmail API error');
    });

    it('read should get a thread', async () => {
      setupAuthSuccess();
      mockGmailApi.getThread.mockResolvedValue({
        ok: true,
        value: { id: 'thread1', messages: [] },
      });

      setArgs('gmail', 'read', 'thread1');
      const code = await main();
      expect(code).toBe(0);
      expect(mockGmailApi.getThread).toHaveBeenCalled();
    });

    it('read should error when threadId missing', async () => {
      setArgs('gmail', 'read');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Thread ID is required');
    });

    it('send should send a message', async () => {
      setupAuthSuccess();
      mockGmailApi.sendMessage.mockResolvedValue({
        ok: true,
        value: { id: 'msg1', labelIds: ['SENT'] },
      });

      setArgs('gmail', 'send', '--to', 'a@b.com', '--subject', 'Hi', '--body', 'Hello');
      const code = await main();
      expect(code).toBe(0);
      expect(mockGmailApi.sendMessage).toHaveBeenCalled();
    });

    it('send should error when missing required flags', async () => {
      setArgs('gmail', 'send');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: --to, --subject, and --body are required');
    });

    it('labels should list labels', async () => {
      setupAuthSuccess();
      mockGmailApi.listLabels.mockResolvedValue({
        ok: true,
        value: [{ id: 'INBOX', name: 'INBOX' }],
      });

      setArgs('gmail', 'labels');
      const code = await main();
      expect(code).toBe(0);
      expect(mockGmailApi.listLabels).toHaveBeenCalled();
    });

    it('drafts should list drafts', async () => {
      setupAuthSuccess();
      mockGmailApi.listDrafts.mockResolvedValue({
        ok: true,
        value: { drafts: [{ id: 'd1', message: {} }] },
      });

      setArgs('gmail', 'drafts');
      const code = await main();
      expect(code).toBe(0);
      expect(mockGmailApi.listDrafts).toHaveBeenCalled();
    });

    it('should handle auth failure on search', async () => {
      setupAuthNoCredentials();

      setArgs('gmail', 'search', 'test');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No credentials'));
    });

    it('gmail subcommand help when no subcommand', async () => {
      setArgs('gmail');
      const code = await main();
      expect(code).toBe(1);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: ows gmail'));
    });
  });

  // ── Calendar commands ───────────────────────────────────────────

  describe('calendar', () => {
    it('events should list events', async () => {
      setupAuthSuccess();
      mockCalendarApi.listEvents.mockResolvedValue({
        ok: true,
        value: { items: [{ id: 'e1', summary: 'Meeting' }] },
      });

      setArgs('calendar', 'events');
      const code = await main();
      expect(code).toBe(0);
      expect(mockCalendarApi.listEvents).toHaveBeenCalled();
    });

    it('events should handle --today flag', async () => {
      setupAuthSuccess();
      mockCalendarApi.listEvents.mockResolvedValue({
        ok: true,
        value: { items: [] },
      });

      setArgs('calendar', 'events', '--today');
      const code = await main();
      expect(code).toBe(0);
      expect(mockCalendarApi.listEvents).toHaveBeenCalledWith('primary', expect.objectContaining({
        singleEvents: true,
        orderBy: 'startTime',
        timeMin: expect.any(String),
        timeMax: expect.any(String),
      }));
    });

    it('events should handle --week flag', async () => {
      setupAuthSuccess();
      mockCalendarApi.listEvents.mockResolvedValue({
        ok: true,
        value: { items: [] },
      });

      setArgs('calendar', 'events', '--week');
      const code = await main();
      expect(code).toBe(0);
      expect(mockCalendarApi.listEvents).toHaveBeenCalledWith('primary', expect.objectContaining({
        singleEvents: true,
        orderBy: 'startTime',
        timeMin: expect.any(String),
        timeMax: expect.any(String),
      }));
    });

    it('events should handle custom calendarId', async () => {
      setupAuthSuccess();
      mockCalendarApi.listEvents.mockResolvedValue({
        ok: true,
        value: { items: [] },
      });

      setArgs('calendar', 'events', 'my-cal-id');
      const code = await main();
      expect(code).toBe(0);
      expect(mockCalendarApi.listEvents).toHaveBeenCalledWith('my-cal-id', expect.any(Object));
    });

    it('create should create an event', async () => {
      setupAuthSuccess();
      mockCalendarApi.createEvent.mockResolvedValue({
        ok: true,
        value: { id: 'ev1', summary: 'New Event' },
      });

      setArgs('calendar', 'create', 'primary', '--summary', 'New Event', '--start', '2025-01-01T10:00:00Z', '--end', '2025-01-01T11:00:00Z');
      const code = await main();
      expect(code).toBe(0);
      expect(mockCalendarApi.createEvent).toHaveBeenCalled();
    });

    it('create should error when args missing', async () => {
      setArgs('calendar', 'create');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('--summary, --start, and --end are required'));
    });

    it('freebusy should query free/busy info', async () => {
      setupAuthSuccess();
      mockCalendarApi.queryFreeBusy.mockResolvedValue({
        ok: true,
        value: { calendars: {} },
      });

      setArgs('calendar', 'freebusy', '--calendars', 'primary');
      const code = await main();
      expect(code).toBe(0);
      expect(mockCalendarApi.queryFreeBusy).toHaveBeenCalled();
    });

    it('freebusy should error when --calendars missing', async () => {
      setArgs('calendar', 'freebusy');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: --calendars is required');
    });

    it('freebusy should handle --today flag', async () => {
      setupAuthSuccess();
      mockCalendarApi.queryFreeBusy.mockResolvedValue({
        ok: true,
        value: { calendars: {} },
      });

      setArgs('calendar', 'freebusy', '--calendars', 'primary', '--today');
      const code = await main();
      expect(code).toBe(0);
    });

    it('events should handle API failure', async () => {
      setupAuthSuccess();
      mockCalendarApi.listEvents.mockResolvedValue({
        ok: false,
        error: { message: 'Calendar API error' },
      });

      setArgs('calendar', 'events');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Calendar API error');
    });
  });

  // ── Drive commands ──────────────────────────────────────────────

  describe('drive', () => {
    it('ls should list files', async () => {
      setupAuthSuccess();
      mockDriveApi.listFiles.mockResolvedValue({
        ok: true,
        value: { files: [{ id: 'f1', name: 'file.txt' }] },
      });

      setArgs('drive', 'ls');
      const code = await main();
      expect(code).toBe(0);
      expect(mockDriveApi.listFiles).toHaveBeenCalled();
    });

    it('search should search files', async () => {
      setupAuthSuccess();
      mockDriveApi.searchFiles.mockResolvedValue({
        ok: true,
        value: { files: [{ id: 'f2', name: 'doc.pdf' }] },
      });

      setArgs('drive', 'search', 'budget');
      const code = await main();
      expect(code).toBe(0);
      expect(mockDriveApi.searchFiles).toHaveBeenCalled();
    });

    it('search should error when query missing', async () => {
      setArgs('drive', 'search');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Search query is required');
    });

    it('upload should upload a file', async () => {
      setupAuthSuccess();
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from('content'));
      mockDriveApi.uploadFile.mockResolvedValue({
        ok: true,
        value: { id: 'f3', name: 'upload.txt' },
      });

      setArgs('drive', 'upload', '/path/to/upload.txt');
      const code = await main();
      expect(code).toBe(0);
      expect(mockDriveApi.uploadFile).toHaveBeenCalled();
    });

    it('upload should error when path missing', async () => {
      setArgs('drive', 'upload');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: File path is required');
    });

    it('download should download a file', async () => {
      setupAuthSuccess();
      mockDriveApi.downloadFile.mockResolvedValue({
        ok: true,
        value: 'file-content-here',
      });

      setArgs('drive', 'download', 'f1');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('file-content-here');
    });

    it('download should error when fileId missing', async () => {
      setArgs('drive', 'download');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: File ID is required');
    });

    it('download should write to output file', async () => {
      setupAuthSuccess();
      mockDriveApi.downloadFile.mockResolvedValue({
        ok: true,
        value: 'file-content',
      });

      setArgs('drive', 'download', 'f1', '-o', '/output/file.txt');
      const code = await main();
      expect(code).toBe(0);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('ls should handle API failure', async () => {
      setupAuthSuccess();
      mockDriveApi.listFiles.mockResolvedValue({
        ok: false,
        error: { message: 'Drive API error' },
      });

      setArgs('drive', 'ls');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Drive API error');
    });
  });

  // ── Sheets commands ─────────────────────────────────────────────

  describe('sheets', () => {
    it('get should read values', async () => {
      setupAuthSuccess();
      mockSheetsApi.getValues.mockResolvedValue({
        ok: true,
        value: { values: [['A1', 'B1'], ['A2', 'B2']] },
      });

      setArgs('sheets', 'get', 'sheetId', 'Sheet1!A1:B2');
      const code = await main();
      expect(code).toBe(0);
      expect(mockSheetsApi.getValues).toHaveBeenCalledWith('sheetId', 'Sheet1!A1:B2');
    });

    it('get should error when args missing', async () => {
      setArgs('sheets', 'get');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: spreadsheetId and range are required');
    });

    it('update should write values', async () => {
      setupAuthSuccess();
      mockSheetsApi.updateValues.mockResolvedValue({
        ok: true,
        value: { updatedCells: 4 },
      });

      setArgs('sheets', 'update', 'sheetId', 'Sheet1!A1:B2', '[["X","Y"]]');
      const code = await main();
      expect(code).toBe(0);
      expect(mockSheetsApi.updateValues).toHaveBeenCalled();
    });

    it('update should error when values are invalid JSON', async () => {
      setupAuthSuccess();
      setArgs('sheets', 'update', 'sheetId', 'Sheet1!A1:B2', 'not-json');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: values must be valid JSON (2D array)');
    });

    it('update should error when args missing', async () => {
      setArgs('sheets', 'update');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('spreadsheetId, range, and values are required'));
    });

    it('create should create spreadsheet', async () => {
      setupAuthSuccess();
      mockSheetsApi.createSpreadsheet.mockResolvedValue({
        ok: true,
        value: { spreadsheetId: 'new-id', properties: { title: 'New Sheet' } },
      });

      setArgs('sheets', 'create', 'New Sheet');
      const code = await main();
      expect(code).toBe(0);
      expect(mockSheetsApi.createSpreadsheet).toHaveBeenCalled();
    });

    it('create should error when title missing', async () => {
      setArgs('sheets', 'create');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Spreadsheet title is required');
    });
  });

  // ── Docs commands ───────────────────────────────────────────────

  describe('docs', () => {
    it('get should get a document', async () => {
      setupAuthSuccess();
      mockDocsApi.getDocument.mockResolvedValue({
        ok: true,
        value: { documentId: 'doc1', title: 'My Doc' },
      });

      setArgs('docs', 'get', 'doc1');
      const code = await main();
      expect(code).toBe(0);
      expect(mockDocsApi.getDocument).toHaveBeenCalledWith('doc1');
    });

    it('get should error when documentId missing', async () => {
      setArgs('docs', 'get');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Document ID is required');
    });

    it('create should create a document', async () => {
      setupAuthSuccess();
      mockDocsApi.createDocument.mockResolvedValue({
        ok: true,
        value: { documentId: 'new-doc', title: 'New Doc' },
      });

      setArgs('docs', 'create', 'New Doc');
      const code = await main();
      expect(code).toBe(0);
      expect(mockDocsApi.createDocument).toHaveBeenCalledWith('New Doc');
    });

    it('create should error when title missing', async () => {
      setArgs('docs', 'create');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Document title is required');
    });

    it('export should export a document', async () => {
      setupAuthSuccess();
      mockDocsApi.exportDocument.mockResolvedValue({
        ok: true,
        value: 'exported-content',
      });

      setArgs('docs', 'export', 'doc1', '--format', 'pdf');
      const code = await main();
      expect(code).toBe(0);
      expect(mockDocsApi.exportDocument).toHaveBeenCalled();
    });

    it('export should error when format is unsupported', async () => {
      setArgs('docs', 'export', 'doc1', '--format', 'xyz');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Unsupported format'));
    });

    it('export should error when args missing', async () => {
      setArgs('docs', 'export');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('documentId and --format are required'));
    });

    it('export should write to output file', async () => {
      setupAuthSuccess();
      mockDocsApi.exportDocument.mockResolvedValue({
        ok: true,
        value: 'exported-content',
      });

      setArgs('docs', 'export', 'doc1', '--format', 'pdf', '-o', '/output/doc.pdf');
      const code = await main();
      expect(code).toBe(0);
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  // ── Slides commands ─────────────────────────────────────────────

  describe('slides', () => {
    it('get should get a presentation', async () => {
      setupAuthSuccess();
      mockSlidesApi.getPresentation.mockResolvedValue({
        ok: true,
        value: { presentationId: 'p1', title: 'My Slides' },
      });

      setArgs('slides', 'get', 'p1');
      const code = await main();
      expect(code).toBe(0);
      expect(mockSlidesApi.getPresentation).toHaveBeenCalledWith('p1');
    });

    it('get should error when presentationId missing', async () => {
      setArgs('slides', 'get');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Presentation ID is required');
    });

    it('create should create a presentation', async () => {
      setupAuthSuccess();
      mockSlidesApi.createPresentation.mockResolvedValue({
        ok: true,
        value: { presentationId: 'new-p', title: 'New Pres' },
      });

      setArgs('slides', 'create', 'New Pres');
      const code = await main();
      expect(code).toBe(0);
      expect(mockSlidesApi.createPresentation).toHaveBeenCalledWith('New Pres');
    });

    it('create should error when title missing', async () => {
      setArgs('slides', 'create');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Presentation title is required');
    });

    it('export should export a presentation', async () => {
      setupAuthSuccess();
      const mockBlob = { size: 1024, arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) };
      mockSlidesApi.exportPresentation.mockResolvedValue({
        ok: true,
        value: mockBlob,
      });

      setArgs('slides', 'export', 'p1', '--format', 'pdf');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('Export complete. Blob size: 1024 bytes');
    });

    it('export should error when format unsupported', async () => {
      setArgs('slides', 'export', 'p1', '--format', 'xyz');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Unsupported format'));
    });

    it('export should error when args missing', async () => {
      setArgs('slides', 'export');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('presentationId and --format are required'));
    });

    it('export should write to output file', async () => {
      setupAuthSuccess();
      const mockBlob = { size: 1024, arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) };
      mockSlidesApi.exportPresentation.mockResolvedValue({
        ok: true,
        value: mockBlob,
      });

      setArgs('slides', 'export', 'p1', '--format', 'pdf', '-o', '/output/pres.pdf');
      const code = await main();
      expect(code).toBe(0);
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  // ── Contacts commands ───────────────────────────────────────────

  describe('contacts', () => {
    it('list should list contacts', async () => {
      setupAuthSuccess();
      mockContactsApi.listContacts.mockResolvedValue({
        ok: true,
        value: { connections: [{ resourceName: 'people/1', names: [{ displayName: 'John' }] }] },
      });

      setArgs('contacts', 'list');
      const code = await main();
      expect(code).toBe(0);
      expect(mockContactsApi.listContacts).toHaveBeenCalled();
    });

    it('search should search contacts', async () => {
      setupAuthSuccess();
      mockContactsApi.searchContacts.mockResolvedValue({
        ok: true,
        value: [{ resourceName: 'people/1' }],
      });

      setArgs('contacts', 'search', 'John');
      const code = await main();
      expect(code).toBe(0);
      expect(mockContactsApi.searchContacts).toHaveBeenCalled();
    });

    it('search should error when query missing', async () => {
      setArgs('contacts', 'search');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Search query is required');
    });

    it('create should create a contact', async () => {
      setupAuthSuccess();
      mockContactsApi.createContact.mockResolvedValue({
        ok: true,
        value: { resourceName: 'people/2' },
      });

      setArgs('contacts', 'create', '--name', 'Jane', '--email', 'jane@test.com');
      const code = await main();
      expect(code).toBe(0);
      expect(mockContactsApi.createContact).toHaveBeenCalled();
    });

    it('create should error when name or email missing', async () => {
      setArgs('contacts', 'create');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: --name and --email are required');
    });
  });

  // ── Tasks commands ──────────────────────────────────────────────

  describe('tasks', () => {
    it('lists should list task lists', async () => {
      setupAuthSuccess();
      mockTasksApi.listTaskLists.mockResolvedValue({
        ok: true,
        value: { items: [{ id: 'tl1', title: 'My Tasks' }] },
      });

      setArgs('tasks', 'lists');
      const code = await main();
      expect(code).toBe(0);
      expect(mockTasksApi.listTaskLists).toHaveBeenCalled();
    });

    it('list should list tasks', async () => {
      setupAuthSuccess();
      mockTasksApi.listTasks.mockResolvedValue({
        ok: true,
        value: { items: [{ id: 't1', title: 'Task 1' }] },
      });

      setArgs('tasks', 'list', 'tl1');
      const code = await main();
      expect(code).toBe(0);
      expect(mockTasksApi.listTasks).toHaveBeenCalled();
    });

    it('list should error when tasklistId missing', async () => {
      setArgs('tasks', 'list');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Task list ID is required');
    });

    it('create should create a task', async () => {
      setupAuthSuccess();
      mockTasksApi.createTask.mockResolvedValue({
        ok: true,
        value: { id: 't2', title: 'New Task' },
      });

      setArgs('tasks', 'create', 'tl1', '--title', 'New Task');
      const code = await main();
      expect(code).toBe(0);
      expect(mockTasksApi.createTask).toHaveBeenCalled();
    });

    it('create should error when args missing', async () => {
      setArgs('tasks', 'create');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('tasklistId and --title are required'));
    });

    it('complete should complete a task', async () => {
      setupAuthSuccess();
      mockTasksApi.completeTask.mockResolvedValue({
        ok: true,
        value: { id: 't1', status: 'completed' },
      });

      setArgs('tasks', 'complete', 'tl1', 't1');
      const code = await main();
      expect(code).toBe(0);
      expect(mockTasksApi.completeTask).toHaveBeenCalled();
    });

    it('complete should error when taskId missing', async () => {
      setArgs('tasks', 'complete', 'tl1');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('tasklistId and taskId are required'));
    });
  });

  // ── Chat commands ───────────────────────────────────────────────

  describe('chat', () => {
    it('spaces should list spaces', async () => {
      setupAuthSuccess();
      mockChatApi.listSpaces.mockResolvedValue({
        ok: true,
        value: { spaces: [{ name: 'spaces/s1', displayName: 'General' }] },
      });

      setArgs('chat', 'spaces');
      const code = await main();
      expect(code).toBe(0);
      expect(mockChatApi.listSpaces).toHaveBeenCalled();
    });

    it('messages should list messages', async () => {
      setupAuthSuccess();
      mockChatApi.listMessages.mockResolvedValue({
        ok: true,
        value: { messages: [{ name: 'spaces/s1/messages/m1', text: 'Hello' }] },
      });

      setArgs('chat', 'messages', 'spaces/s1');
      const code = await main();
      expect(code).toBe(0);
      expect(mockChatApi.listMessages).toHaveBeenCalled();
    });

    it('messages should error when spaceName missing', async () => {
      setArgs('chat', 'messages');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Space name is required');
    });

    it('send should send a message', async () => {
      setupAuthSuccess();
      mockChatApi.sendMessage.mockResolvedValue({
        ok: true,
        value: { name: 'spaces/s1/messages/m2', text: 'Hi there' },
      });

      setArgs('chat', 'send', 'spaces/s1', '--text', 'Hi there');
      const code = await main();
      expect(code).toBe(0);
      expect(mockChatApi.sendMessage).toHaveBeenCalled();
    });

    it('send should error when spaceName or text missing', async () => {
      setArgs('chat', 'send');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('spaceName and --text are required'));
    });
  });

  // ── Classroom commands ──────────────────────────────────────────

  describe('classroom', () => {
    it('courses should list courses', async () => {
      setupAuthSuccess();
      mockClassroomApi.listCourses.mockResolvedValue({
        ok: true,
        value: { courses: [{ id: 'c1', name: 'Math 101' }] },
      });

      setArgs('classroom', 'courses');
      const code = await main();
      expect(code).toBe(0);
      expect(mockClassroomApi.listCourses).toHaveBeenCalled();
    });

    it('students should list students', async () => {
      setupAuthSuccess();
      mockClassroomApi.listStudents.mockResolvedValue({
        ok: true,
        value: { students: [{ userId: 'u1', profile: { name: { fullName: 'Alice' } } }] },
      });

      setArgs('classroom', 'students', 'c1');
      const code = await main();
      expect(code).toBe(0);
      expect(mockClassroomApi.listStudents).toHaveBeenCalledWith('c1');
    });

    it('students should error when courseId missing', async () => {
      setArgs('classroom', 'students');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Course ID is required');
    });

    it('coursework should list coursework', async () => {
      setupAuthSuccess();
      mockClassroomApi.listCourseWork.mockResolvedValue({
        ok: true,
        value: { courseWork: [{ id: 'cw1', title: 'Homework 1' }] },
      });

      setArgs('classroom', 'coursework', 'c1');
      const code = await main();
      expect(code).toBe(0);
      expect(mockClassroomApi.listCourseWork).toHaveBeenCalledWith('c1');
    });

    it('coursework should error when courseId missing', async () => {
      setArgs('classroom', 'coursework');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Course ID is required');
    });
  });

  // ── Forms commands ──────────────────────────────────────────────

  describe('forms', () => {
    it('get should get a form', async () => {
      setupAuthSuccess();
      mockFormsApi.getForm.mockResolvedValue({
        ok: true,
        value: { formId: 'f1', info: { title: 'Survey' } },
      });

      setArgs('forms', 'get', 'f1');
      const code = await main();
      expect(code).toBe(0);
      expect(mockFormsApi.getForm).toHaveBeenCalledWith('f1');
    });

    it('get should error when formId missing', async () => {
      setArgs('forms', 'get');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Form ID is required');
    });

    it('responses should list responses', async () => {
      setupAuthSuccess();
      mockFormsApi.listResponses.mockResolvedValue({
        ok: true,
        value: { responses: [{ responseId: 'r1' }] },
      });

      setArgs('forms', 'responses', 'f1');
      const code = await main();
      expect(code).toBe(0);
      expect(mockFormsApi.listResponses).toHaveBeenCalled();
    });

    it('responses should error when formId missing', async () => {
      setArgs('forms', 'responses');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Form ID is required');
    });

    it('get should handle API failure', async () => {
      setupAuthSuccess();
      mockFormsApi.getForm.mockResolvedValue({
        ok: false,
        error: { message: 'Forms API error' },
      });

      setArgs('forms', 'get', 'f1');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Forms API error');
    });
  });

  // ── AppScript commands ──────────────────────────────────────────

  describe('appscript', () => {
    it('get should get a project', async () => {
      setupAuthSuccess();
      mockAppScriptApi.getProject.mockResolvedValue({
        ok: true,
        value: { scriptId: 's1', title: 'My Script' },
      });

      setArgs('appscript', 'get', 's1');
      const code = await main();
      expect(code).toBe(0);
      expect(mockAppScriptApi.getProject).toHaveBeenCalledWith('s1');
    });

    it('get should error when scriptId missing', async () => {
      setArgs('appscript', 'get');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Script ID is required');
    });

    it('run should run a function', async () => {
      setupAuthSuccess();
      mockAppScriptApi.runFunction.mockResolvedValue({
        ok: true,
        value: { done: true, response: { result: 'OK' } },
      });

      setArgs('appscript', 'run', 's1', '--function', 'myFunc');
      const code = await main();
      expect(code).toBe(0);
      expect(mockAppScriptApi.runFunction).toHaveBeenCalledWith('s1', 'myFunc');
    });

    it('run should error when scriptId or function missing', async () => {
      setArgs('appscript', 'run');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('scriptId and --function are required'));
    });
  });

  // ── People commands ─────────────────────────────────────────────

  describe('people', () => {
    it('me should get own profile', async () => {
      setupAuthSuccess();
      mockPeopleApi.getProfile.mockResolvedValue({
        ok: true,
        value: { resourceName: 'people/me', names: [{ displayName: 'Test User' }] },
      });

      setArgs('people', 'me');
      const code = await main();
      expect(code).toBe(0);
      expect(mockPeopleApi.getProfile).toHaveBeenCalledWith('people/me');
    });

    it('search should search profiles', async () => {
      setupAuthSuccess();
      mockPeopleApi.searchProfiles.mockResolvedValue({
        ok: true,
        value: { people: [{ resourceName: 'people/1' }] },
      });

      setArgs('people', 'search', 'John');
      const code = await main();
      expect(code).toBe(0);
      expect(mockPeopleApi.searchProfiles).toHaveBeenCalledWith('John');
    });

    it('search should error when query missing', async () => {
      setArgs('people', 'search');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Search query is required');
    });

    it('me should handle API failure', async () => {
      setupAuthSuccess();
      mockPeopleApi.getProfile.mockResolvedValue({
        ok: false,
        error: { message: 'People API error' },
      });

      setArgs('people', 'me');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: People API error');
    });
  });

  // ── Groups commands ─────────────────────────────────────────────

  describe('groups', () => {
    it('list should list groups', async () => {
      setupAuthSuccess();
      mockGroupsApi.listGroups.mockResolvedValue({
        ok: true,
        value: { groups: [{ name: 'groups/g1', displayName: 'Engineering' }] },
      });

      setArgs('groups', 'list');
      const code = await main();
      expect(code).toBe(0);
      expect(mockGroupsApi.listGroups).toHaveBeenCalled();
    });

    it('members should list group members', async () => {
      setupAuthSuccess();
      mockGroupsApi.listMembers.mockResolvedValue({
        ok: true,
        value: { memberships: [{ name: 'groups/g1/memberships/m1' }] },
      });

      setArgs('groups', 'members', 'groups/g1');
      const code = await main();
      expect(code).toBe(0);
      expect(mockGroupsApi.listMembers).toHaveBeenCalledWith('groups/g1');
    });

    it('members should error when groupName missing', async () => {
      setArgs('groups', 'members');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Group name is required');
    });

    it('list should handle API failure', async () => {
      setupAuthSuccess();
      mockGroupsApi.listGroups.mockResolvedValue({
        ok: false,
        error: { message: 'Groups API error' },
      });

      setArgs('groups', 'list');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Groups API error');
    });
  });

  // ── Keep commands ───────────────────────────────────────────────

  describe('keep', () => {
    it('list should list notes', async () => {
      setupAuthSuccess();
      mockKeepApi.listNotes.mockResolvedValue({
        ok: true,
        value: { notes: [{ name: 'notes/n1', title: 'My Note' }] },
      });

      setArgs('keep', 'list');
      const code = await main();
      expect(code).toBe(0);
      expect(mockKeepApi.listNotes).toHaveBeenCalled();
    });

    it('get should get a note', async () => {
      setupAuthSuccess();
      mockKeepApi.getNote.mockResolvedValue({
        ok: true,
        value: { name: 'notes/n1', title: 'My Note', body: { text: { text: 'Hello' } } },
      });

      setArgs('keep', 'get', 'notes/n1');
      const code = await main();
      expect(code).toBe(0);
      expect(mockKeepApi.getNote).toHaveBeenCalledWith('notes/n1');
    });

    it('get should error when noteName missing', async () => {
      setArgs('keep', 'get');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Note name is required');
    });

    it('list should handle API failure', async () => {
      setupAuthSuccess();
      mockKeepApi.listNotes.mockResolvedValue({
        ok: false,
        error: { message: 'Keep API error' },
      });

      setArgs('keep', 'list');
      const code = await main();
      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('Error: Keep API error');
    });
  });

  // ── Output formatting integration ──────────────────────────────

  describe('output formatting', () => {
    it('gmail search with --json should produce JSON output', async () => {
      setupAuthSuccess();
      mockGmailApi.searchMessages.mockResolvedValue({
        ok: true,
        value: { messages: [{ id: '1', subject: 'Test' }] },
      });

      setArgs('gmail', 'search', 'test', '--json');
      const code = await main();
      expect(code).toBe(0);
      // The output should be JSON formatted
      expect(logSpy).toHaveBeenCalled();
    });

    it('drive ls with --csv should produce CSV output', async () => {
      setupAuthSuccess();
      mockDriveApi.listFiles.mockResolvedValue({
        ok: true,
        value: { files: [{ id: 'f1', name: 'file.txt' }] },
      });

      setArgs('drive', 'ls', '--csv');
      const code = await main();
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalled();
    });
  });
});
