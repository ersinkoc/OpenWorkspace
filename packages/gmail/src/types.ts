/**
 * Gmail API type definitions.
 * Maps Gmail REST API responses to clean TypeScript interfaces.
 *
 * @see https://developers.google.com/gmail/api/reference/rest
 */

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

/**
 * Gmail API base URL for user-scoped endpoints.
 * All operations are performed in the context of a specific user ("me").
 */
export const GMAIL_BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users';

/**
 * The default authenticated user alias used by the Gmail API.
 */
export const GMAIL_USER_ME = 'me';

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

/**
 * A single header key-value pair on a message.
 */
export type MessageHeader = {
  /** Header name (e.g. "Subject", "From"). */
  readonly name: string;
  /** Header value. */
  readonly value: string;
};

/**
 * Body payload of a message part.
 */
export type MessagePartBody = {
  /** Attachment ID (present when the body is an attachment). */
  readonly attachmentId?: string;
  /** Total size of the body data in bytes. */
  readonly size: number;
  /** Base64url-encoded body data. */
  readonly data?: string;
};

/**
 * A single MIME message part (possibly nested for multipart messages).
 */
export type MessagePart = {
  /** MIME part ID. */
  readonly partId: string;
  /** MIME type of this part (e.g. "text/plain", "multipart/alternative"). */
  readonly mimeType: string;
  /** Filename for attachments. */
  readonly filename: string;
  /** Headers on this part. */
  readonly headers: readonly MessageHeader[];
  /** Body content of this part. */
  readonly body: MessagePartBody;
  /** Child MIME parts (for multipart types). */
  readonly parts?: readonly MessagePart[];
};

/**
 * A Gmail message resource.
 *
 * @see https://developers.google.com/gmail/api/reference/rest/v1/users.messages
 */
export type GmailMessage = {
  /** The immutable ID of the message. */
  readonly id: string;
  /** The ID of the thread the message belongs to. */
  readonly threadId: string;
  /** List of label IDs applied to this message. */
  readonly labelIds?: readonly string[];
  /** A short snippet of the message text. */
  readonly snippet?: string;
  /** Estimated size in bytes. */
  readonly sizeEstimate?: number;
  /** The parsed email structure (present when format != "minimal"). */
  readonly payload?: MessagePart;
  /** The entire email message in base64url-encoded RFC 2822 format. */
  readonly raw?: string;
  /** Estimated number of history records the message has. */
  readonly historyId?: string;
  /** Internal date (epoch ms) when the message was received. */
  readonly internalDate?: string;
};

/**
 * Response shape from `users.messages.list`.
 */
export type MessageListResponse = {
  /** List of message stubs (id + threadId only). */
  readonly messages?: readonly Pick<GmailMessage, 'id' | 'threadId'>[];
  /** Token for the next page of results. */
  readonly nextPageToken?: string;
  /** Estimated total number of results. */
  readonly resultSizeEstimate?: number;
};

// ---------------------------------------------------------------------------
// Thread types
// ---------------------------------------------------------------------------

/**
 * A Gmail thread resource (conversation).
 *
 * @see https://developers.google.com/gmail/api/reference/rest/v1/users.threads
 */
export type GmailThread = {
  /** The immutable ID of the thread. */
  readonly id: string;
  /** A short snippet of the most recent message. */
  readonly snippet?: string;
  /** Estimated history ID. */
  readonly historyId?: string;
  /** Messages in the thread (present in get, not list). */
  readonly messages?: readonly GmailMessage[];
};

/**
 * Response shape from `users.threads.list`.
 */
export type ThreadListResponse = {
  /** List of thread stubs. */
  readonly threads?: readonly Pick<GmailThread, 'id' | 'snippet' | 'historyId'>[];
  /** Token for the next page of results. */
  readonly nextPageToken?: string;
  /** Estimated total number of results. */
  readonly resultSizeEstimate?: number;
};

// ---------------------------------------------------------------------------
// Label types
// ---------------------------------------------------------------------------

/**
 * Label visibility in the label list.
 */
export type LabelListVisibility = 'labelShow' | 'labelShowIfUnread' | 'labelHide';

/**
 * Label visibility in the message list.
 */
export type MessageListVisibility = 'show' | 'hide';

/**
 * Label type: "system" for built-in labels, "user" for custom labels.
 */
export type LabelType = 'system' | 'user';

/**
 * Label color configuration.
 */
export type LabelColor = {
  /** Text color as hex (e.g. "#000000"). */
  readonly textColor?: string;
  /** Background color as hex (e.g. "#ffffff"). */
  readonly backgroundColor?: string;
};

/**
 * A Gmail label resource.
 *
 * @see https://developers.google.com/gmail/api/reference/rest/v1/users.labels
 */
