/**
 * Gmail draft operations.
 * Provides list, create, and send for Gmail drafts.
 *
 * @module
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, NetworkError } from '@openworkspace/core';
import type {
  GmailDraft,
  GmailMessage,
  DraftListResponse,
  ListDraftsParams,
  SendOptions,
} from './types.js';
import { GMAIL_BASE_URL, GMAIL_USER_ME } from './types.js';

/**
 * Encodes a UTF-8 string to base64url (RFC 4648 section 5).
 */
function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Joins one or more email addresses into a comma-separated string.
 */
function formatRecipients(recipients: string | readonly string[]): string {
  return typeof recipients === 'string' ? recipients : recipients.join(', ');
}

/**
 * Builds a minimal RFC 2822 message from SendOptions for draft creation.
 * Supports plain text and HTML bodies. Attachments in drafts follow the same
 * structure as in send.ts but are omitted here for clarity; users can include
 * the raw RFC 2822 message with attachments if needed.
 */
function buildDraftRfc2822(options: SendOptions): string {
  const lines: string[] = [];
  lines.push(`To: ${formatRecipients(options.to)}`);
  lines.push(`Subject: ${options.subject}`);
  if (options.cc !== undefined) lines.push(`Cc: ${formatRecipients(options.cc)}`);
  if (options.bcc !== undefined) lines.push(`Bcc: ${formatRecipients(options.bcc)}`);
  if (options.replyTo !== undefined) lines.push(`Reply-To: ${options.replyTo}`);
  if (options.inReplyTo !== undefined) lines.push(`In-Reply-To: ${options.inReplyTo}`);
  if (options.references !== undefined) lines.push(`References: ${options.references}`);
  lines.push('MIME-Version: 1.0');

  const hasHtml = options.html !== undefined;
  const hasBody = options.body !== undefined;

  if (hasBody && hasHtml) {
    const boundary = `----=_Draft_${Date.now()}`;
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: 7bit');
    lines.push('');
    lines.push(options.body!);
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: 7bit');
    lines.push('');
    lines.push(options.html!);
    lines.push(`--${boundary}--`);
  } else if (hasHtml) {
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: 7bit');
    lines.push('');
    lines.push(options.html!);
  } else {
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: 7bit');
    lines.push('');
    lines.push(options.body ?? '');
  }

  return lines.join('\r\n');
}

/**
 * Lists drafts in the authenticated user's mailbox.
 *
 * @param http - Authenticated HTTP client.
 * @param params - Optional pagination and search parameters.
 * @returns A paginated list of draft stubs.
 *
 * @example
 * ```ts
 * const result = await listDrafts(http, { maxResults: 10 });
 * if (result.ok) {
 *   for (const draft of result.value.drafts ?? []) {
 *     console.log(draft.id);
 *   }
 * }
 * ```
 */
export async function listDrafts(
  http: HttpClient,
  params: ListDraftsParams = {},
): Promise<Result<DraftListResponse, NetworkError>> {
  const qsParts: string[] = [];
  if (params.maxResults !== undefined) qsParts.push(`maxResults=${params.maxResults}`);
  if (params.pageToken !== undefined) qsParts.push(`pageToken=${encodeURIComponent(params.pageToken)}`);
  if (params.q !== undefined) qsParts.push(`q=${encodeURIComponent(params.q)}`);
  if (params.includeSpamTrash !== undefined) qsParts.push(`includeSpamTrash=${params.includeSpamTrash}`);
  const qs = qsParts.length > 0 ? `?${qsParts.join('&')}` : '';

  const url = `${GMAIL_BASE_URL}/${GMAIL_USER_ME}/drafts${qs}`;
  const result = await http.get<DraftListResponse>(url);
  if (!result.ok) return result;
  return ok(result.value.data);
}

/**
 * Creates a new draft message.
 *
 * @param http - Authenticated HTTP client.
 * @param options - Email composition options for the draft.
 * @returns The newly created draft resource.
 *
 * @example
 * ```ts
 * const result = await createDraft(http, {
 *   to: 'bob@example.com',
 *   subject: 'Draft: Meeting notes',
 *   body: 'Here are the notes from today...',
 * });
 * if (result.ok) {
 *   console.log('Draft created:', result.value.id);
 * }
 * ```
 */
export async function createDraft(
  http: HttpClient,
  options: SendOptions,
): Promise<Result<GmailDraft, NetworkError>> {
  const rfc2822 = buildDraftRfc2822(options);
  const raw = toBase64Url(rfc2822);

  const url = `${GMAIL_BASE_URL}/${GMAIL_USER_ME}/drafts`;
  const result = await http.post<GmailDraft>(url, {
    body: {
      message: { raw },
    },
  });
  if (!result.ok) return result;
  return ok(result.value.data);
}

/**
 * Sends an existing draft.
 * The draft is removed from the drafts list after sending.
 *
 * @param http - Authenticated HTTP client.
 * @param draftId - The ID of the draft to send.
 * @returns The sent message resource.
 *
 * @example
 * ```ts
 * const result = await sendDraft(http, 'draft_abc123');
 * if (result.ok) {
 *   console.log('Draft sent, message ID:', result.value.id);
 * }
 * ```
 */
export async function sendDraft(
  http: HttpClient,
  draftId: string,
): Promise<Result<GmailMessage, NetworkError>> {
  const url = `${GMAIL_BASE_URL}/${GMAIL_USER_ME}/drafts/send`;
  const result = await http.post<GmailMessage>(url, {
    body: { id: draftId },
  });
  if (!result.ok) return result;
  return ok(result.value.data);
}
