/**
 * Google Drive permission operations.
 * Manage file sharing, access control, and permission listings.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { Permission, PermissionListResponse, ShareOptions } from './types.js';

/**
 * Drive API v3 base URL.
 */
const BASE = 'https://www.googleapis.com/drive/v3';

/**
 * Lists all permissions on a file.
 *
 * @param http   - Authenticated {@link HttpClient}.
 * @param fileId - The Drive file ID.
 * @returns A list of {@link Permission} resources.
 *
 * @example
 * ```ts
 * const result = await listPermissions(http, '1xBc...');
 * if (result.ok) {
 *   for (const p of result.value) console.log(p.role, p.emailAddress);
 * }
 * ```
 */
export async function listPermissions(
  http: HttpClient,
  fileId: string,
): Promise<Result<Permission[], WorkspaceError>> {
  const params = new URLSearchParams();
  params.set('fields', 'permissions(id,type,role,emailAddress,domain,displayName,allowFileDiscovery)');

  const res = await http.get<PermissionListResponse>(
    `${BASE}/files/${encodeURIComponent(fileId)}/permissions?${params.toString()}`,
  );

  if (!res.ok) {
    return err(
      new WorkspaceError(
        res.error.message,
        'DRIVE_LIST_PERMISSIONS_ERROR',
        res.error.context,
        res.error.statusCode,
      ),
    );
  }

  return ok(res.value.data.permissions);
}

/**
 * Shares a file by creating a new permission.
 *
 * @param http    - Authenticated {@link HttpClient}.
 * @param fileId  - The Drive file ID to share.
 * @param options - Sharing configuration (role, type, email, etc.).
 * @returns The created {@link Permission} resource.
 *
 * @example
 * ```ts
 * const result = await shareFile(http, fileId, {
 *   role: 'reader',
 *   type: 'user',
 *   emailAddress: 'colleague@example.com',
 * });
 * ```
 */
export async function shareFile(
  http: HttpClient,
  fileId: string,
  options: ShareOptions,
): Promise<Result<Permission, WorkspaceError>> {
  const params = new URLSearchParams();
  params.set('fields', 'id,type,role,emailAddress,domain,displayName');

  // Control notification email
  const sendEmail = options.sendNotificationEmail ?? true;
  params.set('sendNotificationEmail', String(sendEmail));
  if (options.emailMessage) params.set('emailMessage', options.emailMessage);
  if (options.transferOwnership) params.set('transferOwnership', 'true');

  const body: Record<string, unknown> = {
    role: options.role,
    type: options.type,
  };
  if (options.emailAddress) body['emailAddress'] = options.emailAddress;
  if (options.domain) body['domain'] = options.domain;

  const res = await http.post<Permission>(
    `${BASE}/files/${encodeURIComponent(fileId)}/permissions?${params.toString()}`,
    { body },
  );

  if (!res.ok) {
    return err(
      new WorkspaceError(res.error.message, 'DRIVE_SHARE_ERROR', res.error.context, res.error.statusCode),
    );
  }

  return ok(res.value.data);
}

/**
 * Removes a permission from a file (un-shares it).
 *
 * @param http         - Authenticated {@link HttpClient}.
 * @param fileId       - The Drive file ID.
 * @param permissionId - The ID of the permission to remove.
 * @returns `void` on success, or a {@link WorkspaceError} on failure.
 *
 * @example
 * ```ts
 * const result = await unshareFile(http, fileId, permissionId);
 * if (!result.ok) console.error('Failed to unshare:', result.error);
 * ```
 */
export async function unshareFile(
  http: HttpClient,
  fileId: string,
  permissionId: string,
): Promise<Result<void, WorkspaceError>> {
  const res = await http.delete(
    `${BASE}/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(permissionId)}`,
  );

  if (!res.ok) {
    return err(
      new WorkspaceError(res.error.message, 'DRIVE_UNSHARE_ERROR', res.error.context, res.error.statusCode),
    );
  }

  return ok(undefined);
}
