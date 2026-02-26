/**
 * @openworkspace/keep
 * Google Keep API v1 service package for OpenWorkspace.
 * Zero-dependency -- uses HttpClient from @openworkspace/core.
 */

// Types
export type {
  Note,
  Section,
  TextContent,
  ListContent,
  ListItem,
  Attachment,
  Permission,
  Family,
  ListNotesResponse,
  ListNotesOptions,
} from './types.js';
export { BASE_URL } from './types.js';

// Note operations
export { listNotes, getNote, createNote, createListNote, deleteNote, searchNotes } from './notes.js';

// Attachment operations
export { getAttachment, downloadAttachment } from './attachments.js';

// Plugin & facade
export type { KeepApi } from './plugin.js';
export { keep, keepPlugin } from './plugin.js';
