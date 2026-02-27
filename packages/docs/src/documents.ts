/**
 * Document operations for Google Docs API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { Document, DocumentTabsResponse } from './types.js';
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
    'DOCS_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Document operations
// ---------------------------------------------------------------------------

/**
 * Gets a document by its ID.
 *
 * @param http - Authenticated HTTP client.
 * @param documentId - The ID of the document to retrieve.
 * @returns The document with all its content.
 *
 * @example
 * ```ts
 * const result = await getDocument(http, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
 * if (result.ok) {
 *   console.log(result.value.title);
 * }
 * ```
 */
export async function getDocument(
  http: HttpClient,
  documentId: string,
): Promise<Result<Document, WorkspaceError>> {
  const url = `${BASE_URL}/documents/${encodeURIComponent(documentId)}`;

  const result = await http.get<Document>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new Google Docs document with the given title.
 *
 * @param http - Authenticated HTTP client.
 * @param title - The title for the new document.
 * @returns The newly created document.
 *
 * @example
 * ```ts
 * const result = await createDocument(http, 'My New Document');
 * if (result.ok) {
 *   console.log('Created document:', result.value.documentId);
 * }
 * ```
 */
export async function createDocument(
  http: HttpClient,
  title: string,
): Promise<Result<Document, WorkspaceError>> {
  const url = `${BASE_URL}/documents`;

  const result = await http.post<Document>(url, {
    body: { title },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Copies an existing document using the Drive API.
 * Note: This requires Drive API access and the appropriate OAuth scopes.
 *
 * @param http - Authenticated HTTP client.
 * @param documentId - The ID of the document to copy.
 * @param title - Optional title for the copied document. If not provided, defaults to "Copy of [original title]".
 * @returns The copied document.
 *
 * @example
 * ```ts
 * const result = await copyDocument(http, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', 'My Copy');
 * if (result.ok) {
 *   console.log('Copied document:', result.value.documentId);
 * }
 * ```
 */
export async function copyDocument(
  http: HttpClient,
  documentId: string,
  title?: string,
): Promise<Result<Document, WorkspaceError>> {
  // Use Drive API to copy the file
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(documentId)}/copy`;

  const copyResult = await http.post<{ id: string }>(driveUrl, {
    body: title ? { name: title } : {},
  });
  if (!copyResult.ok) {
    return err(toWorkspaceError(copyResult.error));
  }

  const newDocId = copyResult.value.data.id;

  // Fetch the full document details
  return getDocument(http, newDocId);
}

/**
 * Gets all tabs in a document.
 *
 * @param http - Authenticated HTTP client.
 * @param documentId - The ID of the document.
 * @returns The list of tabs in the document.
 *
 * @example
 * ```ts
 * const result = await getDocumentTabs(http, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
 * if (result.ok) {
 *   for (const tab of result.value.tabs) {
 *     console.log(tab.tab.tabProperties.title);
 *   }
 * }
 * ```
 */
export async function getDocumentTabs(
  http: HttpClient,
  documentId: string,
): Promise<Result<DocumentTabsResponse, WorkspaceError>> {
  const url = `${BASE_URL}/documents/${encodeURIComponent(documentId)}?includeTabsContent=true`;

  const result = await http.get<Document & { tabs?: DocumentTabsResponse['tabs'] }>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok({ tabs: result.value.data.tabs ?? [] });
}
