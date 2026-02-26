/**
 * Gmail send operations.
 * Builds RFC 2822 messages and sends them via the Gmail API.
 *
 * @module
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, NetworkError } from '@openworkspace/core';
import type { GmailMessage, SendOptions, SendAttachment } from './types.js';
import { GMAIL_BASE_URL, GMAIL_USER_ME } from './types.js';

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
 * Joins one or more email addresses into a comma-separated string.
 */
function formatRecipients(recipients: string | readonly string[]): string {
  return typeof recipients === 'string' ? recipients : recipients.join(', ');
}

/**
 * Encodes a UTF-8 string to base64url (RFC 4648 section 5).
 * Uses Node.js Buffer, which is available in Node >= 22.
 */
function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Builds a complete RFC 2822 message string from SendOptions.
 * Supports plain text, HTML, multipart/alternative, and attachments.
 */
function buildRfc2822Message(options: SendOptions): string {
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
 * Sends an email message through the Gmail API.
 *
 * Constructs an RFC 2822 message from the provided options, base64url-encodes it,
 * and sends it via `users.messages.send`.
 *
 * @param http - Authenticated HTTP client.
 * @param options - Email composition options (to, subject, body/html, cc, bcc, attachments).
 * @returns The sent message resource (with id and threadId).
 *
 * @example
 * ```ts
 * const result = await sendMessage(http, {
 *   to: 'bob@example.com',
 *   subject: 'Hello from OpenWorkspace',
 *   body: 'Plain text content',
 *   html: '<h1>Hello!</h1><p>HTML content</p>',
 * });
 * if (result.ok) {
 *   console.log('Sent message ID:', result.value.id);
 * }
 * ```
 *
 * @example Sending with attachments
 * ```ts
 * const result = await sendMessage(http, {
 *   to: ['alice@example.com', 'bob@example.com'],
 *   cc: 'carol@example.com',
 *   subject: 'Report attached',
 *   body: 'Please find the report attached.',
 *   attachments: [{
 *     filename: 'report.pdf',
 *     mimeType: 'application/pdf',
 *     content: base64EncodedPdfString,
 *   }],
 * });
 * ```
 */
export async function sendMessage(
  http: HttpClient,
  options: SendOptions,
): Promise<Result<GmailMessage, NetworkError>> {
  const rfc2822 = buildRfc2822Message(options);
  const raw = toBase64Url(rfc2822);

  const url = `${GMAIL_BASE_URL}/${GMAIL_USER_ME}/messages/send`;
  const result = await http.post<GmailMessage>(url, {
    body: { raw },
  });
  if (!result.ok) return result;
  return ok(result.value.data);
}
