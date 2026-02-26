/**
 * Google Drive folder operations.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { DriveFile } from './types.js';

/**
 * Drive API v3 base URL.
 */
const BASE = 'https://www.googleapis.com/drive/v3';

/**
 * MIME type that Google Drive uses to identify folders.
 */
const FOLDER_MIME = 'application/vnd.google-apps.folder';

/**
 * Creates a new folder in Google Drive.
 *
 * @param http     - Authenticated {@link HttpClient}.
 * @param name     - The name of the folder to create.
 * @param parentId - Optional parent folder ID. When omitted the folder is
 *                   created in the user's root Drive folder.
 * @returns The created folder's {@link DriveFile} metadata.
 *
 * @example
 * ```ts
 * const result = await createFolder(http, 'Reports Q4');
 * if (result.ok) console.log('Folder ID:', result.value.id);
 *
 * // Create nested folder
 * const nested = await createFolder(http, 'Drafts', parentFolderId);
 * ```
 */
export async function createFolder(
  http: HttpClient,
  name: string,
  parentId?: string,
): Promise<Result<DriveFile, WorkspaceError>> {
  const params = new URLSearchParams();
  params.set('fields', 'id,name,mimeType,parents,createdTime,modifiedTime,webViewLink');

  const body: Record<string, unknown> = {
    name,
    mimeType: FOLDER_MIME,
  };
  if (parentId) {
    body['parents'] = [parentId];
  }

  const res = await http.post<DriveFile>(
    `${BASE}/files?${params.toString()}`,
    { body },
  );

  if (!res.ok) {
    return err(
      new WorkspaceError(res.error.message, 'DRIVE_CREATE_FOLDER_ERROR', res.error.context, res.error.statusCode),
    );
  }

  return ok(res.value.data);
}
