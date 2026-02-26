/**
 * Google API scope definitions and management.
 * Provides typed scope constants for all supported Google Workspace services.
 */

/**
 * Google OAuth2 scope constants organized by service.
 * @example
 * const scopes = [SCOPES.GMAIL.MODIFY, SCOPES.CALENDAR.EVENTS];
 */
export const SCOPES = {
  GMAIL: {
    /** Full access to Gmail */
    FULL: 'https://mail.google.com/',
    /** Read, send, delete, and manage email */
    MODIFY: 'https://www.googleapis.com/auth/gmail.modify',
    /** Read-only access to Gmail */
    READONLY: 'https://www.googleapis.com/auth/gmail.readonly',
    /** Send emails only */
    SEND: 'https://www.googleapis.com/auth/gmail.send',
    /** Manage drafts and send emails */
    COMPOSE: 'https://www.googleapis.com/auth/gmail.compose',
    /** Manage labels */
    LABELS: 'https://www.googleapis.com/auth/gmail.labels',
    /** Manage basic mail settings */
    SETTINGS_BASIC: 'https://www.googleapis.com/auth/gmail.settings.basic',
    /** Manage mail settings including filters and forwarding */
    SETTINGS_SHARING: 'https://www.googleapis.com/auth/gmail.settings.sharing',
  },
  CALENDAR: {
    /** Full access to Google Calendar */
    FULL: 'https://www.googleapis.com/auth/calendar',
    /** Read-only access to Google Calendar */
    READONLY: 'https://www.googleapis.com/auth/calendar.readonly',
    /** Read/write access to events */
    EVENTS: 'https://www.googleapis.com/auth/calendar.events',
    /** Read-only access to events */
    EVENTS_READONLY: 'https://www.googleapis.com/auth/calendar.events.readonly',
    /** Read-only access to calendar settings */
    SETTINGS_READONLY: 'https://www.googleapis.com/auth/calendar.settings.readonly',
  },
  DRIVE: {
    /** Full access to Google Drive */
    FULL: 'https://www.googleapis.com/auth/drive',
    /** Read-only access to file metadata and content */
    READONLY: 'https://www.googleapis.com/auth/drive.readonly',
    /** Access to files created or opened by the app */
    FILE: 'https://www.googleapis.com/auth/drive.file',
    /** Read-only access to file metadata */
    METADATA_READONLY: 'https://www.googleapis.com/auth/drive.metadata.readonly',
    /** Access to Application Data folder */
    APPDATA: 'https://www.googleapis.com/auth/drive.appdata',
  },
  SHEETS: {
    /** Full access to Google Sheets */
    FULL: 'https://www.googleapis.com/auth/spreadsheets',
    /** Read-only access to Google Sheets */
    READONLY: 'https://www.googleapis.com/auth/spreadsheets.readonly',
  },
  DOCS: {
    /** Full access to Google Docs */
    FULL: 'https://www.googleapis.com/auth/documents',
    /** Read-only access to Google Docs */
    READONLY: 'https://www.googleapis.com/auth/documents.readonly',
  },
  SLIDES: {
    /** Full access to Google Slides */
    FULL: 'https://www.googleapis.com/auth/presentations',
    /** Read-only access to Google Slides */
    READONLY: 'https://www.googleapis.com/auth/presentations.readonly',
  },
  CONTACTS: {
    /** Full access to contacts */
    FULL: 'https://www.googleapis.com/auth/contacts',
    /** Read-only access to contacts */
    READONLY: 'https://www.googleapis.com/auth/contacts.readonly',
    /** Access to "other" contacts */
    OTHER_READONLY: 'https://www.googleapis.com/auth/contacts.other.readonly',
  },
  TASKS: {
    /** Full access to Google Tasks */
    FULL: 'https://www.googleapis.com/auth/tasks',
    /** Read-only access to Google Tasks */
    READONLY: 'https://www.googleapis.com/auth/tasks.readonly',
  },
  CHAT: {
    /** Full access to Google Chat spaces */
    SPACES: 'https://www.googleapis.com/auth/chat.spaces',
    /** Read-only access to Google Chat spaces */
    SPACES_READONLY: 'https://www.googleapis.com/auth/chat.spaces.readonly',
    /** Full access to messages */
    MESSAGES: 'https://www.googleapis.com/auth/chat.messages',
    /** Read-only access to messages */
    MESSAGES_READONLY: 'https://www.googleapis.com/auth/chat.messages.readonly',
  },
  CLASSROOM: {
    /** Manage courses */
    COURSES: 'https://www.googleapis.com/auth/classroom.courses',
    /** View courses */
    COURSES_READONLY: 'https://www.googleapis.com/auth/classroom.courses.readonly',
    /** Manage coursework */
    COURSEWORK: 'https://www.googleapis.com/auth/classroom.coursework.students',
    /** View rosters */
    ROSTERS_READONLY: 'https://www.googleapis.com/auth/classroom.rosters.readonly',
  },
  FORMS: {
    /** Full access to Google Forms */
    FULL: 'https://www.googleapis.com/auth/forms.body',
    /** Read-only access to Google Forms */
    READONLY: 'https://www.googleapis.com/auth/forms.body.readonly',
    /** Access to form responses */
    RESPONSES_READONLY: 'https://www.googleapis.com/auth/forms.responses.readonly',
  },
  APPSCRIPT: {
    /** Access to Apps Script projects */
    PROJECTS: 'https://www.googleapis.com/auth/script.projects',
    /** Read-only access to Apps Script projects */
    PROJECTS_READONLY: 'https://www.googleapis.com/auth/script.projects.readonly',
  },
  PEOPLE: {
    /** Full access to People API */
    FULL: 'https://www.googleapis.com/auth/contacts',
    /** Read-only access to People API */
    READONLY: 'https://www.googleapis.com/auth/contacts.readonly',
    /** Access to directory */
    DIRECTORY_READONLY: 'https://www.googleapis.com/auth/directory.readonly',
  },
  GROUPS: {
    /** Full access to Cloud Identity Groups */
    FULL: 'https://www.googleapis.com/auth/cloud-identity.groups',
    /** Read-only access to Cloud Identity Groups */
    READONLY: 'https://www.googleapis.com/auth/cloud-identity.groups.readonly',
  },
  KEEP: {
    /** Full access to Google Keep */
    FULL: 'https://www.googleapis.com/auth/keep',
    /** Read-only access to Google Keep */
    READONLY: 'https://www.googleapis.com/auth/keep.readonly',
  },
  ADMIN: {
    /** Admin directory access */
    DIRECTORY_READONLY: 'https://www.googleapis.com/auth/admin.directory.user.readonly',
  },
} as const;

