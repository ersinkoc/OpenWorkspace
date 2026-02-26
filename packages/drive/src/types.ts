/**
 * Type definitions for Google Drive API v3.
 * Maps to the Drive REST API resource representations.
 */

// ---------------------------------------------------------------------------
// File & Metadata
// ---------------------------------------------------------------------------

/**
 * Google Drive file resource.
 * @see https://developers.google.com/drive/api/v3/reference/files
 */
export type DriveFile = {
  /** The ID of the file. */
  id: string;
  /** The name of the file. */
  name: string;
  /** The MIME type of the file. */
  mimeType: string;
  /** A short description of the file. */
  description?: string;
  /** Whether the file has been trashed. */
  trashed?: boolean;
  /** The IDs of the parent folders which contain the file. */
  parents?: string[];
  /** The time the file was created (RFC 3339). */
  createdTime?: string;
  /** The last time the file was modified by anyone (RFC 3339). */
  modifiedTime?: string;
  /** The size of the file in bytes. Only populated for non-Google Docs files. */
  size?: string;
  /** A link for opening the file in a relevant Google editor or viewer. */
  webViewLink?: string;
  /** A link for downloading the file's content. */
  webContentLink?: string;
  /** URL to the file's icon. */
  iconLink?: string;
  /** URL to the file's thumbnail. */
  thumbnailLink?: string;
  /** Whether the file is starred by the user. */
  starred?: boolean;
  /** Whether the file is shared. */
  shared?: boolean;
  /** The owner(s) of the file. */
  owners?: FileOwner[];
  /** The MD5 checksum for the content. */
  md5Checksum?: string;
  /** Capabilities the current user has on this file. */
  capabilities?: Record<string, boolean>;
  /** Additional metadata stored in `appProperties`. */
  appProperties?: Record<string, string>;
  /** Additional metadata stored in `properties`. */
  properties?: Record<string, string>;
};

/**
 * Shortened owner representation embedded in {@link DriveFile}.
 */
export type FileOwner = {
  displayName: string;
  emailAddress: string;
};

/**
 * Response shape for Drive file list endpoints.
 */
export type FileListResponse = {
  /** Kind identifier (always `drive#fileList`). */
  kind: string;
  /** Token for the next page of results. */
  nextPageToken?: string;
  /** Whether the search process was incomplete. */
  incompleteSearch?: boolean;
  /** The list of files. */
  files: DriveFile[];
};

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * Drive permission resource.
 * @see https://developers.google.com/drive/api/v3/reference/permissions
 */
export type Permission = {
  /** The ID of the permission. */
  id: string;
  /** The type of the grantee. */
  type: PermissionType;
  /** The role granted by this permission. */
  role: PermissionRole;
  /** The email address of the user or group. */
  emailAddress?: string;
  /** The domain name for domain-type permissions. */
  domain?: string;
  /** Display name of the grantee. */
  displayName?: string;
  /** Whether the permission allows file discovery. */
  allowFileDiscovery?: boolean;
};

/**
 * Allowed permission grantee types.
 */
export type PermissionType = 'user' | 'group' | 'domain' | 'anyone';

/**
 * Allowed permission roles.
 */
export type PermissionRole = 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';

/**
 * Response shape for permission list endpoints.
 */
export type PermissionListResponse = {
  kind: string;
  nextPageToken?: string;
  permissions: Permission[];
};

/**
 * Options when sharing a file.
 */
export type ShareOptions = {
  /** The role to grant. */
  role: PermissionRole;
  /** The type of the grantee. */
  type: PermissionType;
  /** The email address to share with (required for `user` / `group`). */
  emailAddress?: string;
  /** The domain to share with (required for `domain`). */
  domain?: string;
  /** Whether to send a notification email. Defaults to `true`. */
  sendNotificationEmail?: boolean;
  /** An optional message to include in the notification email. */
  emailMessage?: string;
  /** Whether to transfer ownership (only valid when `role` is `owner`). */
  transferOwnership?: boolean;
};

// ---------------------------------------------------------------------------
// Shared Drives
// ---------------------------------------------------------------------------

/**
 * Google Shared Drive resource.
 * @see https://developers.google.com/drive/api/v3/reference/drives
 */
export type SharedDrive = {
  id: string;
  name: string;
  kind: string;
  createdTime?: string;
  hidden?: boolean;
  capabilities?: Record<string, boolean>;
};

// ---------------------------------------------------------------------------
// Export & Upload
// ---------------------------------------------------------------------------

/**
 * Well-known export MIME types for Google Workspace documents.
 */
export type ExportFormat =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  | 'text/plain'
  | 'text/csv'
  | 'text/html'
  | 'application/epub+zip'
  | 'application/zip'
  | 'image/png'
  | 'image/jpeg'
  | 'image/svg+xml'
  | (string & {});

/**
 * Options for uploading a file to Google Drive.
 */
export type UploadOptions = {
  /** The file name to use in Drive. */
  name: string;
  /** MIME type of the file being uploaded. */
  mimeType: string;
  /** The raw file content as a `Uint8Array`. */
  body: Uint8Array;
  /** Parent folder ID(s). Defaults to the user's root folder. */
  parents?: string[];
  /** Optional description for the file. */
  description?: string;
};

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Options for listing files.
 */
export type ListFilesOptions = {
  /** Maximum number of files to return (1-1000). */
  pageSize?: number;
  /** Page token for pagination. */
  pageToken?: string;
  /** Comma-separated list of file fields to include. */
  fields?: string;
  /** Sort order (e.g. `"modifiedTime desc"`). */
  orderBy?: string;
  /** Query string (Drive search syntax). */
  q?: string;
  /** Whether to include items in the trash. */
  includeItemsFromAllDrives?: boolean;
  /** Whether to support shared drives. */
  supportsAllDrives?: boolean;
  /** Corpus to search (`user` or `domain`). */
  corpora?: 'user' | 'domain' | 'drive' | 'allDrives';
};

/**
 * Options for retrieving a single file.
 */
export type GetFileOptions = {
  /** Comma-separated list of file fields to include. */
  fields?: string;
  /** Whether to support shared drives. */
  supportsAllDrives?: boolean;
};
