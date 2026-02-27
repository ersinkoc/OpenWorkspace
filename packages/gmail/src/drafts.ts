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
  SendAttachment,
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
 * Generates a random MIME boundary string.
 * Uses a timestamp + random hex to avoid collisions.
 */
function generateBoundary(): string {
  const hex = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0'),
  ).join('');
  return `----=_Part_${Date.now()}_${hex}`;
}

/**
 * Appends the body section(s) of the message.
 * Handles plain text only, HTML only, or multipart/alternative.
 */
function appendBodyParts(
  lines: string[],
  options: SendOptions,
  altBoundary: string | undefined,
): void {
  const hasHtml = options.html !== undefined;
  const hasBody = options.body !== undefined;

  if (altBoundary !== undefined && hasBody && hasHtml) {
    // multipart/alternative
    lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
    lines.push('');
    lines.push(`--${altBoundary}`);
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: 7bit');
    lines.push('');
    lines.push(options.body!);
    lines.push(`--${altBoundary}`);
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: 7bit');
    lines.push('');
    lines.push(options.html!);
    lines.push(`--${altBoundary}--`);
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
}

/**
 * Appends a single attachment part to the MIME message.
 */
function appendAttachmentPart(lines: string[], attachment: SendAttachment): void {
  lines.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`);
  lines.push('Content-Transfer-Encoding: base64');
  lines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
  lines.push('');
  // Break base64 into 76-char lines per RFC 2045
  const raw = attachment.content;
  for (let i = 0; i < raw.length; i += 76) {
    lines.push(raw.slice(i, i + 76));
  }
}

/**
 * Builds an RFC 2822 message from SendOptions for draft creation.
 * Supports plain text, HTML bodies, and attachments.
 */
function buildDraftRfc2822(options: SendOptions): string {
  const lines: string[] = [];
  const hasAttachments = options.attachments !== undefined && options.attachments.length > 0;
  const hasHtml = options.html !== undefined;
  const hasBody = options.body !== undefined;
  const isMultipartBody = hasBody && hasHtml;

  // Determine MIME structure
  const mixedBoundary = hasAttachments ? generateBoundary() : undefined;
  const altBoundary = isMultipartBody ? generateBoundary() : undefined;

  // Headers
  lines.push(`To: ${formatRecipients(options.to)}`);
  lines.push(`Subject: ${options.subject}`);
  if (options.cc !== undefined) lines.push(`Cc: ${formatRecipients(options.cc)}`);
  if (options.bcc !== undefined) lines.push(`Bcc: ${formatRecipients(options.bcc)}`);
  if (options.replyTo !== undefined) lines.push(`Reply-To: ${options.replyTo}`);
  if (options.inReplyTo !== undefined) lines.push(`In-Reply-To: ${options.inReplyTo}`);
  if (options.references !== undefined) lines.push(`References: ${options.references}`);
  lines.push('MIME-Version: 1.0');

  if (hasAttachments && mixedBoundary !== undefined) {
    // multipart/mixed wrapping everything
    lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
    lines.push('');

    // Body part(s)
    lines.push(`--${mixedBoundary}`);
    appendBodyParts(lines, options, altBoundary);

    // Attachment parts
    for (const attachment of options.attachments!) {
      lines.push(`--${mixedBoundary}`);
      appendAttachmentPart(lines, attachment);
    }

    lines.push(`--${mixedBoundary}--`);
  } else {
    // No attachments - body only
    appendBodyParts(lines, options, altBoundary);
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
