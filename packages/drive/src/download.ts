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
 * Downloads the binary content of a non-Google-Workspace file.
 *
 * For Google Docs, Sheets, Slides, etc. use {@link exportFile} instead since
 * they do not have downloadable binary content.
 *
 * @param http   - Authenticated {@link HttpClient}.
 * @param fileId - The Drive file ID to download.
 * @returns The raw file content as a `string` (the HTTP client returns text
 *          for non-JSON responses). Callers can encode as needed.
 *
 * @example
 * ```ts
 * const result = await downloadFile(http, '1xBc...');
 * if (result.ok) {
 *   // result.value contains the file content
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
