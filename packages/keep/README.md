# @openworkspace/keep

> Google Keep API client for OpenWorkspace -- notes, attachments.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/keep @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { listNotes, createNote, createListNote, searchNotes, getAttachment } from '@openworkspace/keep';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// List notes
const result = await listNotes(http);
if (result.ok) {
  for (const note of result.value.notes ?? []) {
    console.log(note.title, note.body?.text?.text?.slice(0, 50));
  }
}

// Create a text note
await createNote(http, { title: 'Shopping List', text: 'Milk, eggs, bread' });

// Create a list note
await createListNote(http, {
  title: 'To Do',
  items: ['Write report', 'Review PR', 'Update docs'],
});

// Search notes
const found = await searchNotes(http, 'shopping');

// Get an attachment
const attachment = await getAttachment(http, 'noteId', 'attachmentId');
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

### Notes

- `listNotes(http, options)` -- List notes
- `getNote(http, noteId)` -- Get a note
- `createNote(http, options)` -- Create a text note
- `createListNote(http, options)` -- Create a checklist note
- `deleteNote(http, noteId)` -- Delete a note
- `searchNotes(http, query)` -- Search notes by text

### Attachments

- `getAttachment(http, noteId, attachmentId)` -- Get attachment metadata
- `downloadAttachment(http, noteId, attachmentId)` -- Download attachment content

## License

[MIT](../../LICENSE)
