/**
 * Gmail thread operations.
 * Provides search, get, and label-modify for Gmail threads (conversations).
 *
 * @module
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, NetworkError } from '@openworkspace/core';
import type {
  GmailThread,
  ThreadListResponse,
  ThreadSearchParams,
  GetThreadParams,
  ModifyThreadParams,
} from './types.js';
import { GMAIL_BASE_URL, GMAIL_USER_ME } from './types.js';

/**
 * Builds query-string parameters from thread search params.
 */
function buildThreadQuery(params: ThreadSearchParams): string {
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
 * Searches or lists threads in the authenticated user's mailbox.
 *
 * @param http - Authenticated HTTP client.
 * @param params - Optional search/filter parameters.
 * @returns A paginated list of thread stubs.
 *
 * @example
 * ```ts
 * const result = await searchThreads(http, { q: 'is:unread', maxResults: 20 });
 * if (result.ok) {
 *   for (const thread of result.value.threads ?? []) {
 *     console.log(thread.id, thread.snippet);
 *   }
 * }
 * ```
 */
export async function searchThreads(
  http: HttpClient,
  params: ThreadSearchParams = {},
): Promise<Result<ThreadListResponse, NetworkError>> {
  const qs = buildThreadQuery(params);
  const url = `${GMAIL_BASE_URL}/${GMAIL_USER_ME}/threads${qs}`;
  const result = await http.get<ThreadListResponse>(url);
  if (!result.ok) return result;
  return ok(result.value.data);
}

/**
 * Retrieves a single thread by its ID, including all messages.
 *
 * @param http - Authenticated HTTP client.
 * @param params - Thread ID and optional format options.
 * @returns The full thread resource with messages.
 *
 * @example
 * ```ts
 * const result = await getThread(http, { id: '18a1b2c3d4', format: 'metadata' });
 * if (result.ok) {
 *   const messages = result.value.messages ?? [];
 *   console.log(`Thread has ${messages.length} messages`);
 * }
 * ```
 */
export async function getThread(
  http: HttpClient,
  params: GetThreadParams,
): Promise<Result<GmailThread, NetworkError>> {
  const qsParts: string[] = [];
  if (params.format !== undefined) qsParts.push(`format=${params.format}`);
  if (params.metadataHeaders !== undefined) {
    for (const header of params.metadataHeaders) {
      qsParts.push(`metadataHeaders=${encodeURIComponent(header)}`);
    }
  }
  const qs = qsParts.length > 0 ? `?${qsParts.join('&')}` : '';
  const url = `${GMAIL_BASE_URL}/${GMAIL_USER_ME}/threads/${encodeURIComponent(params.id)}${qs}`;
  const result = await http.get<GmailThread>(url);
  if (!result.ok) return result;
  return ok(result.value.data);
}

/**
 * Modifies labels on a thread.
 * Adds and/or removes label IDs from all messages in the thread.
 *
 * @param http - Authenticated HTTP client.
 * @param params - Thread ID and label changes.
 * @returns The updated thread resource.
 *
 * @example
 * ```ts
 * const result = await modifyThread(http, {
 *   id: '18a1b2c3d4',
 *   addLabelIds: ['STARRED'],
 *   removeLabelIds: ['UNREAD'],
 * });
 * ```
 */
export async function modifyThread(
  http: HttpClient,
  params: ModifyThreadParams,
): Promise<Result<GmailThread, NetworkError>> {
  const url = `${GMAIL_BASE_URL}/${GMAIL_USER_ME}/threads/${encodeURIComponent(params.id)}/modify`;
  const result = await http.post<GmailThread>(url, {
    body: {
      addLabelIds: params.addLabelIds ?? [],
      removeLabelIds: params.removeLabelIds ?? [],
    },
  });
  if (!result.ok) return result;
  return ok(result.value.data);
}
