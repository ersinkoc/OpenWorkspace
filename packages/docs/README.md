# @openworkspace/docs

> Google Docs API client for OpenWorkspace -- get, create, batch update, export.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/docs @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { getDocument, createDocument, insertText, replaceAllText, exportDocument } from '@openworkspace/docs';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// Get a document
const result = await getDocument(http, 'docId123');
if (result.ok) {
  console.log(result.value.title);
}

// Create a document
const doc = await createDocument(http, 'Meeting Notes');

// Insert text
await insertText(http, 'docId123', { text: 'Hello, World!', index: 1 });

// Find and replace
await replaceAllText(http, 'docId123', { find: '{{name}}', replaceWith: 'Alice' });

// Export as PDF
const pdf = await exportDocument(http, 'docId123', 'application/pdf');
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

- `getDocument(http, id)` -- Get document content and metadata
- `createDocument(http, title)` -- Create a new document
- `copyDocument(http, id)` -- Copy a document
- `getDocumentTabs(http, id)` -- Get document tabs
- `readText(http, id)` -- Read document as plain text
- `batchUpdate(http, id, requests)` -- Send batch update requests
- `insertText(http, id, params)` -- Insert text at an index
- `deleteContent(http, id, range)` -- Delete a content range
- `replaceAllText(http, id, params)` -- Find and replace text
- `exportDocument(http, id, format)` -- Export as PDF, DOCX, etc.

## License

[MIT](../../LICENSE)
