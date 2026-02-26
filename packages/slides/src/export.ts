/**
 * Export operations for Google Slides API v1.
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
    'SLIDES_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Export operations
// ---------------------------------------------------------------------------

/**
 * Exports a presentation to PDF or PPTX format.
 *
 * @param http - Authenticated HTTP client.
 * @param presentationId - The ID of the presentation to export.
 * @param mimeType - The export format (PDF or PPTX).
 * @returns The exported file as a Blob.
 *
 * @example
 * ```ts
 * const result = await exportPresentation(http, 'abc123', 'application/pdf');
 * if (result.ok) {
 *   // Save result.value blob to file system
 *   console.log('Exported presentation');
 * }
 * ```
 */
export async function exportPresentation(
  http: HttpClient,
  presentationId: string,
  mimeType: ExportFormat,
): Promise<Result<Blob, WorkspaceError>> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(presentationId)}/export?mimeType=${encodeURIComponent(mimeType)}`;

  const result = await http.get<Blob>(url, {
    headers: {
      Accept: mimeType,
    },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
