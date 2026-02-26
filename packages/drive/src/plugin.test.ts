import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import { createDriveApi, drive } from './plugin.js';
import { listFiles, searchFiles, getFile, deleteFile, renameFile, moveFile, copyFile } from './files.js';
import { uploadFile } from './upload.js';
import { downloadFile, exportFile } from './download.js';
import { createFolder } from './folders.js';
import { listPermissions, shareFile, unshareFile } from './permissions.js';
import type { DriveFile, FileListResponse, Permission, PermissionListResponse } from './types.js';

// ---------------------------------------------------------------------------
// Mock HttpClient factory
// ---------------------------------------------------------------------------

function mockResponse<T>(data: T, status = 200): Result<HttpResponse<T>, NetworkError> {
  return ok({
    status,
    statusText: 'OK',
    headers: {},
    data,
  });
}

function mockError(message: string, status = 400): Result<never, NetworkError> {
  return err(new NetworkError(message, { status }, status));
}

function createMockHttp(): HttpClient {
  return {
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: [],
      response: [],
      error: [],
    },
  };
}

// ---------------------------------------------------------------------------
// File fixtures
// ---------------------------------------------------------------------------

const FILE_FIXTURE: DriveFile = {
  id: 'file-123',
  name: 'test.txt',
  mimeType: 'text/plain',
  parents: ['root'],
  createdTime: '2025-01-01T00:00:00Z',
  modifiedTime: '2025-01-02T00:00:00Z',
};

const FILE_LIST_FIXTURE: FileListResponse = {
  kind: 'drive#fileList',
  files: [FILE_FIXTURE],
};

const PERMISSION_FIXTURE: Permission = {
  id: 'perm-1',
  type: 'user',
  role: 'reader',
  emailAddress: 'user@example.com',
  displayName: 'Test User',
};

// ---------------------------------------------------------------------------
// files.ts
// ---------------------------------------------------------------------------

