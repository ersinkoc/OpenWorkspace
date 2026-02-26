/**
 * Direct message operations for Google Chat API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { Message, ListMessagesResponse, ListMessagesOptions, Space } from './types.js';
import { BASE_URL } from './types.js';
import { listSpaces } from './spaces.js';
import { sendMessage, listMessages } from './messages.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/**
 * Finds or creates a DM space with a user.
 *
 * @param http - Authenticated HTTP client.
 * @param userId - User ID (e.g., `users/123456789`).
 * @returns The DM space resource name.
 */
async function findOrCreateDmSpace(
  http: HttpClient,
  userId: string,
): Promise<Result<string, WorkspaceError>> {
  // List spaces and find DM with the user
  const spacesResult = await listSpaces(http, {
    filter: `spaceType = "DM"`,
  });
  if (!spacesResult.ok) {
    return err(spacesResult.error);
  }

  // Find existing DM space
  const dmSpace = spacesResult.value.spaces?.find((s: Space) =>
    s.type === 'DM' && s.name.includes(userId),
  );

  if (dmSpace) {
    return ok(dmSpace.name);
  }

  // Create new DM space
  const url = `${BASE_URL}/spaces`;
  const result = await http.post<Space>(url, {
    body: {
      spaceType: 'DM',
    },
  });

  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data.name);
}

// ---------------------------------------------------------------------------
// Direct message operations
// ---------------------------------------------------------------------------

/**
 * Creates a direct message to a user.
 * Automatically finds or creates a DM space with the user.
 *
 * @param http - Authenticated HTTP client.
 * @param userId - User ID (e.g., `users/123456789`).
 * @param text - Message text.
 * @returns The sent message.
 *
 * @example
 * ```ts
 * const result = await createDirectMessage(
 *   http,
 *   'users/123456789',
 *   'Hello!',
 * );
 * if (result.ok) console.log('Sent DM:', result.value.name);
 * ```
 */
export async function createDirectMessage(
  http: HttpClient,
  userId: string,
  text: string,
): Promise<Result<Message, WorkspaceError>> {
  const spaceResult = await findOrCreateDmSpace(http, userId);
  if (!spaceResult.ok) {
    return err(spaceResult.error);
  }

  return sendMessage(http, spaceResult.value, text);
}

/**
 * Lists direct messages with a user.
 *
 * @param http - Authenticated HTTP client.
 * @param userId - User ID (e.g., `users/123456789`).
 * @param options - Optional filtering / pagination parameters.
 * @returns A list of messages in the DM space.
 *
 * @example
 * ```ts
 * const result = await listDirectMessages(http, 'users/123456789', {
 *   pageSize: 10,
 * });
 * if (result.ok) {
 *   for (const msg of result.value.messages ?? []) {
 *     console.log(msg.text);
 *   }
 * }
 * ```
 */
export async function listDirectMessages(
  http: HttpClient,
  userId: string,
  options: ListMessagesOptions = {},
): Promise<Result<ListMessagesResponse, WorkspaceError>> {
  const spaceResult = await findOrCreateDmSpace(http, userId);
  if (!spaceResult.ok) {
    return err(spaceResult.error);
  }

  return listMessages(http, spaceResult.value, options);
}
