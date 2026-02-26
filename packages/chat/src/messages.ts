/**
 * Message operations for Google Chat API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { Message, ListMessagesResponse, ListMessagesOptions } from './types.js';
import { BASE_URL } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a query-string from an options object.
 * Drops `undefined` values and correctly encodes all values.
 */
function toQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Extracts a WorkspaceError from an HttpClient error result.
 * The HttpClient returns NetworkError which already extends WorkspaceError.
 */
function toWorkspaceError(error: unknown): WorkspaceError {
  if (error instanceof WorkspaceError) {
    return error;
  }
  return new WorkspaceError(
    error instanceof Error ? error.message : String(error),
    'CHAT_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Message operations
// ---------------------------------------------------------------------------

/**
 * Lists messages in a space.
 *
 * @param http - Authenticated HTTP client.
 * @param spaceName - Space resource name (e.g., `spaces/AAAA`).
 * @param options - Optional filtering / pagination parameters.
 * @returns A list of messages.
 *
 * @example
 * ```ts
 * const result = await listMessages(http, 'spaces/AAAA', {
 *   pageSize: 10,
 *   orderBy: 'createTime desc',
 * });
 * if (result.ok) {
 *   for (const msg of result.value.messages ?? []) {
 *     console.log(msg.text);
 *   }
 * }
 * ```
 */
export async function listMessages(
  http: HttpClient,
  spaceName: string,
  options: ListMessagesOptions = {},
): Promise<Result<ListMessagesResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/${spaceName}/messages${qs}`;

  const result = await http.get<ListMessagesResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets a single message by its resource name.
 *
 * @param http - Authenticated HTTP client.
 * @param messageName - Message resource name (e.g., `spaces/AAAA/messages/BBBB`).
 * @returns The requested message.
 *
 * @example
 * ```ts
 * const result = await getMessage(http, 'spaces/AAAA/messages/BBBB');
 * if (result.ok) console.log(result.value.text);
 * ```
 */
export async function getMessage(
  http: HttpClient,
  messageName: string,
): Promise<Result<Message, WorkspaceError>> {
  const url = `${BASE_URL}/${messageName}`;

  const result = await http.get<Message>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Sends a message to a space.
 *
 * @param http - Authenticated HTTP client.
 * @param spaceName - Space resource name (e.g., `spaces/AAAA`).
 * @param text - Message text.
 * @param threadKey - Optional thread key for threading the message.
 * @returns The newly created message.
 *
 * @example
 * ```ts
 * const result = await sendMessage(http, 'spaces/AAAA', 'Hello, world!');
 * if (result.ok) console.log('Sent:', result.value.name);
 * ```
 */
export async function sendMessage(
  http: HttpClient,
  spaceName: string,
  text: string,
  threadKey?: string,
): Promise<Result<Message, WorkspaceError>> {
  const url = `${BASE_URL}/${spaceName}/messages`;

  const body: Record<string, unknown> = { text };
  if (threadKey) {
    body.thread = { threadKey };
  }

  const result = await http.post<Message>(url, { body });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Updates an existing message.
 * Uses PATCH semantics -- only the text field is modified.
 *
 * @param http - Authenticated HTTP client.
 * @param messageName - Message resource name (e.g., `spaces/AAAA/messages/BBBB`).
 * @param text - New message text.
 * @returns The updated message.
 *
 * @example
 * ```ts
 * const result = await updateMessage(
 *   http,
 *   'spaces/AAAA/messages/BBBB',
 *   'Updated text',
 * );
 * if (result.ok) console.log('Updated:', result.value.text);
 * ```
 */
export async function updateMessage(
  http: HttpClient,
  messageName: string,
  text: string,
): Promise<Result<Message, WorkspaceError>> {
  const qs = toQueryString({ updateMask: 'text' });
  const url = `${BASE_URL}/${messageName}${qs}`;

  const result = await http.patch<Message>(url, {
    body: { text },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Deletes a message.
 *
 * @param http - Authenticated HTTP client.
 * @param messageName - Message resource name (e.g., `spaces/AAAA/messages/BBBB`).
 * @returns `void` on success.
 *
 * @example
 * ```ts
 * const result = await deleteMessage(http, 'spaces/AAAA/messages/BBBB');
 * if (result.ok) console.log('Deleted');
 * ```
 */
export async function deleteMessage(
  http: HttpClient,
  messageName: string,
): Promise<Result<void, WorkspaceError>> {
  const url = `${BASE_URL}/${messageName}`;

  const result = await http.delete(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(undefined);
}
