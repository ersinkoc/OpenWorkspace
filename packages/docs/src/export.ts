/**
 * Export operations for Google Docs API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { ExportFormat } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts a WorkspaceError from an HttpClient error result.
 */
function toWorkspaceError(error: unknown): WorkspaceError {
  if (error instanceof WorkspaceError) {
    return error;
  }
  return new WorkspaceError(
    error instanceof Error ? error.message : String(error),
    'DOCS_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Export operations
// ---------------------------------------------------------------------------

/**
 * Exports a Google Docs document in the specified format.
 * Uses the Drive API export endpoint to download the document.
 *
 * @param http - Authenticated HTTP client.
 * @param documentId - The ID of the document to export.
 * @param mimeType - The MIME type of the export format.
 * @returns The exported document content as a string.
 *
 * @example
 * ```ts
 * const result = await exportDocument(http, 'doc-id', 'application/pdf');
 * if (result.ok) {
 *   console.log('PDF content length:', result.value.length);
 * }
 * ```
 */
export async function exportDocument(
  http: HttpClient,
  documentId: string,
  mimeType: ExportFormat,
): Promise<Result<string, WorkspaceError>> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(documentId)}/export?mimeType=${encodeURIComponent(mimeType)}`;

  const result = await http.get<string>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
