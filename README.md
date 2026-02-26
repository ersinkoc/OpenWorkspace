# OpenWorkspace

> Zero-dependency TypeScript toolkit for Google Workspace -- CLI, programmatic API, and MCP Server in one monorepo.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)

**OpenWorkspace** (`@openworkspace/*`) provides type-safe access to 15 Google Workspace services through three interfaces: a programmatic TypeScript API, a zero-dependency CLI (`ows`), and a Model Context Protocol (MCP) server with 28 tools for AI assistants.

```bash
npm install @openworkspace/core @openworkspace/gmail
```

---

## Features

- **Zero external dependencies** -- only workspace cross-references between packages
- **Type-safe Result pattern** -- every function returns `Result<T, E>`, never throws
- **15 Google Workspace services** -- Gmail, Calendar, Drive, Sheets, Docs, Slides, Contacts, Tasks, Chat, Classroom, Forms, Apps Script, People, Groups, Keep
- **CLI with 19 command groups** -- `ows gmail search`, `ows calendar events`, `ows drive upload`, ...
- **MCP Server with 28 tools** -- connect to Claude Desktop, Cursor, or any MCP-compatible client
- **YAML pipeline engine** -- orchestrate multi-step workflows with expressions, forEach, parallel, and retries
- **Micro-kernel plugin architecture** -- each service is a standalone, independently installable package
- **ESM-only, TypeScript strict mode** -- modern, tree-shakeable modules
- **Node.js >= 22** -- leverages native fetch, crypto, and other built-in APIs
- **1111 tests passing** -- comprehensive coverage across all packages

---

## Quick Start

### Install

```bash
# Install individual packages as needed
npm install @openworkspace/core @openworkspace/gmail

# Or install the CLI globally
npm install -g @openworkspace/cli
```

### Programmatic API

```typescript
import { createHttpClient } from '@openworkspace/core';
import { searchMessages } from '@openworkspace/gmail';

const http = createHttpClient({
  baseUrl: 'https://www.googleapis.com',
  auth: { accessToken: 'your-token' },
});

const result = await searchMessages(http, { query: 'from:boss' });

if (result.ok) {
  console.log(result.value.messages);
} else {
  console.error(result.error.message);
}
```

### CLI

```bash
# Authenticate
ows auth add ersin@example.com

# Gmail
ows gmail search "from:boss"
ows gmail send --to alice@example.com --subject "Hello"

# Calendar
ows calendar events --today
ows calendar create "Team Standup" --date 2025-01-15 --time 09:00

# Drive
ows drive search "quarterly report"
ows drive upload ./report.pdf

# Start MCP server
ows mcp serve --stdio
```

### MCP Server (Claude Desktop)

Add to your Claude Desktop configuration:

```jsonc
// ~/.config/claude/claude_desktop_config.json
{
  "mcpServers": {
    "openworkspace": {
      "command": "npx",
      "args": ["@openworkspace/mcp", "serve", "--stdio"]
    }
  }
}
```

Once configured, Claude can search your email, create calendar events, upload files to Drive, and more -- all through natural language.

### Pipeline

Define multi-step workflows in YAML:

```yaml
name: Daily Backup
steps:
  - id: search
    action: gmail.search
    with:
      query: "has:attachment newer_than:1d"

  - id: upload
    action: drive.upload
    forEach: ${{ steps.search.result }}
    with:
      folderId: "backup-folder-id"
```

Pipelines support `${{ expr }}` expressions, `forEach` iteration, `parallel` execution, and automatic retries.

---

## Packages

| Package | Description | Path |
|---------|-------------|------|
| [`@openworkspace/core`](packages/core) | Kernel, Result type, errors, events, logger, HTTP client, auth (OAuth2, service accounts), config | `packages/core` |
| [`@openworkspace/mcp`](packages/mcp) | MCP server -- JSON-RPC 2.0, tool registry (28 tools), stdio + HTTP/SSE transports | `packages/mcp` |
| [`@openworkspace/pipeline`](packages/pipeline) | YAML workflow engine -- expression evaluator, forEach, parallel, retries | `packages/pipeline` |
| [`@openworkspace/cli`](packages/cli) | Zero-dep CLI parser with 19 command groups | `packages/cli` |
| [`@openworkspace/gmail`](packages/gmail) | Gmail API -- search, read, send, labels, threads | `packages/gmail` |
| [`@openworkspace/calendar`](packages/calendar) | Calendar API -- events, create, free/busy | `packages/calendar` |
| [`@openworkspace/drive`](packages/drive) | Drive API -- search, read, upload, permissions | `packages/drive` |
| [`@openworkspace/sheets`](packages/sheets) | Sheets API -- read, write, append, format | `packages/sheets` |
| [`@openworkspace/docs`](packages/docs) | Docs API -- get, create, batch update | `packages/docs` |
| [`@openworkspace/slides`](packages/slides) | Slides API -- get, create, modify presentations | `packages/slides` |
| [`@openworkspace/contacts`](packages/contacts) | Contacts API -- search, list, create | `packages/contacts` |
| [`@openworkspace/tasks`](packages/tasks) | Tasks API -- list, create, complete, delete | `packages/tasks` |
| [`@openworkspace/chat`](packages/chat) | Chat API -- send messages, manage spaces | `packages/chat` |
| [`@openworkspace/classroom`](packages/classroom) | Classroom API -- courses, coursework, students | `packages/classroom` |
| [`@openworkspace/forms`](packages/forms) | Forms API -- get, create, responses | `packages/forms` |
| [`@openworkspace/appscript`](packages/appscript) | Apps Script API -- run scripts, manage projects | `packages/appscript` |
| [`@openworkspace/people`](packages/people) | People API -- profiles, connections | `packages/people` |
| [`@openworkspace/groups`](packages/groups) | Groups API -- list, members, settings | `packages/groups` |
| [`@openworkspace/keep`](packages/keep) | Keep API -- notes, lists | `packages/keep` |

