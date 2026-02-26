/**
 * Google Drive file operations.
 * All functions take an {@link HttpClient} as the first parameter and return
 * `Result<T, WorkspaceError>` - they never throw.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { DriveFile, FileListResponse, ListFilesOptions, GetFileOptions } from './types.js';

/**
 * Drive API v3 base URL.
 */
const BASE = 'https://www.googleapis.com/drive/v3';

/**
 * Default file fields to request when none are specified.
 */
const DEFAULT_FIELDS =
  'id,name,mimeType,description,parents,createdTime,modifiedTime,size,webViewLink,webContentLink,starred,shared,trashed';

// ---------------------------------------------------------------------------
// List / Search
// ---------------------------------------------------------------------------

/**
 * Lists files in the authenticated user's Drive.
 *
 * @param http  - Authenticated {@link HttpClient}.
 * @param opts  - Optional query parameters (pagination, fields, ordering).
 * @returns A page of {@link DriveFile} results wrapped in a `Result`.
 *
 * @example
 * ```ts
 * const result = await listFiles(http, { pageSize: 25 });
 * if (result.ok) {
 *   for (const file of result.value.files) console.log(file.name);
 * }
 * ```
 */
export async function listFiles(
  http: HttpClient,
  opts: ListFilesOptions = {},
): Promise<Result<FileListResponse, WorkspaceError>> {
  const params = new URLSearchParams();
  params.set('fields', `nextPageToken,incompleteSearch,files(${opts.fields ?? DEFAULT_FIELDS})`);

  if (opts.pageSize !== undefined) params.set('pageSize', String(opts.pageSize));
  if (opts.pageToken) params.set('pageToken', opts.pageToken);
  if (opts.orderBy) params.set('orderBy', opts.orderBy);
  if (opts.q) params.set('q', opts.q);
  if (opts.includeItemsFromAllDrives) params.set('includeItemsFromAllDrives', 'true');
  if (opts.supportsAllDrives) params.set('supportsAllDrives', 'true');
  if (opts.corpora) params.set('corpora', opts.corpora);

  const res = await http.get<FileListResponse>(`${BASE}/files?${params.toString()}`);

  if (!res.ok) {
    return err(new WorkspaceError(res.error.message, 'DRIVE_LIST_ERROR', res.error.context, res.error.statusCode));
  }

  return ok(res.value.data);
}

/**
 * Searches for files using a Drive query string.
 *
 * This is a convenience wrapper around {@link listFiles} that sets the `q`
 * parameter to the supplied query.
 *
 * @param http  - Authenticated {@link HttpClient}.
 * @param query - Drive search query (e.g. `"name contains 'report'"`).
 * @param opts  - Additional list options.
 * @returns A page of matching {@link DriveFile} results.
 *
 * @example
 * ```ts
 * const result = await searchFiles(http, "mimeType = 'application/pdf'");
 * ```
 */
export async function searchFiles(
  http: HttpClient,
  query: string,
  opts: Omit<ListFilesOptions, 'q'> = {},
): Promise<Result<FileListResponse, WorkspaceError>> {
  return listFiles(http, { ...opts, q: query });
}

// ---------------------------------------------------------------------------
// Get
// ---------------------------------------------------------------------------

/**
 * Retrieves metadata for a single file by ID.
 *
 * @param http    - Authenticated {@link HttpClient}.
 * @param fileId  - The Drive file ID.
 * @param opts    - Optional fields and shared-drive support.
 * @returns The file metadata wrapped in a `Result`.
 *
 * @example
 * ```ts
 * const result = await getFile(http, '1xBc...');
 * if (result.ok) console.log(result.value.name);
 * ```
 */
