/**
 * Type definitions for Google Chat API v1.
 * Maps Google Chat JSON responses to clean TypeScript interfaces.
 */

// ---------------------------------------------------------------------------
// Core Chat types
// ---------------------------------------------------------------------------

/**
 * Base URL for Google Chat API v1.
 */
export const BASE_URL = 'https://chat.googleapis.com/v1';

/**
 * A user in Google Chat.
 */
export type User = {
  /** Resource name of the user (e.g., `users/123456789`). */
  readonly name: string;
  /** Display name of the user. */
  readonly displayName: string;
  /** Type of user. */
  readonly type: 'HUMAN' | 'BOT';
  /** Domain ID of the user. */
  readonly domainId?: string;
  /** Whether the user is anonymous. */
  readonly isAnonymous?: boolean;
};

/**
 * Details about a space.
 */
export type SpaceDetails = {
  /** Description of the space. */
  readonly description?: string;
  /** Guidelines for the space. */
  readonly guidelines?: string;
};

/**
 * A space (room, DM, or group DM) in Google Chat.
 */
export type Space = {
  /** Resource name of the space (e.g., `spaces/AAAA`). */
  readonly name: string;
  /** Display name of the space. */
  readonly displayName?: string;
  /** Type of space. */
  readonly type?: 'ROOM' | 'DM' | 'GROUP_DM';
  /** Whether the space is a single-user bot DM. */
  readonly singleUserBotDm?: boolean;
  /** Whether the space has threaded replies enabled. */
  readonly threaded?: boolean;
  /** Additional details about the space. */
  readonly spaceDetails?: SpaceDetails;
  /** Deprecated: use `type` instead. */
  readonly spaceType?: 'SPACE' | 'DM';
};

/**
 * A thread within a space.
 */
export type Thread = {
  /** Resource name of the thread (e.g., `spaces/AAAA/threads/BBBB`). */
  readonly name?: string;
  /** Thread key for grouping messages. */
  readonly threadKey?: string;
};

/**
 * Card header for a card message.
 */
export type CardHeader = {
  /** Title of the card. */
  readonly title: string;
  /** Subtitle of the card. */
  readonly subtitle?: string;
  /** URL to an image for the card header. */
  readonly imageUrl?: string;
};

/**
 * Card section containing widgets.
 */
export type CardSection = {
  /** Header text for the section. */
  readonly header?: string;
  /** Widgets in this section. */
  readonly widgets?: readonly Record<string, unknown>[];
};

/**
 * A card attachment for a message.
 */
export type Card = {
  /** Card header. */
  readonly header?: CardHeader;
  /** Sections within the card. */
  readonly sections?: readonly CardSection[];
};

/**
 * A message in Google Chat.
 */
export type Message = {
  /** Resource name of the message (e.g., `spaces/AAAA/messages/BBBB`). */
  readonly name: string;
  /** User who sent the message. */
  readonly sender?: User;
  /** Creation timestamp (RFC 3339). */
  readonly createTime?: string;
  /** Plain text message body. */
  readonly text?: string;
  /** Formatted text (may include HTML). */
  readonly formattedText?: string;
  /** Card attachments. */
  readonly cards?: readonly Card[];
  /** Thread this message belongs to. */
  readonly thread?: Thread;
  /** Space this message belongs to. */
  readonly space?: Space;
  /** Text extracted from slash command arguments. */
  readonly argumentText?: string;
  /** Annotations (e.g., mentions). */
  readonly annotations?: readonly Record<string, unknown>[];
};

// ---------------------------------------------------------------------------
// List response types
// ---------------------------------------------------------------------------

/**
 * Response from listing spaces.
 */
export type ListSpacesResponse = {
  /** List of spaces. */
  readonly spaces?: readonly Space[];
  /** Token for retrieving the next page of results. */
  readonly nextPageToken?: string;
};

/**
 * Response from listing messages.
 */
export type ListMessagesResponse = {
  /** List of messages. */
  readonly messages?: readonly Message[];
  /** Token for retrieving the next page of results. */
  readonly nextPageToken?: string;
};

// ---------------------------------------------------------------------------
// Options / parameter types
// ---------------------------------------------------------------------------

/**
 * Options for listing spaces.
 */
export type ListSpacesOptions = {
  /** Maximum number of spaces to return. */
  readonly pageSize?: number;
  /** Token for retrieving the next page of results. */
  readonly pageToken?: string;
  /** Filter string (e.g., `spaceType = "SPACE"`). */
  readonly filter?: string;
};

/**
 * Options for listing messages.
 */
export type ListMessagesOptions = {
  /** Maximum number of messages to return. */
  readonly pageSize?: number;
  /** Token for retrieving the next page of results. */
  readonly pageToken?: string;
  /** Filter string. */
  readonly filter?: string;
  /** Sort order (e.g., `createTime desc`). */
  readonly orderBy?: string;
  /** Whether to include deleted messages. */
  readonly showDeleted?: boolean;
};

// ---------------------------------------------------------------------------
// ChatApi facade type
// ---------------------------------------------------------------------------

/**
 * Unified Chat API surface that wraps all Google Chat operations.
 * Created via the {@link chat} factory function.
 */
export type ChatApi = {
  // -- Spaces ---------------------------------------------------------------

  /**
   * Lists spaces the authenticated user is a member of.
   */
  listSpaces(
    options?: ListSpacesOptions,
  ): Promise<Result<ListSpacesResponse, WorkspaceError>>;

  /**
   * Gets a single space by name.
   */
  getSpace(
    spaceName: string,
  ): Promise<Result<Space, WorkspaceError>>;

  /**
   * Creates a new space.
   */
  createSpace(
    displayName: string,
    spaceType?: 'SPACE' | 'DM',
  ): Promise<Result<Space, WorkspaceError>>;

  /**
   * Finds a space by display name.
   */
  findSpace(
    displayName: string,
  ): Promise<Result<Space | undefined, WorkspaceError>>;

  // -- Messages -------------------------------------------------------------

  /**
   * Lists messages in a space.
   */
  listMessages(
    spaceName: string,
    options?: ListMessagesOptions,
  ): Promise<Result<ListMessagesResponse, WorkspaceError>>;

  /**
   * Gets a single message by name.
   */
  getMessage(
    messageName: string,
  ): Promise<Result<Message, WorkspaceError>>;

  /**
   * Sends a message to a space.
   */
  sendMessage(
    spaceName: string,
    text: string,
    threadKey?: string,
  ): Promise<Result<Message, WorkspaceError>>;

  /**
   * Updates an existing message.
   */
  updateMessage(
    messageName: string,
    text: string,
  ): Promise<Result<Message, WorkspaceError>>;

  /**
   * Deletes a message.
   */
  deleteMessage(
    messageName: string,
  ): Promise<Result<void, WorkspaceError>>;

  // -- Direct Messages ------------------------------------------------------

  /**
   * Creates a direct message to a user.
   */
  createDirectMessage(
    userId: string,
    text: string,
  ): Promise<Result<Message, WorkspaceError>>;

  /**
   * Lists direct messages with a user.
   */
  listDirectMessages(
    userId: string,
    options?: ListMessagesOptions,
  ): Promise<Result<ListMessagesResponse, WorkspaceError>>;
};

// Import types from core (needed for type definitions above)
import type { Result } from '@openworkspace/core';
import type { WorkspaceError } from '@openworkspace/core';
