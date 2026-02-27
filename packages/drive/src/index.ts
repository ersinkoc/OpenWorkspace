/**
 * @openworkspace/drive
 * Google Drive API v3 toolkit for OpenWorkspace.
 * Zero runtime dependencies - uses HttpClient from @openworkspace/core.
 */

// Types
export type {
  DriveFile,
  FileOwner,
  FileListResponse,
  Permission,
  PermissionType,
  PermissionRole,
  PermissionListResponse,
  ShareOptions,
  SharedDrive,
  ExportFormat,
  UploadOptions,
  ListFilesOptions,
  GetFileOptions,
} from './types.js';

// File operations
export { listFiles, searchFiles, getFile, deleteFile, renameFile, moveFile, copyFile } from './files.js';

// Upload operations
export { uploadFile } from './upload.js';

// Download / Export operations
export { downloadFile, downloadFileAsBuffer, exportFile } from './download.js';

// Folder operations
export { createFolder } from './folders.js';

// Permission operations
export { listPermissions, shareFile, unshareFile } from './permissions.js';

// Plugin & facade
export type { DriveApi } from './plugin.js';
export { createDriveApi, drive } from './plugin.js';
