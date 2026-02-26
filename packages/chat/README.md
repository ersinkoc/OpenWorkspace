# @openworkspace/chat

> Google Chat API client for OpenWorkspace -- spaces, messages, direct messages.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/chat @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { listSpaces, sendMessage, createDirectMessage } from '@openworkspace/chat';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// List spaces
const result = await listSpaces(http);
if (result.ok) {
  for (const space of result.value.spaces ?? []) {
    console.log(space.displayName, space.name);
  }
}

// Send a message to a space
await sendMessage(http, 'spaces/SPACE_ID', { text: 'Hello team!' });

// Send a direct message
await createDirectMessage(http, { text: 'Hey Alice!' }, 'users/USER_ID');
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

### Spaces

- `listSpaces(http, options)` -- List spaces
- `getSpace(http, spaceName)` -- Get a space
- `createSpace(http, space)` -- Create a named space
- `findSpace(http, displayName)` -- Find a space by name

### Messages

- `listMessages(http, spaceName, options)` -- List messages in a space
- `getMessage(http, messageName)` -- Get a message
- `sendMessage(http, spaceName, message)` -- Send a message
- `updateMessage(http, messageName, message)` -- Update a message
- `deleteMessage(http, messageName)` -- Delete a message

### Direct Messages

- `createDirectMessage(http, message, userId)` -- Send a DM
- `listDirectMessages(http, userId)` -- List DM spaces

## License

[MIT](../../LICENSE)
