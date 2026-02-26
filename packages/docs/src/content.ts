/**
 * Content operations for Google Docs API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { BatchUpdateRequest, BatchUpdateResponse, Request } from './types.js';
import { BASE_URL } from './types.js';
import { getDocument } from './documents.js';

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
// Content operations
// ---------------------------------------------------------------------------

/**
 * Reads plain text content from the document body.
 * Extracts text from all paragraphs in the document.
 *
 * @param http - Authenticated HTTP client.
 * @param documentId - The ID of the document.
 * @returns The plain text content of the document.
 *
 * @example
 * ```ts
 * const result = await readText(http, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
 * if (result.ok) {
 *   console.log('Document text:', result.value);
 * }
 * ```
 */
export async function readText(
  http: HttpClient,
  documentId: string,
): Promise<Result<string, WorkspaceError>> {
  const docResult = await getDocument(http, documentId);
  if (!docResult.ok) {
    return err(docResult.error);
  }

  const doc = docResult.value;
  const textParts: string[] = [];

  for (const element of doc.body.content) {
    if (element.paragraph) {
      for (const paragraphElement of element.paragraph.elements) {
        if (paragraphElement.textRun) {
          textParts.push(paragraphElement.textRun.content);
        }
      }
    }
  }

  return ok(textParts.join(''));
}

/**
 * Sends a batch of update requests to modify the document.
 *
 * @param http - Authenticated HTTP client.
 * @param documentId - The ID of the document to update.
 * @param requests - The list of requests to execute.
 * @returns The batch update response with the new revision ID.
 *
 * @example
 * ```ts
 * const result = await batchUpdate(http, 'doc-id', [
 *   { insertText: { location: { index: 1 }, text: 'Hello, world!' } },
 * ]);
 * if (result.ok) {
 *   console.log('Updated to revision:', result.value.revisionId);
 * }
 * ```
 */
export async function batchUpdate(
  http: HttpClient,
  documentId: string,
  requests: readonly Request[],
): Promise<Result<BatchUpdateResponse, WorkspaceError>> {
  const url = `${BASE_URL}/documents/${encodeURIComponent(documentId)}:batchUpdate`;

  const body: BatchUpdateRequest = { requests };

  const result = await http.post<BatchUpdateResponse>(url, {
    body: body as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Inserts text at a specific index in the document.
 *
 * @param http - Authenticated HTTP client.
 * @param documentId - The ID of the document.
 * @param text - The text to insert.
 * @param index - The zero-based index at which to insert the text.
 * @returns The batch update response.
 *
 * @example
 * ```ts
 * const result = await insertText(http, 'doc-id', 'Hello, world!', 1);
 * if (result.ok) {
 *   console.log('Text inserted successfully');
 * }
 * ```
 */
export async function insertText(
  http: HttpClient,
  documentId: string,
  text: string,
  index: number,
): Promise<Result<BatchUpdateResponse, WorkspaceError>> {
  return batchUpdate(http, documentId, [
    {
      insertText: {
        location: { index },
        text,
      },
    },
  ]);
}

/**
 * Deletes content in a specific range.
 *
 * @param http - Authenticated HTTP client.
 * @param documentId - The ID of the document.
 * @param startIndex - The zero-based start index (inclusive) of the range to delete.
 * @param endIndex - The zero-based end index (exclusive) of the range to delete.
 * @returns The batch update response.
 *
 * @example
 * ```ts
 * const result = await deleteContent(http, 'doc-id', 10, 20);
 * if (result.ok) {
 *   console.log('Content deleted successfully');
 * }
 * ```
 */
export async function deleteContent(
  http: HttpClient,
  documentId: string,
  startIndex: number,
  endIndex: number,
): Promise<Result<BatchUpdateResponse, WorkspaceError>> {
  return batchUpdate(http, documentId, [
    {
      deleteContentRange: {
        range: { startIndex, endIndex },
      },
    },
  ]);
}

/**
 * Replaces all occurrences of search text with replacement text.
 *
 * @param http - Authenticated HTTP client.
 * @param documentId - The ID of the document.
 * @param searchText - The text to search for.
 * @param replaceText - The text to replace it with.
 * @returns The batch update response.
 *
 * @example
 * ```ts
 * const result = await replaceAllText(http, 'doc-id', 'foo', 'bar');
 * if (result.ok) {
 *   console.log('All occurrences replaced');
 * }
 * ```
 */
export async function replaceAllText(
  http: HttpClient,
  documentId: string,
  searchText: string,
  replaceText: string,
): Promise<Result<BatchUpdateResponse, WorkspaceError>> {
  return batchUpdate(http, documentId, [
    {
      replaceAllText: {
        containsText: {
          text: searchText,
          matchCase: false,
        },
        replaceText,
      },
    },
  ]);
}
