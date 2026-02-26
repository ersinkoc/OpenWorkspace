/**
 * Operation-level tests for @openworkspace/drive.
 * Covers files, folders, upload, download, and permissions modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';

import { listFiles, searchFiles, getFile, deleteFile, renameFile, moveFile, copyFile } from './files.js';
import { createFolder } from './folders.js';
import { uploadFile } from './upload.js';
import { downloadFile, exportFile } from './download.js';
import { listPermissions, shareFile, unshareFile } from './permissions.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createMockHttp(): HttpClient {
  const methods = ['request', 'get', 'post', 'put', 'patch', 'delete'] as const;
  const mock = { interceptors: { request: [], response: [], error: [] } } as unknown as HttpClient;
  for (const method of methods) {
    (mock as Record<string, unknown>)[method] = vi.fn();
  }
  return mock;
}

function mockOk<T>(data: T): Result<HttpResponse<T>, NetworkError> {
  return ok({ status: 200, statusText: 'OK', headers: {}, data });
}

function mockErr(message: string, statusCode?: number): Result<never, NetworkError> {
  return err(new NetworkError(message, { url: 'test' }, statusCode));
}

// ---------------------------------------------------------------------------
// files.ts
// ---------------------------------------------------------------------------

describe('files operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listFiles', () => {
    it('should GET files', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ files: [{ id: 'f1', name: 'doc.txt' }] }));
      const result = await listFiles(http, { pageSize: 10 });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.files[0]?.name).toBe('doc.txt');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/drive/v3/files');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listFiles(http);
      expect(result.ok).toBe(false);
    });
  });

  describe('searchFiles', () => {
    it('should delegate to listFiles with q param', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ files: [] }));
      await searchFiles(http, "mimeType='application/pdf'");
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('q=');
    });
  });

  describe('getFile', () => {
    it('should GET file metadata by ID', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ id: 'f1', name: 'test.pdf' }));
      const result = await getFile(http, 'f1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe('f1');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/files/f1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('not found', 404));
      const result = await getFile(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteFile', () => {
    it('should DELETE file by ID', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await deleteFile(http, 'f1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.delete).mock.calls[0]?.[0]).toContain('/files/f1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await deleteFile(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('renameFile', () => {
    it('should PATCH with new name', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockOk({ id: 'f1', name: 'renamed.pdf' }));
      const result = await renameFile(http, 'f1', 'renamed.pdf');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.name).toBe('renamed.pdf');
      expect(vi.mocked(http.patch).mock.calls[0]?.[1]?.body).toEqual({ name: 'renamed.pdf' });
    });

    it('should propagate error', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await renameFile(http, 'x', 'n');
      expect(result.ok).toBe(false);
    });
  });

  describe('moveFile', () => {
    it('should PATCH with new parent when previousParentId given', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockOk({ id: 'f1', parents: ['newP'] }));
      const result = await moveFile(http, 'f1', 'newP', 'oldP');
      expect(result.ok).toBe(true);
      const url = vi.mocked(http.patch).mock.calls[0]?.[0] as string;
      expect(url).toContain('addParents=newP');
      expect(url).toContain('removeParents=oldP');
    });

    it('should propagate error', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await moveFile(http, 'f1', 'newP', 'oldP');
      expect(result.ok).toBe(false);
    });
  });

  describe('copyFile', () => {
    it('should POST to copy endpoint', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'f2', name: 'Copy' }));
      const result = await copyFile(http, 'f1', 'Copy');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe('f2');
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain('/files/f1/copy');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await copyFile(http, 'x');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// folders.ts
// ---------------------------------------------------------------------------

describe('folders operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('createFolder', () => {
    it('should POST with folder MIME type', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'folder1', name: 'Reports' }));
      const result = await createFolder(http, 'Reports');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.name).toBe('Reports');
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      expect(body?.mimeType).toBe('application/vnd.google-apps.folder');
    });

    it('should include parentId when provided', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'folder2', name: 'Sub' }));
      await createFolder(http, 'Sub', 'parentFolder');
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      expect(body?.parents).toEqual(['parentFolder']);
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createFolder(http, 'X');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// upload.ts
// ---------------------------------------------------------------------------

describe('upload operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('uploadFile', () => {
    it('should POST multipart upload', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'f1', name: 'hello.txt' }));
      const content = new TextEncoder().encode('Hello');
      const result = await uploadFile(http, {
        name: 'hello.txt',
        mimeType: 'text/plain',
        body: content,
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.name).toBe('hello.txt');
      const url = vi.mocked(http.post).mock.calls[0]?.[0] as string;
      expect(url).toContain('/upload/drive/v3/files');
      expect(url).toContain('uploadType=multipart');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await uploadFile(http, { name: 'x', mimeType: 'text/plain', body: new Uint8Array(0) });
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// download.ts
// ---------------------------------------------------------------------------

describe('download operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('downloadFile', () => {
    it('should GET with alt=media', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk('file content'));
      const result = await downloadFile(http, 'f1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('file content');
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('alt=media');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await downloadFile(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('exportFile', () => {
    it('should GET with mimeType param', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk('pdf content'));
      const result = await exportFile(http, 'f1', 'application/pdf');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('pdf content');
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('/export');
      expect(url).toContain('mimeType=application%2Fpdf');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await exportFile(http, 'x', 'application/pdf');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// permissions.ts
// ---------------------------------------------------------------------------

describe('permissions operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listPermissions', () => {
    it('should GET permissions for a file', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ permissions: [{ id: 'p1', role: 'reader' }] }));
      const result = await listPermissions(http, 'f1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value[0]?.role).toBe('reader');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/files/f1/permissions');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listPermissions(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('shareFile', () => {
    it('should POST permission', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'p1', role: 'reader', type: 'user' }));
      const result = await shareFile(http, 'f1', { role: 'reader', type: 'user', emailAddress: 'a@b.com' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.role).toBe('reader');
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain('/files/f1/permissions');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 400));
      const result = await shareFile(http, 'x', { role: 'reader', type: 'user' });
      expect(result.ok).toBe(false);
    });
  });

  describe('unshareFile', () => {
    it('should DELETE permission', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await unshareFile(http, 'f1', 'p1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.delete).mock.calls[0]?.[0]).toContain('/files/f1/permissions/p1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await unshareFile(http, 'x', 'p');
      expect(result.ok).toBe(false);
    });
  });
});