export async function getFile(
  http: HttpClient,
  fileId: string,
  opts: GetFileOptions = {},
): Promise<Result<DriveFile, WorkspaceError>> {
  const params = new URLSearchParams();
  params.set('fields', opts.fields ?? DEFAULT_FIELDS);
  if (opts.supportsAllDrives) params.set('supportsAllDrives', 'true');

  const res = await http.get<DriveFile>(`${BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`);

  if (!res.ok) {
    return err(new WorkspaceError(res.error.message, 'DRIVE_GET_ERROR', res.error.context, res.error.statusCode));
  }

  return ok(res.value.data);
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Permanently deletes a file by ID.
 *
 * @param http    - Authenticated {@link HttpClient}.
 * @param fileId  - The Drive file ID to delete.
 * @returns `void` on success, or a {@link WorkspaceError} on failure.
 *
 * @example
 * ```ts
 * const result = await deleteFile(http, '1xBc...');
 * if (!result.ok) console.error(result.error);
 * ```
 */
export async function deleteFile(
  http: HttpClient,
  fileId: string,
): Promise<Result<void, WorkspaceError>> {
  const res = await http.delete(`${BASE}/files/${encodeURIComponent(fileId)}`);

  if (!res.ok) {
    return err(new WorkspaceError(res.error.message, 'DRIVE_DELETE_ERROR', res.error.context, res.error.statusCode));
  }

  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Rename
// ---------------------------------------------------------------------------

/**
 * Renames a file.
 *
 * @param http    - Authenticated {@link HttpClient}.
 * @param fileId  - The Drive file ID to rename.
 * @param newName - The new file name.
 * @returns The updated {@link DriveFile} metadata.
 *
 * @example
 * ```ts
 * const result = await renameFile(http, '1xBc...', 'Q4 Report (final).pdf');
 * ```
 */
export async function renameFile(
  http: HttpClient,
  fileId: string,
  newName: string,
): Promise<Result<DriveFile, WorkspaceError>> {
  const params = new URLSearchParams();
  params.set('fields', DEFAULT_FIELDS);

  const res = await http.patch<DriveFile>(
    `${BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    { body: { name: newName } },
  );

  if (!res.ok) {
    return err(new WorkspaceError(res.error.message, 'DRIVE_RENAME_ERROR', res.error.context, res.error.statusCode));
  }

  return ok(res.value.data);
}

// ---------------------------------------------------------------------------
// Move
// ---------------------------------------------------------------------------

/**
 * Moves a file from its current parent(s) to a new parent folder.
 *
 * @param http              - Authenticated {@link HttpClient}.
 * @param fileId            - The Drive file ID to move.
 * @param newParentId       - The destination folder ID.
 * @param previousParentId  - The current parent folder ID to remove. When
 *                            omitted, all existing parents are removed.
 * @returns The updated {@link DriveFile} metadata.
 *
 * @example
 * ```ts
 * const result = await moveFile(http, fileId, targetFolderId);
 * ```
 */
export async function moveFile(
  http: HttpClient,
  fileId: string,
  newParentId: string,
  previousParentId?: string,
): Promise<Result<DriveFile, WorkspaceError>> {
  const params = new URLSearchParams();
  params.set('addParents', newParentId);
  params.set('fields', DEFAULT_FIELDS);

  if (previousParentId) {
    params.set('removeParents', previousParentId);
  } else {
    // Retrieve current parents so we can remove them
    const current = await getFile(http, fileId, { fields: 'id,parents' });
    if (!current.ok) return current;
    const parents = current.value.parents;
    if (parents && parents.length > 0) {
      params.set('removeParents', parents.join(','));
    }
  }

  const res = await http.patch<DriveFile>(
    `${BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    { body: {} },
  );

  if (!res.ok) {
    return err(new WorkspaceError(res.error.message, 'DRIVE_MOVE_ERROR', res.error.context, res.error.statusCode));
  }

  return ok(res.value.data);
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/**
 * Creates a copy of a file.
 *
 * @param http    - Authenticated {@link HttpClient}.
 * @param fileId  - The Drive file ID to copy.
 * @param name    - Optional name for the copy. Defaults to "Copy of {original}".
 * @param parentId - Optional parent folder ID for the copy.
 * @returns The new {@link DriveFile} metadata for the copy.
 *
 * @example
 * ```ts
 * const result = await copyFile(http, '1xBc...', 'Backup.pdf');
 * ```
 */
export async function copyFile(
  http: HttpClient,
  fileId: string,
  name?: string,
  parentId?: string,
): Promise<Result<DriveFile, WorkspaceError>> {
  const params = new URLSearchParams();
  params.set('fields', DEFAULT_FIELDS);

  const body: Record<string, unknown> = {};
  if (name) body['name'] = name;
  if (parentId) body['parents'] = [parentId];

  const res = await http.post<DriveFile>(
    `${BASE}/files/${encodeURIComponent(fileId)}/copy?${params.toString()}`,
    { body },
  );

  if (!res.ok) {
    return err(new WorkspaceError(res.error.message, 'DRIVE_COPY_ERROR', res.error.context, res.error.statusCode));
  }

  return ok(res.value.data);
}