describe('files', () => {
  let http: HttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  describe('listFiles', () => {
    it('should list files successfully', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockResponse(FILE_LIST_FIXTURE));

      const result = await listFiles(http);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.files).toHaveLength(1);
        expect(result.value.files[0]?.name).toBe('test.txt');
      }
      expect(http.get).toHaveBeenCalledWith(expect.stringContaining('/drive/v3/files?'));
    });

    it('should pass pagination params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockResponse(FILE_LIST_FIXTURE));

      await listFiles(http, { pageSize: 10, pageToken: 'abc', orderBy: 'name' });

      const url = vi.mocked(http.get).mock.calls[0]?.[0] ?? '';
      expect(url).toContain('pageSize=10');
      expect(url).toContain('pageToken=abc');
      expect(url).toContain('orderBy=name');
    });

    it('should pass query param', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockResponse(FILE_LIST_FIXTURE));

      await listFiles(http, { q: "mimeType = 'application/pdf'" });

      const url = vi.mocked(http.get).mock.calls[0]?.[0] ?? '';
      expect(url).toContain('q=');
    });

    it('should return error on failure', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockError('Forbidden', 403));

      const result = await listFiles(http);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DRIVE_LIST_ERROR');
      }
    });
  });

  describe('searchFiles', () => {
    it('should search with query string', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockResponse(FILE_LIST_FIXTURE));

      const result = await searchFiles(http, "name contains 'report'");

      expect(result.ok).toBe(true);
      const url = vi.mocked(http.get).mock.calls[0]?.[0] ?? '';
      expect(url).toContain('q=');
    });
  });

  describe('getFile', () => {
    it('should get file metadata', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockResponse(FILE_FIXTURE));

      const result = await getFile(http, 'file-123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('file-123');
        expect(result.value.name).toBe('test.txt');
      }
      expect(http.get).toHaveBeenCalledWith(expect.stringContaining('/files/file-123'));
    });

    it('should return error on failure', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockError('Not Found', 404));

      const result = await getFile(http, 'nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DRIVE_GET_ERROR');
      }
    });

    it('should pass custom fields', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockResponse(FILE_FIXTURE));

      await getFile(http, 'file-123', { fields: 'id,name' });

      const url = vi.mocked(http.get).mock.calls[0]?.[0] ?? '';
      expect(url).toContain('fields=id%2Cname');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockResponse('', 204));

      const result = await deleteFile(http, 'file-123');

      expect(result.ok).toBe(true);
      expect(http.delete).toHaveBeenCalledWith(expect.stringContaining('/files/file-123'));
    });

    it('should return error on failure', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockError('Forbidden', 403));

      const result = await deleteFile(http, 'file-123');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DRIVE_DELETE_ERROR');
      }
    });
  });

  describe('renameFile', () => {
    it('should rename a file', async () => {
      const renamed = { ...FILE_FIXTURE, name: 'renamed.txt' };
      vi.mocked(http.patch).mockResolvedValueOnce(mockResponse(renamed));

      const result = await renameFile(http, 'file-123', 'renamed.txt');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('renamed.txt');
      }
      expect(http.patch).toHaveBeenCalledWith(
        expect.stringContaining('/files/file-123'),
        expect.objectContaining({ body: { name: 'renamed.txt' } }),
      );
    });

    it('should return error on failure', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockError('Not Found', 404));

      const result = await renameFile(http, 'nonexistent', 'new.txt');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DRIVE_RENAME_ERROR');
      }
    });
  });

  describe('moveFile', () => {
    it('should move a file with explicit previous parent', async () => {
      const moved = { ...FILE_FIXTURE, parents: ['folder-2'] };
      vi.mocked(http.patch).mockResolvedValueOnce(mockResponse(moved));

      const result = await moveFile(http, 'file-123', 'folder-2', 'folder-1');

      expect(result.ok).toBe(true);
      const url = vi.mocked(http.patch).mock.calls[0]?.[0] ?? '';
      expect(url).toContain('addParents=folder-2');
      expect(url).toContain('removeParents=folder-1');
    });

    it('should look up current parents when none specified', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(
        mockResponse({ ...FILE_FIXTURE, parents: ['old-parent'] }),
      );
      vi.mocked(http.patch).mockResolvedValueOnce(
        mockResponse({ ...FILE_FIXTURE, parents: ['new-parent'] }),
      );

      const result = await moveFile(http, 'file-123', 'new-parent');

      expect(result.ok).toBe(true);
      expect(http.get).toHaveBeenCalled();
      const url = vi.mocked(http.patch).mock.calls[0]?.[0] ?? '';
      expect(url).toContain('removeParents=old-parent');
    });

    it('should propagate error if fetching current parents fails', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockError('Not Found', 404));

      const result = await moveFile(http, 'nonexistent', 'folder-2');

      expect(result.ok).toBe(false);
    });
  });

  describe('copyFile', () => {
    it('should copy a file', async () => {
      const copy = { ...FILE_FIXTURE, id: 'copy-456', name: 'Copy of test.txt' };
      vi.mocked(http.post).mockResolvedValueOnce(mockResponse(copy));

      const result = await copyFile(http, 'file-123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('copy-456');
      }
      expect(http.post).toHaveBeenCalledWith(
        expect.stringContaining('/files/file-123/copy'),
        expect.any(Object),
      );
    });

    it('should copy with custom name and parent', async () => {
      const copy = { ...FILE_FIXTURE, id: 'copy-456', name: 'backup.txt', parents: ['folder-1'] };
      vi.mocked(http.post).mockResolvedValueOnce(mockResponse(copy));

      const result = await copyFile(http, 'file-123', 'backup.txt', 'folder-1');

      expect(result.ok).toBe(true);
      expect(http.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: { name: 'backup.txt', parents: ['folder-1'] },
        }),
      );
    });

    it('should return error on failure', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockError('Forbidden', 403));

      const result = await copyFile(http, 'file-123');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DRIVE_COPY_ERROR');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// upload.ts
// ---------------------------------------------------------------------------

