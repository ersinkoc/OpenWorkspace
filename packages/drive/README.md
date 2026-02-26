# @openworkspace/drive

> Google Drive API client for OpenWorkspace -- search, upload, download, folders, permissions.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/drive @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { searchFiles, uploadFile, downloadFile, createFolder, shareFile } from '@openworkspace/drive';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// Search files
const result = await searchFiles(http, 'budget 2025');
if (result.ok) {
  for (const file of result.value.files ?? []) {
    console.log(file.name, file.mimeType);
  }
}

// Upload a file
await uploadFile(http, {
  name: 'report.pdf',
  mimeType: 'application/pdf',
  content: fileBuffer,
});

// Download a file
const data = await downloadFile(http, 'fileId123');

// Create a folder
await createFolder(http, 'Project Assets');

// Share a file
await shareFile(http, 'fileId123', { type: 'user', role: 'reader', emailAddress: 'alice@example.com' });
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

- `listFiles(http, options)` -- List files with query
- `searchFiles(http, query)` -- Search files by name
- `getFile(http, fileId)` -- Get file metadata
- `deleteFile(http, fileId)` -- Delete a file
- `renameFile(http, fileId, name)` -- Rename a file
- `moveFile(http, fileId, folderId)` -- Move a file
- `copyFile(http, fileId)` -- Copy a file
- `uploadFile(http, options)` -- Upload a file
- `downloadFile(http, fileId)` -- Download file content
- `exportFile(http, fileId, format)` -- Export Google Docs/Sheets/Slides
- `createFolder(http, name)` -- Create a folder
- `listPermissions(http, fileId)` -- List file permissions
- `shareFile(http, fileId, options)` -- Share a file
- `unshareFile(http, fileId, permissionId)` -- Remove sharing

## License

[MIT](../../LICENSE)
