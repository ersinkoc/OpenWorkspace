/**
 * Google Drive upload operations.
 * Uses the multipart upload endpoint to send file metadata and content
 * in a single request.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { DriveFile, UploadOptions } from './types.js';

/**
 * Drive upload API base URL (note: different host path from the metadata API).
 */
const UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

/**
 * Uploads a file to Google Drive using a multipart upload.
 *
 * The file metadata (name, MIME type, parents, description) and binary content
 * are sent together in a single `multipart/related` request.
 *
 * @param http - Authenticated {@link HttpClient}.
 * @param opts - Upload options including name, MIME type, body, and optional parents.
 * @returns The created {@link DriveFile} metadata.
 *
 * @example
 * ```ts
 * const content = new TextEncoder().encode('Hello, Drive!');
 * const result = await uploadFile(http, {
 *   name: 'hello.txt',
 *   mimeType: 'text/plain',
 *   body: content,
 *   parents: ['folderId'],
 * });
 * if (result.ok) console.log('Uploaded:', result.value.id);
 * ```
 */
export async function uploadFile(
  http: HttpClient,
  opts: UploadOptions,
): Promise<Result<DriveFile, WorkspaceError>> {
  const metadata: Record<string, unknown> = {
    name: opts.name,
    mimeType: opts.mimeType,
  };
  if (opts.parents) metadata['parents'] = opts.parents;
  if (opts.description) metadata['description'] = opts.description;

  // Build the multipart/related body per RFC 2387.
  const boundary = `openworkspace_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const metadataJson = JSON.stringify(metadata);

  const encoder = new TextEncoder();
  const preamble = encoder.encode(
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadataJson}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${opts.mimeType}\r\n` +
    `Content-Transfer-Encoding: binary\r\n\r\n`,
  );
  const epilogue = encoder.encode(`\r\n--${boundary}--`);

  // Concatenate the parts into a single Uint8Array.
  const body = new Uint8Array(preamble.length + opts.body.length + epilogue.length);
  body.set(preamble, 0);
  body.set(opts.body, preamble.length);
  body.set(epilogue, preamble.length + opts.body.length);

  const params = new URLSearchParams();
  params.set('uploadType', 'multipart');
  params.set('fields', 'id,name,mimeType,parents,createdTime,modifiedTime,size,webViewLink,webContentLink');

  const res = await http.post<DriveFile>(
    `${UPLOAD_BASE}/files?${params.toString()}`,
    {
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!res.ok) {
    return err(new WorkspaceError(res.error.message, 'DRIVE_UPLOAD_ERROR', res.error.context, res.error.statusCode));
  }

  return ok(res.value.data);
}
