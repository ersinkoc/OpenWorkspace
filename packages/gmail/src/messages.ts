/**
 * Gmail message operations.
 * Provides search, get, batch-modify, and batch-delete for Gmail messages.
 *
 * @module
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import type {
  GmailMessage,
  MessageListResponse,
  MessageSearchParams,
  GetMessageParams,
  BatchModifyParams,
  BatchDeleteParams,
} from './types.js';
import { GMAIL_BASE_URL, GMAIL_USER_ME } from './types.js';

/**
 * Builds query-string parameters from a search params object.
 * Filters out `undefined` values.
 */
function buildSearchQuery(params: MessageSearchParams): string {
  const parts: string[] = [];
  if (params.q !== undefined) parts.push(`q=${encodeURIComponent(params.q)}`);
  if (params.maxResults !== undefined) parts.push(`maxResults=${params.maxResults}`);
  if (params.pageToken !== undefined) parts.push(`pageToken=${encodeURIComponent(params.pageToken)}`);
  if (params.includeSpamTrash !== undefined) parts.push(`includeSpamTrash=${params.includeSpamTrash}`);
  if (params.labelIds !== undefined) {
    for (const labelId of params.labelIds) {
      parts.push(`labelIds=${encodeURIComponent(labelId)}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Searches or lists messages in the authenticated user's mailbox.
 *
 * @param http - Authenticated HTTP client.
 * @param params - Optional search/filter parameters.
 * @returns A paginated list of message stubs (id + threadId).
 *
 * @example
 * ```ts
 * const result = await searchMessages(http, { q: 'from:alice subject:hello', maxResults: 10 });
 * if (result.ok) {
 *   for (const msg of result.value.messages ?? []) {
 *     console.log(msg.id);
 *   }
 * }
 * ```
 */
export async function searchMessages(
  http: HttpClient,
  params: MessageSearchParams = {},
): Promise<Result<MessageListResponse, NetworkError>> {
  const qs = buildSearchQuery(params);
  const url = `${GMAIL_BASE_URL}/${GMAIL_USER_ME}/messages${qs}`;
  const result = await http.get<MessageListResponse>(url);
  if (!result.ok) return result;
  return ok(result.value.data);
}

/**
 * Retrieves a single message by its ID.
 *
 * @param http - Authenticated HTTP client.
 * @param params - Message ID and optional format/metadata options.
 * @returns The full message resource.
 *
 * @example
 * ```ts
 * const result = await getMessage(http, { id: '18a1b2c3d4', format: 'full' });
 * if (result.ok) {
 *   console.log(result.value.snippet);
 * }
 * ```
 */
export async function getMessage(
  http: HttpClient,
  params: GetMessageParams,
): Promise<Result<GmailMessage, NetworkError>> {
  const qsParts: string[] = [];
  if (params.format !== undefined) qsParts.push(`format=${params.format}`);
  if (params.metadataHeaders !== undefined) {
    for (const header of params.metadataHeaders) {
      qsParts.push(`metadataHeaders=${encodeURIComponent(header)}`);
    }
  }
  const qs = qsParts.length > 0 ? `?${qsParts.join('&')}` : '';
  const url = `${GMAIL_BASE_URL}/${GMAIL_USER_ME}/messages/${encodeURIComponent(params.id)}${qs}`;
  const result = await http.get<GmailMessage>(url);
  if (!result.ok) return result;
  return ok(result.value.data);
}

/**
 * Modifies labels on a batch of messages.
 *
 * @param http - Authenticated HTTP client.
 * @param params - Message IDs and label changes.
 *
 * @example
 * ```ts
 * await batchModify(http, {
 *   ids: ['msg1', 'msg2'],
 *   addLabelIds: ['STARRED'],
 *   removeLabelIds: ['UNREAD'],
 * });
 * ```
 */
export async function batchModify(
  http: HttpClient,
  params: BatchModifyParams,
): Promise<Result<void, NetworkError>> {
  if (params.ids.length === 0) {
    return ok(undefined);
  }

  const url = `${GMAIL_BASE_URL}/${GMAIL_USER_ME}/messages/batchModify`;
  const result = await http.post<void>(url, {
    body: {
      ids: params.ids,
      addLabelIds: params.addLabelIds ?? [],
      removeLabelIds: params.removeLabelIds ?? [],
    },
  });
  if (!result.ok) return result;
  return ok(undefined);
}

/**
 * Permanently deletes a batch of messages.
 * This action is **irreversible** and bypasses Trash.
 *
 * @param http - Authenticated HTTP client.
 * @param params - Message IDs to delete.
 *
 * @example
 * ```ts
 * await batchDelete(http, { ids: ['msg1', 'msg2'] });
 * ```
 */
export async function batchDelete(
  http: HttpClient,
  params: BatchDeleteParams,
): Promise<Result<void, NetworkError>> {
  if (params.ids.length === 0) {
    return ok(undefined);
  }

  const url = `${GMAIL_BASE_URL}/${GMAIL_USER_ME}/messages/batchDelete`;
  const result = await http.post<void>(url, {
    body: { ids: params.ids },
  });
  if (!result.ok) return result;
  return ok(undefined);
}
