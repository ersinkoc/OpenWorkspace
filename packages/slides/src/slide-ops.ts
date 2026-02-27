/**
 * Slide operations for Google Slides API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { BatchUpdateRequest, BatchUpdateResponse, Request } from './types.js';
import { BASE_URL } from './types.js';
import { getPresentation } from './presentations.js';

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
// Slide operations
// ---------------------------------------------------------------------------

/**
 * Sends a batch update request to modify the presentation.
 *
 * @param http - Authenticated HTTP client.
 * @param presentationId - The ID of the presentation.
 * @param requests - Array of requests to execute.
 * @returns The batch update response.
 *
 * @example
 * ```ts
 * const result = await batchUpdate(http, 'abc123', [
 *   { createSlide: { insertionIndex: 0 } },
 *   { insertText: { objectId: 'shape1', text: 'Hello' } },
 * ]);
 * if (result.ok) {
 *   console.log('Requests executed:', result.value.replies?.length);
 * }
 * ```
 */
export async function batchUpdate(
  http: HttpClient,
  presentationId: string,
  requests: readonly Request[],
): Promise<Result<BatchUpdateResponse, WorkspaceError>> {
  const url = `${BASE_URL}/presentations/${encodeURIComponent(presentationId)}:batchUpdate`;

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
 * Adds a new blank slide to the presentation.
 *
 * @param http - Authenticated HTTP client.
 * @param presentationId - The ID of the presentation.
 * @param layoutId - Optional layout ID to use (if omitted, uses blank layout).
 * @param insertionIndex - Optional index where the slide should be inserted (0-based).
 * @returns The object ID of the newly created slide.
 *
 * @example
 * ```ts
 * const result = await addSlide(http, 'abc123');
 * if (result.ok) {
 *   console.log('Created slide:', result.value);
 * }
 * ```
 */
export async function addSlide(
  http: HttpClient,
  presentationId: string,
  layoutId?: string,
  insertionIndex?: number,
): Promise<Result<string, WorkspaceError>> {
  const requests: Request[] = [
    {
      createSlide: {
        insertionIndex,
        slideLayoutReference: layoutId
          ? { layoutId }
          : { predefinedLayout: 'BLANK' },
      },
    },
  ];

  const result = await batchUpdate(http, presentationId, requests);
  if (!result.ok) {
    return err(result.error);
  }

  const slideId = result.value.replies?.[0]?.createSlide?.objectId;
  if (!slideId) {
    return err(new WorkspaceError('Failed to create slide: no objectId returned', 'SLIDES_ERROR'));
  }

  return ok(slideId);
}

/**
 * Deletes a slide from the presentation.
 *
 * @param http - Authenticated HTTP client.
 * @param presentationId - The ID of the presentation.
 * @param slideId - The object ID of the slide to delete.
 * @returns Void on success.
 *
 * @example
 * ```ts
 * const result = await deleteSlide(http, 'abc123', 'slide_001');
 * if (result.ok) {
 *   console.log('Slide deleted');
 * }
 * ```
 */
export async function deleteSlide(
  http: HttpClient,
  presentationId: string,
  slideId: string,
): Promise<Result<void, WorkspaceError>> {
  const requests: Request[] = [
    {
      deleteObject: {
        objectId: slideId,
      },
    },
  ];

  const result = await batchUpdate(http, presentationId, requests);
  if (!result.ok) {
    return err(result.error);
  }

  return ok(undefined);
}

/**
 * Replaces all instances of text matching searchText with replaceText.
 *
 * @param http - Authenticated HTTP client.
 * @param presentationId - The ID of the presentation.
 * @param searchText - The text to search for.
 * @param replaceText - The text to replace it with.
 * @returns The number of replacements made.
 *
 * @example
 * ```ts
 * const result = await replaceAllText(http, 'abc123', '{{name}}', 'John Doe');
 * if (result.ok) {
 *   console.log(`Replaced ${result.value} occurrences`);
 * }
 * ```
 */
export async function replaceAllText(
  http: HttpClient,
  presentationId: string,
  searchText: string,
  replaceText: string,
): Promise<Result<number, WorkspaceError>> {
  const requests: Request[] = [
    {
      replaceAllText: {
        containsText: {
          text: searchText,
          matchCase: false,
        },
        replaceText,
      },
    },
  ];

  const result = await batchUpdate(http, presentationId, requests);
  if (!result.ok) {
    return err(result.error);
  }

  const occurrences = result.value.replies?.[0]?.replaceAllText?.occurrencesChanged ?? 0;
  return ok(occurrences);
}

/**
 * Updates the speaker notes for a slide.
 *
 * @param http - Authenticated HTTP client.
 * @param presentationId - The ID of the presentation.
 * @param slideId - The object ID of the slide.
 * @param notes - The speaker notes text to set.
 * @returns Void on success.
 *
 * @example
 * ```ts
 * const result = await updateSpeakerNotes(http, 'abc123', 'slide_001', 'Remember to smile!');
 * if (result.ok) {
 *   console.log('Notes updated');
 * }
 * ```
 */
export async function updateSpeakerNotes(
  http: HttpClient,
  presentationId: string,
  slideId: string,
  notes: string,
): Promise<Result<void, WorkspaceError>> {
  // First, get the presentation to find the notes page for this slide
  const presResult = await getPresentation(http, presentationId);
  if (!presResult.ok) {
    return err(presResult.error);
  }

  const slide = presResult.value.slides?.find((s) => s.objectId === slideId);
  if (!slide) {
    return err(new WorkspaceError(`Slide ${slideId} not found`, 'SLIDES_ERROR'));
  }

  const notesObjectId = slide.slideProperties?.notesPage?.notesProperties?.speakerNotesObjectId;
  if (!notesObjectId) {
    return err(
      new WorkspaceError(`No speaker notes object found for slide ${slideId}`, 'SLIDES_ERROR'),
    );
  }

  // Delete existing text and insert new text
  const requests: Request[] = [
    {
      deleteText: {
        objectId: notesObjectId,
        textRange: { type: 'ALL' },
      },
    },
    {
      insertText: {
        objectId: notesObjectId,
        text: notes,
        insertionIndex: 0,
      },
    },
  ];

  const result = await batchUpdate(http, presentationId, requests);
  if (!result.ok) {
    return err(result.error);
  }

  return ok(undefined);
}
