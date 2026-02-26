# @openworkspace/gmail

> Gmail API client for OpenWorkspace -- search, read, send, labels, threads, drafts.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/gmail @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { searchMessages, sendMessage } from '@openworkspace/gmail';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// Search messages
const result = await searchMessages(http, { query: 'from:boss' });
if (result.ok) {
  for (const msg of result.value.messages ?? []) {
    console.log(msg.id, msg.snippet);
  }
}

// Send email
const sent = await sendMessage(http, {
  to: 'alice@example.com',
  subject: 'Hello',
  body: 'Hi there!',
});
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

- `searchMessages(http, params)` -- Search messages
- `getMessage(http, id)` -- Get a message by ID
- `batchModify(http, params)` -- Batch modify messages
- `batchDelete(http, params)` -- Batch delete messages
- `searchThreads(http, params)` -- Search threads
- `getThread(http, params)` -- Get a thread
- `modifyThread(http, params)` -- Modify thread labels
- `listLabels(http)` -- List all labels
- `createLabel(http, params)` -- Create a label
- `deleteLabel(http, id)` -- Delete a label
- `sendMessage(http, options)` -- Send an email
- `listDrafts(http, params)` -- List drafts
- `createDraft(http, options)` -- Create a draft
- `sendDraft(http, id)` -- Send a draft

## License

[MIT](../../LICENSE)