---

## Architecture

```
                        +-------------------+
                        |   @openworkspace  |
                        |      /core        |
                        |  (micro-kernel)   |
                        +--------+----------+
                                 |
            +--------------------+--------------------+
            |                    |                    |
   +--------v--------+  +-------v--------+  +--------v--------+
   |   @openworkspace |  | @openworkspace |  | @openworkspace  |
   |      /cli        |  |     /mcp       |  |   /pipeline     |
   |  (19 commands)   |  | (28 tools)     |  | (YAML engine)   |
   +--------+---------+  +-------+--------+  +--------+--------+
            |                     |                    |
            +--------------------+--------------------+
            |         Service Plugins (15)             |
            +------------------------------------------+
            | gmail | calendar | drive | sheets | docs |
            | slides | contacts | tasks | chat | ...  |
            +------------------------------------------+
```

### Core Concepts

**Result Pattern** -- All functions return `Result<T, E>` instead of throwing exceptions:

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

**Plugin Architecture** -- Each service registers as a plugin with the kernel:

```typescript
const kernel = createKernel();
// Plugins register commands and tools
// Kernel manages lifecycle, events, and dependency injection
```

**HttpClient** -- Authenticated HTTP with request/response/error interceptors:

```typescript
const http = createHttpClient({
  baseUrl: 'https://www.googleapis.com',
  auth: { accessToken: token },
});
```

### MCP Tools

The MCP server exposes 28 tools to AI assistants:

| Tool | Description |
|------|-------------|
| `gmail_search` | Search messages by query |
| `gmail_read` | Read a specific message |
| `gmail_send` | Send an email |
| `gmail_labels` | List Gmail labels |
| `calendar_events` | List calendar events |
| `calendar_create` | Create a calendar event |
| `calendar_freebusy` | Check free/busy status |
| `drive_search` | Search files in Drive |
| `drive_read` | Read file content or metadata |
| `drive_upload` | Upload a file to Drive |
| `sheets_read` | Read spreadsheet data |
| `sheets_write` | Write spreadsheet data |
| `tasks_list` | List task lists and tasks |
| `tasks_create` | Create a new task |
| `tasks_complete` | Mark a task as complete |
| `contacts_search` | Search contacts |
| `docs_get` | Get document content |
| `docs_create` | Create a new document |
| `slides_get` | Get presentation content |
| `slides_create` | Create a new presentation |
| `classroom_courses` | List courses |
| `forms_get` | Get form and responses |
| `chat_send` | Send a chat message |
| `keep_list` | List notes |
| `appscript_run` | Run an Apps Script function |
| `people_me` | Get current user profile |
| `groups_list` | List groups |
| `workspace_search` | Search across all services |

---

## Development

### Prerequisites

- Node.js >= 22
- pnpm >= 10

### Setup

```bash
git clone https://github.com/ersinkoc/openworkspace.git
cd openworkspace
pnpm install
```

### Build

```bash
pnpm build        # Build all packages (topological order via Turbo)
```

### Test

```bash
pnpm test          # Run all 1111 tests
pnpm test:coverage # Run tests with coverage
```

### Type Check

```bash
pnpm typecheck     # TypeScript strict mode check
```

### Clean

```bash
pnpm clean         # Remove all dist/ directories
```

### Project Structure

```
openworkspace/
  packages/
    core/          # Kernel, Result, errors, events, logger, HTTP, auth, config
    mcp/           # MCP server, JSON-RPC 2.0, tool registry, transports
    pipeline/      # YAML workflow engine, expression evaluator
    cli/           # CLI parser and command handlers
    gmail/         # Gmail service plugin
    calendar/      # Calendar service plugin
    drive/         # Drive service plugin
    sheets/        # Sheets service plugin
    docs/          # Docs service plugin
    slides/        # Slides service plugin
    contacts/      # Contacts service plugin
    tasks/         # Tasks service plugin
    chat/          # Chat service plugin
    classroom/     # Classroom service plugin
    forms/         # Forms service plugin
    appscript/     # Apps Script service plugin
    people/        # People service plugin
    groups/        # Groups service plugin
    keep/          # Keep service plugin
  turbo.json       # Turborepo task configuration
  pnpm-workspace.yaml
  tsconfig.json
```

---

## Authentication

OpenWorkspace supports two authentication methods:

### OAuth 2.0 (User Accounts)

```bash
ows auth add ersin@example.com
```

This launches the OAuth 2.0 device code flow. Tokens are encrypted and stored locally.

### Service Accounts

```typescript
import { createServiceAccountAuth, loadServiceAccountKey } from '@openworkspace/core';

const key = await loadServiceAccountKey('./service-account.json');
const auth = createServiceAccountAuth(key);
```

---

## Links

- **GitHub**: [github.com/ersinkoc/openworkspace](https://github.com/ersinkoc/openworkspace)
- **Website**: [openworkspace.oxog.dev](https://openworkspace.oxog.dev)

## License

[MIT](LICENSE) -- Ersin Koc