describe('upload', () => {
  let http: HttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  describe('uploadFile', () => {
    it('should upload a file with multipart request', async () => {
      const uploaded: DriveFile = {
        id: 'new-file',
        name: 'hello.txt',
        mimeType: 'text/plain',
      };
      vi.mocked(http.post).mockResolvedValueOnce(mockResponse(uploaded, 200));

      const content = new TextEncoder().encode('Hello, Drive!');
      const result = await uploadFile(http, {
        name: 'hello.txt',
        mimeType: 'text/plain',
        body: content,
        parents: ['folder-1'],
        description: 'Test file',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('new-file');
        expect(result.value.name).toBe('hello.txt');
      }

      const call = vi.mocked(http.post).mock.calls[0];
      const url = call?.[0] ?? '';
      expect(url).toContain('upload/drive/v3/files');
      expect(url).toContain('uploadType=multipart');

      const config = call?.[1];
      expect(config?.headers?.['Content-Type']).toMatch(/^multipart\/related; boundary=/);
      expect(config?.body).toBeInstanceOf(Uint8Array);
    });

    it('should return error on failure', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockError('Quota exceeded', 403));

      const result = await uploadFile(http, {
        name: 'file.txt',
        mimeType: 'text/plain',
        body: new Uint8Array(0),
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DRIVE_UPLOAD_ERROR');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// download.ts
// ---------------------------------------------------------------------------

describe('download', () => {
  let http: HttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  describe('downloadFile', () => {
    it('should download a file', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockResponse('file content'));

      const result = await downloadFile(http, 'file-123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('file content');
      }
      const url = vi.mocked(http.get).mock.calls[0]?.[0] ?? '';
      expect(url).toContain('alt=media');
    });

    it('should return error on failure', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockError('Not Found', 404));

      const result = await downloadFile(http, 'nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DRIVE_DOWNLOAD_ERROR');
      }
    });
  });

  describe('exportFile', () => {
    it('should export a Google Doc to PDF', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockResponse('pdf-content'));

      const result = await exportFile(http, 'doc-123', 'application/pdf');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('pdf-content');
      }
      const url = vi.mocked(http.get).mock.calls[0]?.[0] ?? '';
      expect(url).toContain('/export');
      expect(url).toContain('mimeType=application%2Fpdf');
    });

    it('should return error on failure', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockError('Bad Request', 400));

      const result = await exportFile(http, 'doc-123', 'application/pdf');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DRIVE_EXPORT_ERROR');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// folders.ts
// ---------------------------------------------------------------------------

describe('folders', () => {
  let http: HttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  describe('createFolder', () => {
    it('should create a folder', async () => {
      const folder: DriveFile = {
        id: 'folder-1',
        name: 'New Folder',
        mimeType: 'application/vnd.google-apps.folder',
      };
      vi.mocked(http.post).mockResolvedValueOnce(mockResponse(folder));

      const result = await createFolder(http, 'New Folder');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('folder-1');
        expect(result.value.mimeType).toBe('application/vnd.google-apps.folder');
      }
      expect(http.post).toHaveBeenCalledWith(
        expect.stringContaining('/drive/v3/files'),
        expect.objectContaining({
          body: {
            name: 'New Folder',
            mimeType: 'application/vnd.google-apps.folder',
          },
        }),
      );
    });

    it('should create a folder with parent', async () => {
      const folder: DriveFile = {
        id: 'folder-2',
        name: 'Sub Folder',
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['folder-1'],
      };
      vi.mocked(http.post).mockResolvedValueOnce(mockResponse(folder));

      const result = await createFolder(http, 'Sub Folder', 'folder-1');

      expect(result.ok).toBe(true);
      expect(http.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: {
            name: 'Sub Folder',
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['folder-1'],
          },
        }),
      );
    });

    it('should return error on failure', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockError('Forbidden', 403));

      const result = await createFolder(http, 'Nope');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DRIVE_CREATE_FOLDER_ERROR');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// permissions.ts
// ---------------------------------------------------------------------------

describe('permissions', () => {
  let http: HttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  describe('listPermissions', () => {
    it('should list permissions', async () => {
      const permList: PermissionListResponse = {
        kind: 'drive#permissionList',
        permissions: [PERMISSION_FIXTURE],
      };
      vi.mocked(http.get).mockResolvedValueOnce(mockResponse(permList));

      const result = await listPermissions(http, 'file-123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.role).toBe('reader');
      }
      expect(http.get).toHaveBeenCalledWith(expect.stringContaining('/files/file-123/permissions'));
    });

    it('should return error on failure', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockError('Not Found', 404));

      const result = await listPermissions(http, 'nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DRIVE_LIST_PERMISSIONS_ERROR');
      }
    });
  });

  describe('shareFile', () => {
    it('should share a file with a user', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockResponse(PERMISSION_FIXTURE));

      const result = await shareFile(http, 'file-123', {
        role: 'reader',
        type: 'user',
        emailAddress: 'user@example.com',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.role).toBe('reader');
        expect(result.value.emailAddress).toBe('user@example.com');
      }

      const call = vi.mocked(http.post).mock.calls[0];
      const url = call?.[0] ?? '';
      expect(url).toContain('/files/file-123/permissions');
      expect(url).toContain('sendNotificationEmail=true');

      expect(call?.[1]).toEqual(
        expect.objectContaining({
          body: {
            role: 'reader',
            type: 'user',
            emailAddress: 'user@example.com',
          },
        }),
      );
    });

    it('should suppress notification email', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockResponse(PERMISSION_FIXTURE));

      await shareFile(http, 'file-123', {
        role: 'writer',
        type: 'user',
        emailAddress: 'user@example.com',
        sendNotificationEmail: false,
      });

      const url = vi.mocked(http.post).mock.calls[0]?.[0] ?? '';
      expect(url).toContain('sendNotificationEmail=false');
    });

    it('should share with domain', async () => {
      const domainPerm: Permission = {
        id: 'perm-2',
        type: 'domain',
        role: 'reader',
        domain: 'example.com',
      };
      vi.mocked(http.post).mockResolvedValueOnce(mockResponse(domainPerm));

      const result = await shareFile(http, 'file-123', {
        role: 'reader',
        type: 'domain',
        domain: 'example.com',
      });

      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[1]).toEqual(
        expect.objectContaining({
          body: expect.objectContaining({ domain: 'example.com' }),
        }),
      );
    });

    it('should return error on failure', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockError('Forbidden', 403));

      const result = await shareFile(http, 'file-123', {
        role: 'reader',
        type: 'user',
        emailAddress: 'user@example.com',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DRIVE_SHARE_ERROR');
      }
    });
  });

  describe('unshareFile', () => {
    it('should remove a permission', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockResponse('', 204));

      const result = await unshareFile(http, 'file-123', 'perm-1');

      expect(result.ok).toBe(true);
      expect(http.delete).toHaveBeenCalledWith(
        expect.stringContaining('/files/file-123/permissions/perm-1'),
      );
    });

    it('should return error on failure', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockError('Forbidden', 403));

      const result = await unshareFile(http, 'file-123', 'perm-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DRIVE_UNSHARE_ERROR');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// plugin.ts