export type GmailLabel = {
  /** The immutable ID of the label. */
  readonly id: string;
  /** Display name of the label. */
  readonly name: string;
  /** Owner type: "system" or "user". */
  readonly type?: LabelType;
  /** Visibility of the label in the label list. */
  readonly labelListVisibility?: LabelListVisibility;
  /** Visibility of the label in the message list. */
  readonly messageListVisibility?: MessageListVisibility;
  /** Number of messages with this label. */
  readonly messagesTotal?: number;
  /** Number of unread messages with this label. */
  readonly messagesUnread?: number;
  /** Number of threads with this label. */
  readonly threadsTotal?: number;
  /** Number of unread threads with this label. */
  readonly threadsUnread?: number;
  /** Label color (user labels only). */
  readonly color?: LabelColor;
};

/**
 * Response shape from `users.labels.list`.
 */
export type LabelListResponse = {
  /** All labels for the user. */
  readonly labels?: readonly GmailLabel[];
};

// ---------------------------------------------------------------------------
// Draft types
// ---------------------------------------------------------------------------

/**
 * A Gmail draft resource.
 *
 * @see https://developers.google.com/gmail/api/reference/rest/v1/users.drafts
 */
export type GmailDraft = {
  /** The immutable ID of the draft. */
  readonly id: string;
  /** The message content of the draft. */
  readonly message: GmailMessage;
};

/**
 * Response shape from `users.drafts.list`.
 */
export type DraftListResponse = {
  /** List of draft stubs. */
  readonly drafts?: readonly Pick<GmailDraft, 'id' | 'message'>[];
  /** Token for the next page of results. */
  readonly nextPageToken?: string;
  /** Estimated total number of results. */
  readonly resultSizeEstimate?: number;
};

// ---------------------------------------------------------------------------
// Attachment types
// ---------------------------------------------------------------------------

/**
 * Attachment metadata returned from the Gmail API.
 */
export type GmailAttachment = {
  /** Attachment ID. */
  readonly attachmentId: string;
  /** Total size in bytes. */
  readonly size: number;
  /** Base64url-encoded attachment data. */
  readonly data: string;
};

// ---------------------------------------------------------------------------
// Send / Compose types
// ---------------------------------------------------------------------------

/**
 * An email attachment to include when sending.
 */
export type SendAttachment = {
  /** The filename as displayed to the recipient. */
  readonly filename: string;
  /** MIME type of the attachment (e.g. "application/pdf"). */
  readonly mimeType: string;
  /** Base64-encoded content of the attachment. */
  readonly content: string;
};

/**
 * Options for composing an outgoing email message.
 */
export type SendOptions = {
  /** Recipient email address(es). */
  readonly to: string | readonly string[];
  /** Subject line. */
  readonly subject: string;
  /** Plain-text body. Provide at least one of `body` or `html`. */
  readonly body?: string;
  /** HTML body. Provide at least one of `body` or `html`. */
  readonly html?: string;
  /** CC recipients. */
  readonly cc?: string | readonly string[];
  /** BCC recipients. */
  readonly bcc?: string | readonly string[];
  /** Reply-To address. */
  readonly replyTo?: string;
  /** In-Reply-To message ID for threading. */
  readonly inReplyTo?: string;
  /** References header for threading. */
  readonly references?: string;
  /** File attachments. */
  readonly attachments?: readonly SendAttachment[];
};

// ---------------------------------------------------------------------------
// Batch modification types
// ---------------------------------------------------------------------------

/**
 * Parameters for batch-modifying messages.
 */
export type BatchModifyParams = {
  /** Message IDs to modify. */
  readonly ids: readonly string[];
  /** Label IDs to add. */
  readonly addLabelIds?: readonly string[];
  /** Label IDs to remove. */
  readonly removeLabelIds?: readonly string[];
};

/**
 * Parameters for batch-deleting messages.
 */
export type BatchDeleteParams = {
  /** Message IDs to delete. */
  readonly ids: readonly string[];
};

// ---------------------------------------------------------------------------
// Search / List parameter types
// ---------------------------------------------------------------------------

/**
 * Parameters for listing or searching messages.
 */
export type MessageSearchParams = {
  /** Gmail search query (same syntax as the Gmail search box). */
  readonly q?: string;
  /** Maximum number of messages to return (default 100, max 500). */
  readonly maxResults?: number;
  /** Page token from a previous response. */
  readonly pageToken?: string;
  /** Label IDs to filter by. */
  readonly labelIds?: readonly string[];
  /** Include messages from SPAM and TRASH. */
  readonly includeSpamTrash?: boolean;
};

/**
 * Parameters for listing or searching threads.
 */
export type ThreadSearchParams = {
  /** Gmail search query. */
  readonly q?: string;
  /** Maximum number of threads to return (default 100, max 500). */
  readonly maxResults?: number;
  /** Page token from a previous response. */
  readonly pageToken?: string;
  /** Label IDs to filter by. */
  readonly labelIds?: readonly string[];
  /** Include threads from SPAM and TRASH. */
  readonly includeSpamTrash?: boolean;
};

/**
 * Parameters for retrieving a single message.
 */
