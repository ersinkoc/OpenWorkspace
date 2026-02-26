/**
 * Gmail label operations.
 * Provides list, create, and delete for Gmail labels.
 *
 * @module
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, NetworkError } from '@openworkspace/core';
import type {
  GmailLabel,
  LabelListResponse,
  CreateLabelParams,
} from './types.js';
import { GMAIL_BASE_URL, GMAIL_USER_ME } from './types.js';

/**
 * Lists all labels in the authenticated user's mailbox.
 * Returns both system labels (INBOX, SENT, TRASH, etc.) and user-created labels.
 *
 * @param http - Authenticated HTTP client.
 * @returns All labels for the user.
 *
 * @example
 * ```ts
 * const result = await listLabels(http);
 * if (result.ok) {
 *   for (const label of result.value.labels ?? []) {
 *     console.log(label.name, label.type);
 *   }
 * }
 * ```
 */
export async function listLabels(
  http: HttpClient,
): Promise<Result<LabelListResponse, NetworkError>> {
  const url = `${GMAIL_BASE_URL}/${GMAIL_USER_ME}/labels`;
  const result = await http.get<LabelListResponse>(url);
  if (!result.ok) return result;
  return ok(result.value.data);
}

/**
 * Creates a new user label.
 *
 * @param http - Authenticated HTTP client.
 * @param params - Label name and optional visibility/color settings.
 * @returns The newly created label resource.
 *
 * @example
 * ```ts
 * const result = await createLabel(http, {
 *   name: 'Project/Alpha',
 *   labelListVisibility: 'labelShow',
 *   messageListVisibility: 'show',
 *   color: { textColor: '#000000', backgroundColor: '#16a765' },
 * });
 * if (result.ok) {
 *   console.log('Created label:', result.value.id);
 * }
 * ```
 */
export async function createLabel(
  http: HttpClient,
  params: CreateLabelParams,
): Promise<Result<GmailLabel, NetworkError>> {
  const url = `${GMAIL_BASE_URL}/${GMAIL_USER_ME}/labels`;
  const body: Record<string, unknown> = { name: params.name };
  if (params.labelListVisibility !== undefined) {
    body['labelListVisibility'] = params.labelListVisibility;
  }
  if (params.messageListVisibility !== undefined) {
    body['messageListVisibility'] = params.messageListVisibility;
  }
  if (params.color !== undefined) {
    body['color'] = params.color;
  }
  const result = await http.post<GmailLabel>(url, { body });
  if (!result.ok) return result;
  return ok(result.value.data);
}

/**
 * Permanently deletes a label by its ID.
 * System labels cannot be deleted.
 * Removing a label from a message does not delete the message.
 *
 * @param http - Authenticated HTTP client.
 * @param id - The label ID to delete.
 *
 * @example
 * ```ts
 * const result = await deleteLabel(http, 'Label_123');
 * if (result.ok) {
 *   console.log('Label deleted');
 * }
 * ```
 */
export async function deleteLabel(
  http: HttpClient,
  id: string,
): Promise<Result<void, NetworkError>> {
  const url = `${GMAIL_BASE_URL}/${GMAIL_USER_ME}/labels/${encodeURIComponent(id)}`;
  const result = await http.delete<void>(url);
  if (!result.ok) return result;
  return ok(undefined);
}
