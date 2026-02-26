/**
 * Attachment operations for Google Keep API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { Attachment } from './types.js';
import { BASE_URL } from './types.js';

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
    'KEEP_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Attachment operations
// ---------------------------------------------------------------------------

/**
 * Gets attachment metadata.
 *
 * @param http - Authenticated HTTP client.
 * @param attachmentName - Attachment resource name (format: `notes/{note_id}/attachments/{attachment_id}`).
 * @returns The attachment metadata.
 *
 * @example
 * ```ts
 * const result = await getAttachment(http, 'notes/abc123/attachments/xyz789');
 * if (result.ok) {
 *   console.log('MIME types:', result.value.mimeType);
 * }
 * ```
 */
export async function getAttachment(
  http: HttpClient,
  attachmentName: string,
): Promise<Result<Attachment, WorkspaceError>> {
  const url = `${BASE_URL}/${attachmentName}`;

  const result = await http.get<Attachment>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Downloads attachment content as a buffer.
 *
 * @param http - Authenticated HTTP client.
 * @param attachmentName - Attachment resource name (format: `notes/{note_id}/attachments/{attachment_id}`).
 * @returns The attachment content as ArrayBuffer.
 *
 * @example
 * ```ts
 * const result = await downloadAttachment(http, 'notes/abc123/attachments/xyz789');
 * if (result.ok) {
 *   const buffer = Buffer.from(result.value);
 *   console.log('Downloaded', buffer.length, 'bytes');
 * }
 * ```
 */
export async function downloadAttachment(
  http: HttpClient,
  attachmentName: string,
): Promise<Result<ArrayBuffer, WorkspaceError>> {
  // Google Keep API uses a special download endpoint with mimeType parameter
  const url = `${BASE_URL}/${attachmentName}?mimeType=*/*`;

  const result = await http.get<ArrayBuffer>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
