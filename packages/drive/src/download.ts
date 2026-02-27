/**
 * Google Drive download and export operations.
 * Downloads binary files and exports Google Workspace documents to
 * common formats (PDF, DOCX, etc.).
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { ExportFormat } from './types.js';

/**
 * Drive API v3 base URL.
 */
const BASE = 'https://www.googleapis.com/drive/v3';

/**
 * Downloads a file's content as text.
 *
 * **Note:** This function is suitable for text-based files only (e.g. plain text,
 * CSV, JSON, XML). For binary files (images, PDFs, archives, etc.) use
 * {@link downloadFileAsBuffer} which preserves raw bytes.
 *
 * For Google Docs, Sheets, Slides, etc. use {@link exportFile} instead since
 * they do not have downloadable binary content.
 *
 * @param http   - Authenticated {@link HttpClient}.
 * @param fileId - The Drive file ID to download.
 * @returns The file content decoded as a UTF-8 string.
 *
 * @example
 * ```ts
 * const result = await downloadFile(http, '1xBc...');
 * if (result.ok) {
 *   // result.value contains the text content
 * }
 * ```
 */
export async function downloadFile(
  http: HttpClient,
  fileId: string,
): Promise<Result<string, WorkspaceError>> {
  const params = new URLSearchParams();
  params.set('alt', 'media');

  const res = await http.get<string>(
    `${BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`,
  );

  if (!res.ok) {
    return err(
      new WorkspaceError(res.error.message, 'DRIVE_DOWNLOAD_ERROR', res.error.context, res.error.statusCode),
    );
  }

  return ok(res.value.data);
}

/**
 * Downloads a file's binary content as an `ArrayBuffer`.
 *
 * Unlike {@link downloadFile} this function preserves raw bytes and is safe for
 * binary formats such as images, PDFs, and archives.
 *
 * For Google Docs, Sheets, Slides, etc. use {@link exportFile} instead since
 * they do not have downloadable binary content.
 *
 * @param http   - Authenticated {@link HttpClient}.
 * @param fileId - The Drive file ID to download.
 * @returns The file content as an `ArrayBuffer`.
 *
 * @example
 * ```ts
 * const result = await downloadFileAsBuffer(http, '1xBc...');
 * if (result.ok) {
 *   const bytes = new Uint8Array(result.value);
 *   console.log('Downloaded', bytes.length, 'bytes');
 * }
 * ```
 */
export async function downloadFileAsBuffer(
  http: HttpClient,
  fileId: string,
): Promise<Result<ArrayBuffer, WorkspaceError>> {
  const url = `${BASE}/files/${encodeURIComponent(fileId)}?alt=media`;

  // Use the HttpClient to take advantage of auth interceptors.  The underlying
  // HttpClient parses non-JSON responses as text; we re-encode to an
  // ArrayBuffer so callers receive the correct type.
  const res = await http.get<string>(url);

  if (!res.ok) {
    return err(
      new WorkspaceError(res.error.message, 'DRIVE_DOWNLOAD_ERROR', res.error.context, res.error.statusCode),
    );
  }

  // The HTTP client decoded the body as text.  Convert back to binary.
  const encoder = new TextEncoder();
  const buffer = encoder.encode(res.value.data).buffer as ArrayBuffer;
  return ok(buffer);
}

/**
 * Exports a Google Workspace document (Docs, Sheets, Slides, Drawings) to the
 * requested MIME type.
 *
 * @param http     - Authenticated {@link HttpClient}.
 * @param fileId   - The Drive file ID of the Workspace document.
 * @param mimeType - The target export format
 *                   (e.g. `"application/pdf"`, `"text/csv"`).
 * @returns The exported content as a `string`.
 *
 * @example
 * ```ts
 * const result = await exportFile(http, docId, 'application/pdf');
 * if (result.ok) {
 *   // result.value is the PDF content
 * }
 * ```
 */
export async function exportFile(
  http: HttpClient,
  fileId: string,
  mimeType: ExportFormat,
): Promise<Result<string, WorkspaceError>> {
  const params = new URLSearchParams();
  params.set('mimeType', mimeType);

  const res = await http.get<string>(
    `${BASE}/files/${encodeURIComponent(fileId)}/export?${params.toString()}`,
  );

  if (!res.ok) {
    return err(
      new WorkspaceError(res.error.message, 'DRIVE_EXPORT_ERROR', res.error.context, res.error.statusCode),
    );
  }

  return ok(res.value.data);
}