export type GetMessageParams = {
  /** The message ID. */
  readonly id: string;
  /**
   * Response format.
   * - "full" (default) returns parsed payload
   * - "metadata" returns headers only (use metadataHeaders to select)
   * - "minimal" returns id, threadId, labelIds, snippet
   * - "raw" returns raw RFC 2822 in the `raw` field
   */
  readonly format?: 'full' | 'metadata' | 'minimal' | 'raw';
  /** Specific metadata headers to include (only with format="metadata"). */
  readonly metadataHeaders?: readonly string[];
};

/**
 * Parameters for retrieving a single thread.
 */
export type GetThreadParams = {
  /** The thread ID. */
  readonly id: string;
  /** Response format for messages in the thread. */
  readonly format?: 'full' | 'metadata' | 'minimal';
  /** Specific metadata headers to include (only with format="metadata"). */
  readonly metadataHeaders?: readonly string[];
};

/**
 * Parameters for modifying labels on a thread.
 */
export type ModifyThreadParams = {
  /** The thread ID. */
  readonly id: string;
  /** Label IDs to add. */
  readonly addLabelIds?: readonly string[];
  /** Label IDs to remove. */
  readonly removeLabelIds?: readonly string[];
};

// ---------------------------------------------------------------------------
// Label creation / update
// ---------------------------------------------------------------------------

/**
 * Parameters for creating a new label.
 */
export type CreateLabelParams = {
  /** Display name of the label. */
  readonly name: string;
  /** Visibility in the label list. */
  readonly labelListVisibility?: LabelListVisibility;
  /** Visibility in the message list. */
  readonly messageListVisibility?: MessageListVisibility;
  /** Optional color for the label. */
  readonly color?: LabelColor;
};

// ---------------------------------------------------------------------------
// Draft params
// ---------------------------------------------------------------------------

/**
 * Parameters for listing drafts.
 */
export type ListDraftsParams = {
  /** Maximum number of drafts to return. */
  readonly maxResults?: number;
  /** Page token from a previous response. */
  readonly pageToken?: string;
  /** Gmail search query to filter drafts. */
  readonly q?: string;
  /** Include drafts from SPAM and TRASH. */
  readonly includeSpamTrash?: boolean;
};

// ---------------------------------------------------------------------------
// GmailApi - The high-level API object exposed by the plugin
// ---------------------------------------------------------------------------

/**
 * High-level Gmail API interface returned by the plugin.
 * All methods use the authenticated HttpClient internally.
 */
export type GmailApi = {
  /** Search / list messages. */
  readonly searchMessages: (params?: MessageSearchParams) => Promise<import('@openworkspace/core').Result<MessageListResponse, import('@openworkspace/core').NetworkError>>;
  /** Get a single message by ID. */
  readonly getMessage: (params: GetMessageParams) => Promise<import('@openworkspace/core').Result<GmailMessage, import('@openworkspace/core').NetworkError>>;
  /** Batch-modify labels on messages. */
  readonly batchModify: (params: BatchModifyParams) => Promise<import('@openworkspace/core').Result<void, import('@openworkspace/core').NetworkError>>;
  /** Batch-delete messages permanently. */
  readonly batchDelete: (params: BatchDeleteParams) => Promise<import('@openworkspace/core').Result<void, import('@openworkspace/core').NetworkError>>;

  /** Search / list threads. */
  readonly searchThreads: (params?: ThreadSearchParams) => Promise<import('@openworkspace/core').Result<ThreadListResponse, import('@openworkspace/core').NetworkError>>;
  /** Get a single thread by ID. */
  readonly getThread: (params: GetThreadParams) => Promise<import('@openworkspace/core').Result<GmailThread, import('@openworkspace/core').NetworkError>>;
  /** Modify labels on a thread. */
  readonly modifyThread: (params: ModifyThreadParams) => Promise<import('@openworkspace/core').Result<GmailThread, import('@openworkspace/core').NetworkError>>;

  /** List all labels. */
  readonly listLabels: () => Promise<import('@openworkspace/core').Result<LabelListResponse, import('@openworkspace/core').NetworkError>>;
  /** Create a new label. */
  readonly createLabel: (params: CreateLabelParams) => Promise<import('@openworkspace/core').Result<GmailLabel, import('@openworkspace/core').NetworkError>>;
  /** Delete a label by ID. */
  readonly deleteLabel: (id: string) => Promise<import('@openworkspace/core').Result<void, import('@openworkspace/core').NetworkError>>;

  /** Send an email message. */
  readonly sendMessage: (options: SendOptions) => Promise<import('@openworkspace/core').Result<GmailMessage, import('@openworkspace/core').NetworkError>>;

  /** List drafts. */
  readonly listDrafts: (params?: ListDraftsParams) => Promise<import('@openworkspace/core').Result<DraftListResponse, import('@openworkspace/core').NetworkError>>;
  /** Create a new draft. */
  readonly createDraft: (options: SendOptions) => Promise<import('@openworkspace/core').Result<GmailDraft, import('@openworkspace/core').NetworkError>>;
  /** Send an existing draft. */
  readonly sendDraft: (draftId: string) => Promise<import('@openworkspace/core').Result<GmailMessage, import('@openworkspace/core').NetworkError>>;
};
