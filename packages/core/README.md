# @openworkspace/core

> Core kernel, HTTP client, auth engine, and config for OpenWorkspace.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/core
```

## Usage

```typescript
import { createHttpClient, createKernel, createLogger, ok, err } from '@openworkspace/core';

// Create an HTTP client with OAuth
const http = createHttpClient({
  auth: { accessToken: 'ya29...' },
});

// Create a kernel with plugins
const kernel = createKernel({ logger: createLogger({ level: 'info' }) });
await kernel.boot();

// Result pattern
const result = ok({ id: '1', name: 'file.txt' });
if (result.ok) {
  console.log(result.value.name);
}
```

## API

### HTTP Client

- `createHttpClient(options)` -- Create a configured HTTP client with auth, retries, and interceptors

### Kernel

- `createKernel(options)` -- Create a plugin kernel with commands and tools

### Result Pattern

- `ok(value)` / `err(error)` -- Create Result values
- `unwrap(result)` / `unwrapOr(result, fallback)` -- Extract values
- `map(result, fn)` / `mapErr(result, fn)` -- Transform results

### Auth

- `createTokenManager(config)` -- OAuth2 token lifecycle (refresh, cache, revoke)
- `createOAuthClient(config)` -- Full OAuth2 client with PKCE support

### Events & Logging

- `createEventBus()` -- Pub/sub event bus
- `createLogger(options)` -- Structured logger with sinks

## License

[MIT](../../LICENSE)
