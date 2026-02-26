# OpenWorkspace

> Zero-dependency TypeScript toolkit for Google Workspace -- CLI, programmatic API, and MCP Server in one monorepo.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg)](#testing)
[![Tests](https://img.shields.io/badge/Tests-2%2C346-brightgreen.svg)](#testing)

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
- **2,346 tests, 100% statement coverage** -- across all 19 packages

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
ows calendar create "Team Standup" --date 2026-03-15 --time 09:00

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

| Package | Description |
|---------|-------------|
| [`@openworkspace/core`](packages/core) | Kernel, Result type, errors, events, logger, HTTP client, auth (OAuth2, service accounts), config |
| [`@openworkspace/cli`](packages/cli) | Zero-dep CLI parser with 19 command groups, output formatters, shell completions |
| [`@openworkspace/mcp`](packages/mcp) | MCP server -- JSON-RPC 2.0, 28 tools, stdio + HTTP/SSE transports |
| [`@openworkspace/pipeline`](packages/pipeline) | YAML workflow engine -- expression evaluator, forEach, parallel, retries |
| [`@openworkspace/gmail`](packages/gmail) | Gmail -- search, read, send, labels, threads, drafts |
| [`@openworkspace/calendar`](packages/calendar) | Calendar -- events, create, free/busy, calendar list |
| [`@openworkspace/drive`](packages/drive) | Drive -- search, upload, download, folders, permissions |
| [`@openworkspace/sheets`](packages/sheets) | Sheets -- read, write, append, format, structure |
| [`@openworkspace/docs`](packages/docs) | Docs -- get, create, batch update, export |
| [`@openworkspace/slides`](packages/slides) | Slides -- presentations, slide ops, speaker notes, export |
| [`@openworkspace/contacts`](packages/contacts) | Contacts -- search, list, create, directory |
| [`@openworkspace/tasks`](packages/tasks) | Tasks -- task lists, tasks CRUD |
| [`@openworkspace/chat`](packages/chat) | Chat -- spaces, messages, direct messages |
| [`@openworkspace/classroom`](packages/classroom) | Classroom -- courses, coursework, roster, submissions |
| [`@openworkspace/forms`](packages/forms) | Forms -- get, create, responses |
| [`@openworkspace/appscript`](packages/appscript) | Apps Script -- run scripts, manage projects |
| [`@openworkspace/people`](packages/people) | People -- profiles, manager/reports relations |
| [`@openworkspace/groups`](packages/groups) | Groups -- list, members, settings |
| [`@openworkspace/keep`](packages/keep) | Keep -- notes, attachments |

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

**Result Pattern** -- All functions return `Result<T, E>` instead of throwing:

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

**Plugin Architecture** -- Each service registers as a plugin with the kernel. Install only what you need.

**HttpClient** -- Authenticated HTTP with request/response/error interceptors, built on native `fetch`.

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
pnpm build          # Build all packages (topological order via Turbo)
```

### Testing

```bash
pnpm test           # Run all 2,346 tests
pnpm test:coverage  # Run tests with coverage (100% statement coverage)
pnpm typecheck      # TypeScript strict mode check
```

### Manual Testing with Real Google Account

```bash
pnpm quickstart     # Interactive setup wizard for Google OAuth
pnpm smoke-test     # Run CLI commands against a real Google account
pnpm test:mcp       # Test MCP server via stdio JSON-RPC
```

See [scripts/README.md](scripts/README.md) for prerequisites and detailed setup instructions.

### Project Structure

```
openworkspace/
  packages/
    core/          # Kernel, Result, errors, events, logger, HTTP, auth, config
    cli/           # CLI parser and command handlers
    mcp/           # MCP server, JSON-RPC 2.0, tool registry, transports
    pipeline/      # YAML workflow engine, expression evaluator
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
  scripts/         # Quickstart, smoke test, MCP test scripts
  docs/            # Architecture, specification, roadmap
  turbo.json
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

## Documentation

- [Architecture](docs/architecture.md) -- design decisions and package structure
- [Specification](docs/specification.md) -- project spec and constraints
- [Roadmap](docs/roadmap.md) -- milestones and task tracking
- [Scripts Guide](scripts/README.md) -- manual testing setup

---

## Links

- **GitHub**: [github.com/ersinkoc/openworkspace](https://github.com/ersinkoc/openworkspace)
- **Website**: [openworkspace.oxog.dev](https://openworkspace.oxog.dev)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

## License

[MIT](LICENSE) -- Ersin Koc
