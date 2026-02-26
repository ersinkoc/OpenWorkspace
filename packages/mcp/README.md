# @openworkspace/mcp

> MCP server with 28 tools for Google Workspace. Binary: `ows-mcp`.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/mcp @openworkspace/core
```

## Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openworkspace": {
      "command": "npx",
      "args": ["ows-mcp"],
      "env": {
        "GOOGLE_ACCESS_TOKEN": "ya29..."
      }
    }
  }
}
```

## Usage

```typescript
import { createMcpServer, createToolRegistry, registerServiceTools } from '@openworkspace/mcp';
import { createHttpClient } from '@openworkspace/core';

const http = createHttpClient({ auth: { accessToken: 'token' } });
const registry = createToolRegistry();
registerServiceTools(registry, http);

const server = createMcpServer({
  name: 'openworkspace',
  version: '0.1.0',
  registry,
});
```

## Included Tools

| Service | Tools |
|---------|-------|
| Gmail | `gmail_search`, `gmail_read`, `gmail_send`, `gmail_labels` |
| Calendar | `calendar_list`, `calendar_create`, `calendar_freebusy` |
| Drive | `drive_search`, `drive_upload`, `drive_download`, `drive_share` |
| Sheets | `sheets_read`, `sheets_write`, `sheets_append` |
| Docs | `docs_get`, `docs_create`, `docs_update` |
| Slides | `slides_get`, `slides_create`, `slides_export` |
| Tasks | `tasks_list`, `tasks_create`, `tasks_complete` |
| Contacts | `contacts_search`, `contacts_create` |
| Chat | `chat_send`, `chat_spaces` |
| Keep | `keep_list`, `keep_create` |

## Transports

- **stdio** -- Default, used by Claude Desktop and other MCP clients
- **HTTP/SSE** -- For web-based integrations

## License

[MIT](../../LICENSE)
