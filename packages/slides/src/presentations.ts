/**
 * Presentation operations for Google Slides API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { Presentation, Page } from './types.js';
import { BASE_URL } from './types.js';

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
// Presentation operations
// ---------------------------------------------------------------------------

/**
 * Gets the full presentation data including slides, masters, and layouts.
 *
 * @param http - Authenticated HTTP client.
 * @param presentationId - The ID of the presentation.
 * @returns The complete presentation data.
 *
 * @example
 * ```ts
 * const result = await getPresentation(http, 'abc123');
 * if (result.ok) {
 *   console.log(result.value.title);
 *   console.log(`Slides: ${result.value.slides?.length ?? 0}`);
 * }
 * ```
 */
export async function getPresentation(
  http: HttpClient,
  presentationId: string,
): Promise<Result<Presentation, WorkspaceError>> {
  const url = `${BASE_URL}/presentations/${encodeURIComponent(presentationId)}`;

  const result = await http.get<Presentation>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new blank presentation with the given title.
 *
 * @param http - Authenticated HTTP client.
 * @param title - The title for the new presentation.
 * @returns The newly created presentation.
 *
 * @example
 * ```ts
 * const result = await createPresentation(http, 'My New Presentation');
 * if (result.ok) {
 *   console.log('Created presentation ID:', result.value.presentationId);
 * }
 * ```
 */
export async function createPresentation(
  http: HttpClient,
  title: string,
): Promise<Result<Presentation, WorkspaceError>> {
  const url = `${BASE_URL}/presentations`;

  const result = await http.post<Presentation>(url, {
    body: { title },
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets a single slide by its object ID.
 *
 * @param http - Authenticated HTTP client.
 * @param presentationId - The ID of the presentation.
 * @param slideId - The object ID of the slide.
 * @returns The requested slide page.
 *
 * @example
 * ```ts
 * const result = await getSlide(http, 'abc123', 'slide_001');
 * if (result.ok) {
 *   console.log(`Elements: ${result.value.pageElements?.length ?? 0}`);
 * }
 * ```
 */
export async function getSlide(
  http: HttpClient,
  presentationId: string,
  slideId: string,
): Promise<Result<Page, WorkspaceError>> {
  const url = `${BASE_URL}/presentations/${encodeURIComponent(presentationId)}/pages/${encodeURIComponent(slideId)}`;

  const result = await http.get<Page>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