/**
 * All scope values as a flat array type.
 */
export type GoogleScope = string;

/**
 * Validates that all provided scopes are valid Google API scope URLs.
 * @example
 * validateScopes(['https://www.googleapis.com/auth/gmail.readonly']); // true
 */
export function validateScopes(scopes: string[]): boolean {
  return scopes.every(
    (scope) =>
      scope.startsWith('https://www.googleapis.com/auth/') ||
      scope.startsWith('https://mail.google.com/')
  );
}

/**
 * Deduplicates and sorts a list of scopes.
 * @example
 * normalizeScopes([SCOPES.GMAIL.READONLY, SCOPES.GMAIL.READONLY]);
 * // ['https://www.googleapis.com/auth/gmail.readonly']
 */
export function normalizeScopes(scopes: string[]): string[] {
  return [...new Set(scopes)].sort();
}

/**
 * Returns the human-readable service name for a scope URL.
 * @example
 * getScopeService('https://www.googleapis.com/auth/gmail.readonly'); // 'gmail'
 */
export function getScopeService(scope: string): string | undefined {
  if (scope.startsWith('https://mail.google.com/')) return 'gmail';

  const match = /googleapis\.com\/auth\/([^.]+)/.exec(scope);
  const service = match?.[1];
  if (!service) return undefined;

  const serviceMap: Record<string, string> = {
    gmail: 'gmail',
    calendar: 'calendar',
    drive: 'drive',
    spreadsheets: 'sheets',
    documents: 'docs',
    presentations: 'slides',
    contacts: 'contacts',
    tasks: 'tasks',
    chat: 'chat',
    classroom: 'classroom',
    forms: 'forms',
    script: 'appscript',
    keep: 'keep',
    directory: 'admin',
    'cloud-identity': 'groups',
  };

  return serviceMap[service];
}

/**
 * Returns a description for a well-known scope.
 * @example
 * getScopeDescription(SCOPES.GMAIL.READONLY); // 'Read-only access to Gmail'
 */
export function getScopeDescription(scope: string): string {
  const descriptions: Record<string, string> = {
    [SCOPES.GMAIL.FULL]: 'Full access to Gmail',
    [SCOPES.GMAIL.MODIFY]: 'Read, send, delete, and manage email',
    [SCOPES.GMAIL.READONLY]: 'Read-only access to Gmail',
    [SCOPES.GMAIL.SEND]: 'Send emails only',
    [SCOPES.GMAIL.COMPOSE]: 'Manage drafts and send emails',
    [SCOPES.GMAIL.LABELS]: 'Manage labels',
    [SCOPES.CALENDAR.FULL]: 'Full access to Google Calendar',
    [SCOPES.CALENDAR.READONLY]: 'Read-only access to Google Calendar',
    [SCOPES.CALENDAR.EVENTS]: 'Read/write access to events',
    [SCOPES.DRIVE.FULL]: 'Full access to Google Drive',
    [SCOPES.DRIVE.READONLY]: 'Read-only access to Google Drive',
    [SCOPES.DRIVE.FILE]: 'Access to files created or opened by the app',
    [SCOPES.SHEETS.FULL]: 'Full access to Google Sheets',
    [SCOPES.SHEETS.READONLY]: 'Read-only access to Google Sheets',
    [SCOPES.DOCS.FULL]: 'Full access to Google Docs',
    [SCOPES.DOCS.READONLY]: 'Read-only access to Google Docs',
    [SCOPES.SLIDES.FULL]: 'Full access to Google Slides',
    [SCOPES.SLIDES.READONLY]: 'Read-only access to Google Slides',
    [SCOPES.TASKS.FULL]: 'Full access to Google Tasks',
    [SCOPES.TASKS.READONLY]: 'Read-only access to Google Tasks',
  };

  return descriptions[scope] ?? scope;
}