// ---------------------------------------------------------------------------

describe('plugin', () => {
  let http: HttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  describe('createDriveApi', () => {
    it('should return a DriveApi with all methods', () => {
      const api = createDriveApi(http);

      expect(api.listFiles).toBeTypeOf('function');
      expect(api.searchFiles).toBeTypeOf('function');
      expect(api.getFile).toBeTypeOf('function');
      expect(api.deleteFile).toBeTypeOf('function');
      expect(api.renameFile).toBeTypeOf('function');
      expect(api.moveFile).toBeTypeOf('function');
      expect(api.copyFile).toBeTypeOf('function');
      expect(api.uploadFile).toBeTypeOf('function');
      expect(api.downloadFile).toBeTypeOf('function');
      expect(api.exportFile).toBeTypeOf('function');
      expect(api.createFolder).toBeTypeOf('function');
      expect(api.listPermissions).toBeTypeOf('function');
      expect(api.shareFile).toBeTypeOf('function');
      expect(api.unshareFile).toBeTypeOf('function');
    });

    it('should delegate listFiles to the underlying function', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockResponse(FILE_LIST_FIXTURE));

      const api = createDriveApi(http);
      const result = await api.listFiles({ pageSize: 5 });

      expect(result.ok).toBe(true);
      expect(http.get).toHaveBeenCalledWith(expect.stringContaining('pageSize=5'));
    });

    it('should delegate getFile to the underlying function', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockResponse(FILE_FIXTURE));

      const api = createDriveApi(http);
      const result = await api.getFile('file-123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('file-123');
      }
    });

    it('should delegate deleteFile to the underlying function', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockResponse('', 204));

      const api = createDriveApi(http);
      const result = await api.deleteFile('file-123');

      expect(result.ok).toBe(true);
    });

    it('should delegate createFolder to the underlying function', async () => {
      const folder: DriveFile = {
        id: 'folder-1',
        name: 'My Folder',
        mimeType: 'application/vnd.google-apps.folder',
      };
      vi.mocked(http.post).mockResolvedValueOnce(mockResponse(folder));

      const api = createDriveApi(http);
      const result = await api.createFolder('My Folder');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('My Folder');
      }
    });

    it('should delegate shareFile to the underlying function', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockResponse(PERMISSION_FIXTURE));

      const api = createDriveApi(http);
      const result = await api.shareFile('file-123', {
        role: 'reader',
        type: 'user',
        emailAddress: 'user@example.com',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.emailAddress).toBe('user@example.com');
      }
    });
  });

  describe('drive factory', () => {
    it('should create a Plugin with correct name and version', () => {
      const plugin = drive(http);

      expect(plugin.name).toBe('drive');
      expect(plugin.version).toBe('0.1.0');
      expect(plugin.setup).toBeTypeOf('function');
      expect(plugin.teardown).toBeTypeOf('function');
    });

    it('should store DriveApi in metadata on setup', () => {
      const plugin = drive(http);
      const metadata = new Map<string, unknown>();
      const ctx = {
        events: {} as never,
        logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() } as never,
        metadata,
        registerCommand: vi.fn(),
        registerTool: vi.fn(),
      };

      plugin.setup(ctx);

      expect(metadata.has('drive')).toBe(true);
      const api = metadata.get('drive') as ReturnType<typeof createDriveApi>;
      expect(api.listFiles).toBeTypeOf('function');
    });

    it('should remove DriveApi from metadata on teardown', () => {
      const plugin = drive(http);
      const metadata = new Map<string, unknown>();
      const ctx = {
        events: {} as never,
        logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() } as never,
        metadata,
        registerCommand: vi.fn(),
        registerTool: vi.fn(),
      };

      plugin.setup(ctx);
      expect(metadata.has('drive')).toBe(true);

      plugin.teardown!(ctx);
      expect(metadata.has('drive')).toBe(false);
    });
  });
});
