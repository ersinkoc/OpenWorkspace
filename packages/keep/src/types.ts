/**
 * Type definitions for Google Keep API v1.
 * Maps Google Keep JSON responses to clean TypeScript interfaces.
 */

// ---------------------------------------------------------------------------
// Core Keep types
// ---------------------------------------------------------------------------

/**
 * Text content within a note section or list item.
 */
export type TextContent = {
  /** The plain text content. */
  readonly text: string;
};

/**
 * A single item within a checklist.
 */
export type ListItem = {
  /** The text content of the list item. */
  readonly text: TextContent;
  /** Whether the item is checked. */
  readonly checked: boolean;
  /** Nested child list items. */
  readonly childListItems?: readonly ListItem[];
};

/**
 * List content for a checklist note.
 */
export type ListContent = {
  /** Array of list items in the checklist. */
  readonly listItems: readonly ListItem[];
};

/**
 * A note section containing either text or a list.
 */
export type Section = {
  /** Text content (present for text notes). */
  readonly text?: TextContent;
  /** List content (present for checklist notes). */
  readonly list?: ListContent;
};

/**
 * An attachment within a note.
 */
export type Attachment = {
  /** Resource name of the attachment. */
  readonly name: string;
  /** MIME types representing the attachment. */
  readonly mimeType: readonly string[];
};

/**
 * Represents a family scope for sharing.
 */
export type Family = {
  // Empty object - family sharing is indicated by presence of this field
};

/**
 * Permission entry for a note.
 */
export type Permission = {
  /** Resource name of the permission. */
  readonly name: string;
  /** Email address of the user or group. */
  readonly email?: string;
  /** Role granted to the user/group. */
  readonly role: 'OWNER' | 'WRITER';
  /** Whether this permission is for the user's family group. */
  readonly family?: Family;
};

/**
 * A Google Keep note.
 * Corresponds to the `Note` resource in the Google Keep API.
 */
export type Note = {
  /** Resource name of the note (format: `notes/{note_id}`). */
  readonly name: string;
  /** Creation timestamp (RFC 3339). */
  readonly createTime: string;
  /** Last modification timestamp (RFC 3339). */
  readonly updateTime: string;
  /** Time when the note was trashed (RFC 3339). Only present if trashed. */
  readonly trashTime?: string;
  /** Whether the note is in the trash. */
  readonly trashed: boolean;
  /** Title of the note. */
  readonly title?: string;
  /** Body content of the note. */
  readonly body: Section;
  /** List of attachments. */
  readonly attachments?: readonly Attachment[];
  /** List of permissions (sharing). */
  readonly permissions?: readonly Permission[];
};

// ---------------------------------------------------------------------------
// API list response wrappers
// ---------------------------------------------------------------------------

/**
 * Paginated list response for notes.
 */
export type ListNotesResponse = {
  /** Array of notes. */
  readonly notes: readonly Note[];
  /** Token for fetching the next page. */
  readonly nextPageToken?: string;
};

// ---------------------------------------------------------------------------
// Options / parameter types
// ---------------------------------------------------------------------------

/**
 * Options for listing notes.
 */
export type ListNotesOptions = {
  /** Maximum number of notes to return per page. */
  readonly pageSize?: number;
  /** Token for paginating through results. */
  readonly pageToken?: string;
  /** Filter query string (e.g., `trashed=false`). */
  readonly filter?: string;
};

// ---------------------------------------------------------------------------
// API facade type
// ---------------------------------------------------------------------------

/**
 * Google Keep API v1 base URL.
 */
export const BASE_URL = 'https://keep.googleapis.com/v1';

/**
 * Unified Keep API surface that wraps all Google Keep operations.
 * Created via the {@link keep} factory function.
 */
export type KeepApi = {
  // -- Notes ----------------------------------------------------------------

  /**
   * Lists notes with optional pagination and filtering.
   */
  listNotes(options?: ListNotesOptions): Promise<Result<ListNotesResponse, WorkspaceError>>;

  /**
   * Gets a single note by its resource name.
   */
  getNote(noteName: string): Promise<Result<Note, WorkspaceError>>;

  /**
   * Creates a new text note.
   */
  createNote(title: string, body: string): Promise<Result<Note, WorkspaceError>>;

  /**
   * Creates a new checklist note.
   */
  createListNote(title: string, items: readonly string[]): Promise<Result<Note, WorkspaceError>>;

  /**
   * Deletes a note (moves to trash).
   */
  deleteNote(noteName: string): Promise<Result<void, WorkspaceError>>;

  /**
   * Searches notes by query string.
   */
  searchNotes(
    query: string,
    options?: Omit<ListNotesOptions, 'filter'>,
  ): Promise<Result<ListNotesResponse, WorkspaceError>>;

  // -- Attachments ----------------------------------------------------------

  /**
   * Gets attachment metadata.
   */
  getAttachment(attachmentName: string): Promise<Result<Attachment, WorkspaceError>>;

  /**
   * Downloads attachment content as a buffer.
   */
  downloadAttachment(attachmentName: string): Promise<Result<ArrayBuffer, WorkspaceError>>;
};

// Import Result/WorkspaceError types for use in KeepApi
import type { Result, WorkspaceError } from '@openworkspace/core';
