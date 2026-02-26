/**
 * Project operations for Google Apps Script API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { Project, Content, ScriptFile } from './types.js';
import { BASE_URL } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a query-string from an options object.
 * Drops `undefined` values and correctly encodes all values.
 */
function toQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

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
    'APPSCRIPT_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Project operations
// ---------------------------------------------------------------------------

/**
 * Gets metadata for a script project.
 *
 * @param http - Authenticated HTTP client.
 * @param scriptId - The script project's ID.
 * @returns The project metadata.
 *
 * @example
 * ```ts
 * const result = await getProject(http, 'abc123');
 * if (result.ok) {
 *   console.log('Project title:', result.value.title);
 * }
 * ```
 */
export async function getProject(
  http: HttpClient,
  scriptId: string,
): Promise<Result<Project, WorkspaceError>> {
  const url = `${BASE_URL}/projects/${encodeURIComponent(scriptId)}`;

  const result = await http.get<Project>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new script project.
 *
 * @param http - Authenticated HTTP client.
 * @param title - The title for the script project.
 * @param parentId - Optional parent's Drive ID to attach the script to.
 * @returns The newly created project.
 *
 * @example
 * ```ts
 * const result = await createProject(http, 'My New Script');
 * if (result.ok) {
 *   console.log('Created project:', result.value.scriptId);
 * }
 * ```
 */
export async function createProject(
  http: HttpClient,
  title: string,
  parentId?: string,
): Promise<Result<Project, WorkspaceError>> {
  const url = `${BASE_URL}/projects`;

  const body: Record<string, unknown> = { title };
  if (parentId !== undefined) {
    body.parentId = parentId;
  }

  const result = await http.post<Project>(url, { body });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets the content of a script project (all files).
 *
 * @param http - Authenticated HTTP client.
 * @param scriptId - The script project's ID.
 * @param versionNumber - Optional version number to retrieve.
 * @returns The project content including all files.
 *
 * @example
 * ```ts
 * const result = await getContent(http, 'abc123');
 * if (result.ok) {
 *   for (const file of result.value.files ?? []) {
 *     console.log('File:', file.name, 'Type:', file.type);
 *   }
 * }
 * ```
 */
export async function getContent(
  http: HttpClient,
  scriptId: string,
  versionNumber?: number,
): Promise<Result<Content, WorkspaceError>> {
  const qs = toQueryString({ versionNumber });
  const url = `${BASE_URL}/projects/${encodeURIComponent(scriptId)}/content${qs}`;

  const result = await http.get<Content>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Updates the content of a script project.
 * This replaces all files in the project with the provided files.
 *
 * @param http - Authenticated HTTP client.
 * @param scriptId - The script project's ID.
 * @param files - Array of files to update in the project.
 * @returns The updated project content.
 *
 * @example
 * ```ts
 * const result = await updateContent(http, 'abc123', [
 *   {
 *     name: 'Code',
 *     type: 'SERVER_JS',
 *     source: 'function myFunction() { Logger.log("Hello"); }',
 *   },
 * ]);
 * if (result.ok) {
 *   console.log('Updated project files');
 * }
 * ```
 */
export async function updateContent(
  http: HttpClient,
  scriptId: string,
  files: readonly ScriptFile[],
): Promise<Result<Content, WorkspaceError>> {
  const url = `${BASE_URL}/projects/${encodeURIComponent(scriptId)}/content`;

  const body = { files };

  const result = await http.put<Content>(url, {
    body: body as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
