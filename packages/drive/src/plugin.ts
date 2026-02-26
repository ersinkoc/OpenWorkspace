/**
 * Google Drive plugin for OpenWorkspace.
 *
 * Provides a {@link DriveApi} facade that wraps all Drive operations behind a
 * single object, and a {@link drive} factory function that creates a kernel
 * {@link Plugin}.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { drive } from '@openworkspace/drive';
 *
 * const http = createHttpClient();
 * const kernel = createKernel();
 * await kernel.use(drive(http));
 * await kernel.init();
 * ```
 */

import type { HttpClient, Plugin } from '@openworkspace/core';
import type {
  DriveFile,
  ExportFormat,
  FileListResponse,
  GetFileOptions,
  ListFilesOptions,
  Permission,
  ShareOptions,
  UploadOptions,
} from './types.js';
import type { Result } from '@openworkspace/core';
import type { WorkspaceError } from '@openworkspace/core';

import { listFiles, searchFiles, getFile, deleteFile, renameFile, moveFile, copyFile } from './files.js';
import { uploadFile } from './upload.js';
import { downloadFile, exportFile } from './download.js';
import { createFolder } from './folders.js';
import { listPermissions, shareFile, unshareFile } from './permissions.js';

// ---------------------------------------------------------------------------
// DriveApi facade
// ---------------------------------------------------------------------------

/**
 * High-level API object that binds an {@link HttpClient} to every Drive
 * operation so callers do not need to pass it each time.
 */
export type DriveApi = {
  // -- Files ----------------------------------------------------------------

  /**
   * Lists files in the authenticated user's Drive.
   * @see {@link listFiles}
   */
  listFiles(opts?: ListFilesOptions): Promise<Result<FileListResponse, WorkspaceError>>;

  /**
   * Searches for files using a Drive query string.
   * @see {@link searchFiles}
   */
  searchFiles(query: string, opts?: Omit<ListFilesOptions, 'q'>): Promise<Result<FileListResponse, WorkspaceError>>;

  /**
   * Retrieves metadata for a single file by ID.
   * @see {@link getFile}
   */
  getFile(fileId: string, opts?: GetFileOptions): Promise<Result<DriveFile, WorkspaceError>>;

  /**
   * Permanently deletes a file by ID.
   * @see {@link deleteFile}
   */
  deleteFile(fileId: string): Promise<Result<void, WorkspaceError>>;

  /**
   * Renames a file.
   * @see {@link renameFile}
   */
  renameFile(fileId: string, newName: string): Promise<Result<DriveFile, WorkspaceError>>;

  /**
   * Moves a file to a different parent folder.
   * @see {@link moveFile}
   */
  moveFile(
    fileId: string,
    newParentId: string,
    previousParentId?: string,
  ): Promise<Result<DriveFile, WorkspaceError>>;

  /**
   * Creates a copy of a file.
   * @see {@link copyFile}
   */
  copyFile(fileId: string, name?: string, parentId?: string): Promise<Result<DriveFile, WorkspaceError>>;

  // -- Upload ---------------------------------------------------------------

  /**
   * Uploads a file to Google Drive.
   * @see {@link uploadFile}
   */
  uploadFile(opts: UploadOptions): Promise<Result<DriveFile, WorkspaceError>>;

  // -- Download / Export ----------------------------------------------------

  /**
   * Downloads the binary content of a non-Google-Workspace file.
   * @see {@link downloadFile}
   */
  downloadFile(fileId: string): Promise<Result<string, WorkspaceError>>;

  /**
   * Exports a Google Workspace document to a specified format.
   * @see {@link exportFile}
   */
  exportFile(fileId: string, mimeType: ExportFormat): Promise<Result<string, WorkspaceError>>;

  // -- Folders --------------------------------------------------------------

  /**
   * Creates a new folder in Google Drive.
   * @see {@link createFolder}
   */
  createFolder(name: string, parentId?: string): Promise<Result<DriveFile, WorkspaceError>>;

  // -- Permissions ----------------------------------------------------------

  /**
   * Lists all permissions on a file.
   * @see {@link listPermissions}
   */
  listPermissions(fileId: string): Promise<Result<Permission[], WorkspaceError>>;

  /**
   * Shares a file by creating a new permission.
   * @see {@link shareFile}
   */
  shareFile(fileId: string, options: ShareOptions): Promise<Result<Permission, WorkspaceError>>;

  /**
   * Removes a permission from a file (un-shares it).
   * @see {@link unshareFile}
   */
  unshareFile(fileId: string, permissionId: string): Promise<Result<void, WorkspaceError>>;
};

/**
 * Creates a {@link DriveApi} bound to the given HTTP client.
 *
 * @param http - Authenticated {@link HttpClient} (should include an auth
 *               interceptor that attaches the OAuth2 bearer token).
 * @returns A fully-bound {@link DriveApi} instance.
 */
export function createDriveApi(http: HttpClient): DriveApi {
  return {
    // Files
    listFiles: (opts?) => listFiles(http, opts),
    searchFiles: (query, opts?) => searchFiles(http, query, opts),
    getFile: (fileId, opts?) => getFile(http, fileId, opts),
    deleteFile: (fileId) => deleteFile(http, fileId),
    renameFile: (fileId, newName) => renameFile(http, fileId, newName),
    moveFile: (fileId, newParentId, previousParentId?) => moveFile(http, fileId, newParentId, previousParentId),
    copyFile: (fileId, name?, parentId?) => copyFile(http, fileId, name, parentId),

    // Upload
    uploadFile: (opts) => uploadFile(http, opts),

    // Download / Export
    downloadFile: (fileId) => downloadFile(http, fileId),
    exportFile: (fileId, mimeType) => exportFile(http, fileId, mimeType),

    // Folders
    createFolder: (name, parentId?) => createFolder(http, name, parentId),

    // Permissions
    listPermissions: (fileId) => listPermissions(http, fileId),
    shareFile: (fileId, options) => shareFile(http, fileId, options),
    unshareFile: (fileId, permissionId) => unshareFile(http, fileId, permissionId),
  };
}

// ---------------------------------------------------------------------------
// Kernel plugin
// ---------------------------------------------------------------------------

/**
 * Creates a Drive kernel {@link Plugin}.
 *
 * The plugin stores the {@link DriveApi} instance in the kernel metadata map
 * under the key `"drive"` so other plugins can retrieve it.
 *
 * @param http - Authenticated {@link HttpClient}.
 * @returns A kernel {@link Plugin} for Google Drive.
 *
 * @example
 * ```ts
 * const kernel = createKernel();
 * await kernel.use(drive(http));
 * await kernel.init();
 * ```
 */
export function drive(http: HttpClient): Plugin {
  const api = createDriveApi(http);

  return {
    name: 'drive',
    version: '0.1.0',

    setup(ctx) {
      ctx.metadata.set('drive', api);
      ctx.logger.info('Google Drive plugin initialized');
    },

    teardown(ctx) {
      ctx.metadata.delete('drive');
      ctx.logger.info('Google Drive plugin torn down');
    },
  };
}
