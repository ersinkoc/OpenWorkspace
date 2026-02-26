/**
 * @openworkspace/gmail
 * Gmail service package for OpenWorkspace.
 * Provides typed operations for messages, threads, labels, drafts, and sending.
 */

// Types
export type {
  // Message types
  MessageHeader,
  MessagePartBody,
  MessagePart,
  GmailMessage,
  MessageListResponse,
  MessageSearchParams,
  GetMessageParams,
  BatchModifyParams,
  BatchDeleteParams,

  // Thread types
  GmailThread,
  ThreadListResponse,
  ThreadSearchParams,
  GetThreadParams,
  ModifyThreadParams,

  // Label types
  LabelListVisibility,
  MessageListVisibility,
  LabelType,
  LabelColor,
  GmailLabel,
  LabelListResponse,
  CreateLabelParams,

  // Draft types
  GmailDraft,
  DraftListResponse,
  ListDraftsParams,

  // Attachment types
  GmailAttachment,

  // Send types
  SendAttachment,
  SendOptions,

  // API type
  GmailApi,
} from './types.js';

export { GMAIL_BASE_URL, GMAIL_USER_ME } from './types.js';

// Message operations
export { searchMessages, getMessage, batchModify, batchDelete } from './messages.js';

// Thread operations
export { searchThreads, getThread, modifyThread } from './threads.js';

// Label operations
export { listLabels, createLabel, deleteLabel } from './labels.js';

// Send operations
export { sendMessage } from './send.js';

// Draft operations
export { listDrafts, createDraft, sendDraft } from './drafts.js';

// Plugin
export type { GmailPluginOptions } from './plugin.js';
export { gmail, createGmailApi, GMAIL_METADATA_KEY } from './plugin.js';
