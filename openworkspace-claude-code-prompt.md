# OpenWorkspace — Google Workspace CLI + Library + MCP Server

## Package Identity

| Field | Value |
|-------|-------|
| **NPM Scope** | `@openworkspace/*` |
| **GitHub Repository** | `https://github.com/ersinkoc/openworkspace` |
| **Documentation Site** | `https://openworkspace.oxog.dev` |
| **License** | MIT |
| **Author** | Ersin Koç (ersinkoc) |
| **CLI Command** | `ows` |

> **NO social media, Discord, email, or external links allowed.**

---

## Package Description

**One-line:** Zero-dependency TypeScript toolkit for Google Workspace — CLI, programmatic API, and MCP Server in one monorepo.

OpenWorkspace is a comprehensive, plugin-based Google Workspace toolkit built with TypeScript. Unlike existing tools (like gogcli which is Go/CLI-only), OpenWorkspace provides three access modes: a powerful CLI (`ows`), a fully-typed programmatic API (`import { gmail } from '@openworkspace/gmail'`), and a native MCP Server for AI agent integration. Every Google service is a standalone plugin package — install only what you need. Features include smart caching, adaptive rate limiting, a YAML-based pipeline/workflow engine, and interactive TUI mode. Designed with micro-kernel architecture and LLM-native principles.

---

## NON-NEGOTIABLE RULES

These rules are **ABSOLUTE** and must be followed without exception.

### 1. ZERO RUNTIME DEPENDENCIES

```json
{
  "dependencies": {}  // MUST BE EMPTY FOR EVERY PACKAGE - NO EXCEPTIONS
}
```

- Implement EVERYTHING from scratch
- No lodash, no axios, no node-fetch, no googleapis — NOTHING
- Write your own HTTP client using Node.js native `fetch` (22+) and `node:https`
- Write your own OAuth2 flow from scratch
- Write your own CLI parser from scratch
- Write your own YAML parser from scratch
- The ONLY exception: `@openworkspace/*` packages can depend on each other (workspace cross-references)

**Allowed devDependencies only:**
```json
{
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0",
    "tsup": "^8.0.0",
    "@types/node": "^22.0.0",
    "prettier": "^3.0.0",
    "eslint": "^9.0.0"
  }
}
```

### 2. 100% TEST COVERAGE

- Every line of code must be tested
- Every branch must be tested
- Every function must be tested
- **All tests must pass** (100% success rate)
- Use Vitest for testing
- Coverage thresholds enforced in config
- Mock HTTP responses for Google API tests (never hit real APIs in tests)

### 3. MICRO-KERNEL ARCHITECTURE

The core kernel provides minimal infrastructure. Every Google service is a plugin:

```
┌──────────────────────────────────────────────────────────┐
│                      User Layer                          │
│  CLI (`ows`)  │  Programmatic API  │  MCP Server         │
├──────────────────────────────────────────────────────────┤
│                   Pipeline Engine                        │
│  YAML Workflows │ Step Execution │ Parallel/Conditional  │
├──────────────────────────────────────────────────────────┤
│                  Plugin Registry                         │
│  use() · register() · unregister() · list() · hook()    │
├────────┬────────┬────────┬────────┬────────┬────────────┤
│ Gmail  │Calendar│ Drive  │ Sheets │ Tasks  │   ...13    │
│ Plugin │ Plugin │ Plugin │ Plugin │ Plugin │  more svc  │
├────────┴────────┴────────┴────────┴────────┴────────────┤
│                    Core Kernel                           │
│  Auth Engine │ Rate Limiter │ Cache │ Event Bus │ Logger │
├──────────────────────────────────────────────────────────┤
│              HTTP Client (zero-dep, native fetch)        │
│  OAuth2 Flow │ Token Refresh │ Retry │ Interceptors      │
└──────────────────────────────────────────────────────────┘
```

### 4. DEVELOPMENT WORKFLOW

Create these documents **FIRST**, before any code:

1. **SPECIFICATION.md** - Complete project specification
2. **IMPLEMENTATION.md** - Architecture and design decisions
3. **TASKS.md** - Ordered task list with dependencies

Only after all three documents are complete, implement code following TASKS.md sequentially.

### 5. TYPESCRIPT STRICT MODE

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "module": "ESNext",
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

### 6. LLM-NATIVE DESIGN

- **llms.txt** file in root (< 2000 tokens)
- **Predictable API** naming: `create`, `get`, `set`, `use`, `remove`, `list`, `search`, `send`
- **Rich JSDoc** with @example on every public API
- **15+ examples** organized by category
- **README** optimized for both human and LLM consumption

### 7. NODE.JS VERSION

- **Minimum**: Node.js 22 LTS
- **Module**: ESM only (`"type": "module"`)
- Uses native `fetch`, `crypto`, `fs/promises`, `node:https`

---

## MONOREPO STRUCTURE

```
openworkspace/
├── .github/
│   └── workflows/
│       └── deploy.yml                # Website deploy only
├── packages/
│   ├── core/                         # @openworkspace/core
│   │   ├── src/
│   │   │   ├── index.ts              # Public exports
│   │   │   ├── kernel.ts             # Micro-kernel: plugin lifecycle, event bus
│   │   │   ├── types.ts              # All shared type definitions
│   │   │   ├── errors.ts             # Error hierarchy
│   │   │   ├── auth/
│   │   │   │   ├── oauth2.ts         # OAuth2 flow (browser redirect + headless + device code)
│   │   │   │   ├── service-account.ts # Google Workspace service account auth
│   │   │   │   ├── token-store.ts    # Pluggable token storage (file-encrypted, memory)
│   │   │   │   ├── scopes.ts         # Google API scope definitions & management
│   │   │   │   └── index.ts
│   │   │   ├── http/
│   │   │   │   ├── client.ts         # Zero-dep HTTP client (native fetch wrapper)
│   │   │   │   ├── rate-limiter.ts   # Adaptive rate limiter (token bucket + backoff)
│   │   │   │   ├── retry.ts          # Exponential backoff retry with jitter
│   │   │   │   ├── interceptors.ts   # Request/response interceptor chain
│   │   │   │   └── index.ts
│   │   │   ├── cache/
│   │   │   │   ├── memory-cache.ts   # In-memory LRU cache with TTL
│   │   │   │   ├── file-cache.ts     # Disk-based cache with TTL
│   │   │   │   └── index.ts
│   │   │   ├── events/
│   │   │   │   ├── event-bus.ts      # Typed event emitter
│   │   │   │   └── index.ts
│   │   │   ├── logger/
│   │   │   │   ├── logger.ts         # Structured logger (stderr for CLI)
│   │   │   │   └── index.ts
│   │   │   └── utils/
│   │   │       ├── date-parser.ts    # Natural date parsing ("tomorrow 10am", "next friday")
│   │   │       ├── json5-parser.ts   # Minimal JSON5 parser for config files
│   │   │       ├── yaml-parser.ts    # Minimal YAML parser for pipeline files
│   │   │       ├── crypto.ts         # AES-256-GCM encryption for token storage
│   │   │       ├── result.ts         # Result<T, E> pattern (Ok/Err)
│   │   │       └── index.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── fixtures/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── gmail/                        # @openworkspace/gmail
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts             # GmailPlugin implements ServicePlugin
│   │   │   ├── threads.ts            # Thread search, get, modify
│   │   │   ├── messages.ts           # Message search, get, body decode
│   │   │   ├── send.ts              # Send email (plain, HTML, attachments)
│   │   │   ├── labels.ts            # Label CRUD + batch modify
│   │   │   ├── drafts.ts            # Draft CRUD + send
│   │   │   ├── filters.ts           # Filter CRUD
│   │   │   ├── attachments.ts       # Attachment download
│   │   │   ├── watch.ts             # Pub/Sub push notifications
│   │   │   ├── settings.ts          # Vacation, forwarding, delegates, send-as
│   │   │   ├── history.ts           # History sync
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── calendar/                     # @openworkspace/calendar
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── events.ts            # Event CRUD, search, recurring
│   │   │   ├── calendars.ts         # Calendar list, ACL, colors
│   │   │   ├── freebusy.ts          # Free/busy query, conflict detection
│   │   │   ├── invitations.ts       # RSVP: accept/decline/tentative
│   │   │   ├── recurrence.ts        # RRULE parsing and generation
│   │   │   ├── special-events.ts    # Focus time, OOO, working location
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── drive/                        # @openworkspace/drive
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── files.ts             # List, search, get metadata
│   │   │   ├── upload.ts            # Simple + resumable upload
│   │   │   ├── download.ts          # Download + export (PDF, DOCX, etc.)
│   │   │   ├── folders.ts           # Create, move, organize
│   │   │   ├── permissions.ts       # Share, unshare, ACL
│   │   │   ├── shared-drives.ts     # Team/shared drives
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── sheets/                       # @openworkspace/sheets
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── read.ts              # Get values, metadata, notes
│   │   │   ├── write.ts             # Update, append, clear
│   │   │   ├── format.ts            # Cell formatting
│   │   │   ├── structure.ts         # Insert rows/cols, create sheets
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── docs/                         # @openworkspace/docs
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── documents.ts         # Create, copy, info, tabs
│   │   │   ├── content.ts           # Read text, update content, find-replace
│   │   │   ├── export.ts            # Export PDF/DOCX/TXT
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── slides/                       # @openworkspace/slides
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── presentations.ts     # Create, copy, info
│   │   │   ├── slide-ops.ts         # Add, replace, update notes
│   │   │   ├── export.ts            # Export PDF/PPTX
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── contacts/                     # @openworkspace/contacts
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── contacts.ts          # CRUD, search
│   │   │   ├── directory.ts         # Workspace directory
│   │   │   ├── other-contacts.ts    # Interaction-based contacts
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── tasks/                        # @openworkspace/tasks
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── tasklists.ts         # Tasklist CRUD
│   │   │   ├── task-ops.ts          # Task CRUD, done/undo, repeat
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── chat/                         # @openworkspace/chat
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── spaces.ts            # List, find, create spaces
│   │   │   ├── messages.ts          # List, send, threads
│   │   │   ├── dm.ts                # Direct messages
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── classroom/                    # @openworkspace/classroom
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── courses.ts           # Course CRUD, archive
│   │   │   ├── roster.ts            # Students, teachers
│   │   │   ├── coursework.ts        # Assignments, materials
│   │   │   ├── submissions.ts       # Grade, return, turn-in
│   │   │   ├── announcements.ts     # Announcement CRUD
│   │   │   ├── guardians.ts         # Guardian management
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── forms/                        # @openworkspace/forms
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── form-ops.ts          # Create, get forms
│   │   │   ├── responses.ts         # List, get responses
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── appscript/                    # @openworkspace/appscript
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── projects.ts          # Create, get, content
│   │   │   ├── execute.ts           # Run functions
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── people/                       # @openworkspace/people
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── profiles.ts          # Get profile, search
│   │   │   ├── relations.ts         # Manager, reports
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── groups/                       # @openworkspace/groups
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── group-ops.ts         # List groups, members
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── keep/                         # @openworkspace/keep
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── notes.ts             # List, get, search notes
│   │   │   ├── attachments.ts       # Download attachments
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── cli/                          # @openworkspace/cli — CLI binary (`ows`)
│   │   ├── src/
│   │   │   ├── index.ts             # Entry point + CLI parser
│   │   │   ├── parser.ts            # Zero-dep argument parser
│   │   │   ├── commands/
│   │   │   │   ├── auth.ts          # auth add/remove/list/status/credentials
│   │   │   │   ├── gmail.ts         # Gmail CLI commands
│   │   │   │   ├── calendar.ts      # Calendar CLI commands
│   │   │   │   ├── drive.ts         # Drive CLI commands
│   │   │   │   ├── sheets.ts
│   │   │   │   ├── docs.ts
│   │   │   │   ├── slides.ts
│   │   │   │   ├── contacts.ts
│   │   │   │   ├── tasks.ts
│   │   │   │   ├── chat.ts
│   │   │   │   ├── classroom.ts
│   │   │   │   ├── forms.ts
│   │   │   │   ├── appscript.ts
│   │   │   │   ├── people.ts
│   │   │   │   ├── groups.ts
│   │   │   │   ├── keep.ts
│   │   │   │   ├── pipeline.ts      # Pipeline run/validate
│   │   │   │   ├── config.ts        # Config get/set/list/path
│   │   │   │   └── time.ts          # Local/UTC time
│   │   │   ├── formatters/
│   │   │   │   ├── table.ts         # Aligned table output
│   │   │   │   ├── json.ts          # JSON output
│   │   │   │   ├── plain.ts         # TSV output
│   │   │   │   ├── csv.ts           # CSV output
│   │   │   │   └── index.ts
│   │   │   ├── interactive/
│   │   │   │   ├── wizard.ts        # Step-by-step TUI wizard
│   │   │   │   ├── prompts.ts       # Input prompts (text, select, confirm)
│   │   │   │   ├── spinner.ts       # Loading spinner
│   │   │   │   └── index.ts
│   │   │   └── completions/
│   │   │       ├── bash.ts
│   │   │       ├── zsh.ts
│   │   │       ├── fish.ts
│   │   │       └── index.ts
│   │   ├── tests/
│   │   ├── package.json              # bin: { "ows": "./dist/index.js" }
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── mcp/                          # @openworkspace/mcp — MCP Server
│   │   ├── src/
│   │   │   ├── index.ts             # Entry point (stdio + HTTP)
│   │   │   ├── server.ts            # MCP protocol handler
│   │   │   ├── transport/
│   │   │   │   ├── stdio.ts         # stdio transport (for Claude Desktop)
│   │   │   │   └── http.ts          # HTTP/SSE transport
│   │   │   ├── tools/
│   │   │   │   ├── gmail-tools.ts
│   │   │   │   ├── calendar-tools.ts
│   │   │   │   ├── drive-tools.ts
│   │   │   │   ├── sheets-tools.ts
│   │   │   │   ├── tasks-tools.ts
│   │   │   │   ├── contacts-tools.ts
│   │   │   │   ├── docs-tools.ts
│   │   │   │   ├── workspace-tools.ts  # Cross-service search
│   │   │   │   └── index.ts
│   │   │   ├── resources/
│   │   │   │   ├── calendar-resources.ts
│   │   │   │   ├── drive-resources.ts
│   │   │   │   └── index.ts
│   │   │   └── prompts/
│   │   │       ├── email-compose.ts
│   │   │       ├── meeting-schedule.ts
│   │   │       └── index.ts
│   │   ├── tests/
│   │   ├── package.json              # bin: { "ows-mcp": "./dist/index.js" }
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   └── pipeline/                     # @openworkspace/pipeline — Workflow Engine
│       ├── src/
│       │   ├── index.ts
│       │   ├── engine.ts            # Pipeline execution engine
│       │   ├── parser.ts            # YAML workflow file parser
│       │   ├── steps.ts             # Step definition and execution
│       │   ├── conditions.ts        # Conditional step logic
│       │   ├── expressions.ts       # ${{ }} expression evaluator
│       │   ├── scheduler.ts         # Cron-based scheduling
│       │   ├── parallel.ts          # Parallel step execution
│       │   └── types.ts
│       ├── tests/
│       ├── package.json
│       ├── tsconfig.json
│       └── tsup.config.ts
│
├── examples/
│   ├── 01-basic-gmail/               # Gmail search + send
│   ├── 02-calendar-today/            # Today's events
│   ├── 03-drive-upload/              # File upload/download
│   ├── 04-sheets-read-write/         # Spreadsheet operations
│   ├── 05-multi-account/             # Working with multiple accounts
│   ├── 06-pipeline-backup/           # YAML workflow: email attachment backup
│   ├── 07-pipeline-report/           # YAML workflow: weekly report generation
│   ├── 08-mcp-claude-desktop/        # MCP server config for Claude Desktop
│   ├── 09-interactive-send/          # TUI wizard for composing email
│   ├── 10-classroom-automation/      # Classroom grading workflow
│   ├── 11-contacts-sync/             # Contact sync between accounts
│   ├── 12-task-manager/              # Task management CLI wrapper
│   ├── 13-drive-organizer/           # Auto-organize Drive files
│   ├── 14-calendar-conflicts/        # Team calendar conflict detection
│   ├── 15-full-workspace-search/     # Cross-service search
│   └── 16-custom-plugin/             # How to create a community plugin
│
├── website/                          # openworkspace.oxog.dev
│   ├── public/
│   │   ├── CNAME                     # openworkspace.oxog.dev
│   │   └── llms.txt
│   └── src/
│
├── llms.txt                          # LLM-optimized reference (< 2000 tokens)
├── SPECIFICATION.md                  # Created first
├── IMPLEMENTATION.md                 # Created second
├── TASKS.md                          # Created third
├── README.md
├── CHANGELOG.md
├── LICENSE
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── package.json                      # Root package.json
└── .gitignore
```

---

## CORE API DESIGN

### Plugin Interface

Every Google service implements this interface:

```typescript
/**
 * Service plugin interface for Google Workspace services.
 *
 * @typeParam TApi - The public API surface this plugin exposes
 *
 * @example
 * ```typescript
 * const gmailPlugin: ServicePlugin<GmailApi> = {
 *   name: 'gmail',
 *   version: '1.0.0',
 *   scopes: ['https://www.googleapis.com/auth/gmail.modify'],
 *   install(kernel) { ... },
 * };
 * ```
 */
export interface ServicePlugin<TApi = unknown> {
  /** Unique plugin identifier (kebab-case) */
  name: string;

  /** Semantic version */
  version: string;

  /** Required Google API scopes */
  scopes: string[];

  /** Other plugins this plugin depends on */
  dependencies?: string[];

  /**
   * Called when plugin is registered. Extends the kernel's API surface.
   * @param kernel - The kernel instance providing auth, http, cache, events
   */
  install: (kernel: Kernel) => TApi;

  /**
   * Called after all plugins are installed.
   */
  onInit?: () => void | Promise<void>;

  /**
   * Called when plugin is unregistered.
   */
  onDestroy?: () => void | Promise<void>;

  /**
   * Called on error in this plugin's operations.
   * @param error - The error that occurred
   */
  onError?: (error: Error) => void;
}
```

### Kernel Interface

```typescript
/**
 * The core kernel that all plugins interact with.
 * Provides auth, HTTP, cache, events, and configuration.
 */
export interface Kernel {
  /** Authenticated HTTP client with rate limiting and retry */
  http: HttpClient;

  /** OAuth2 auth engine */
  auth: AuthEngine;

  /** Smart cache with TTL */
  cache: CacheEngine;

  /** Typed event bus */
  events: EventBus;

  /** Structured logger */
  logger: Logger;

  /** Configuration store */
  config: ConfigStore;

  /** Register a plugin */
  use<T>(plugin: ServicePlugin<T>): void;

  /** Unregister a plugin */
  unregister(name: string): void;

  /** List registered plugins */
  list(): PluginInfo[];

  /** Get a plugin's API by name */
  get<T>(name: string): T;
}
```

### Client Factory (Main Export)

```typescript
// @openworkspace/core
import { createClient } from '@openworkspace/core';
import { gmail } from '@openworkspace/gmail';
import { calendar } from '@openworkspace/calendar';
import { drive } from '@openworkspace/drive';
import { sheets } from '@openworkspace/sheets';
import { tasks } from '@openworkspace/tasks';

/**
 * Create a new OpenWorkspace client.
 *
 * @example
 * ```typescript
 * const ows = createClient({
 *   credentials: './client_secret.json',
 *   account: 'ersin@example.com',
 *   plugins: [gmail(), calendar(), drive()],
 * });
 *
 * const threads = await ows.gmail.search('newer_than:7d');
 * const events = await ows.calendar.events('primary', { today: true });
 * ```
 */
export function createClient(options: ClientOptions): WorkspaceClient;

export interface ClientOptions {
  /** Path to OAuth2 client credentials JSON, or inline credentials object */
  credentials: string | OAuthCredentials;

  /** Account email or alias */
  account: string;

  /** Plugins to load */
  plugins: ServicePlugin[];

  /** Cache configuration */
  cache?: {
    /** Cache backend: 'memory' | 'file' | 'none' */
    backend?: 'memory' | 'file' | 'none';
    /** Default TTL (e.g., '5m', '1h') */
    ttl?: string;
    /** Max cache entries */
    maxEntries?: number;
  };

  /** Rate limit configuration */
  rateLimit?: {
    /** Strategy: 'adaptive' (auto-adjust) | 'fixed' | 'none' */
    strategy?: 'adaptive' | 'fixed' | 'none';
    /** Max requests per second */
    maxRps?: number;
  };

  /** Logger configuration */
  logger?: {
    level?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  };

  /** Token storage backend: 'file' (encrypted) | 'memory' */
  tokenStore?: 'file' | 'memory';
}

/**
 * The workspace client with typed access to all registered plugins.
 * Plugin APIs are available as properties matching the plugin name.
 */
export interface WorkspaceClient {
  /** Access Gmail operations */
  gmail: GmailApi;
  /** Access Calendar operations */
  calendar: CalendarApi;
  /** Access Drive operations */
  drive: DriveApi;
  /** Access Sheets operations */
  sheets: SheetsApi;
  /** Access Tasks operations */
  tasks: TasksApi;
  /** Access Contacts operations */
  contacts: ContactsApi;
  /** Access Docs operations */
  docs: DocsApi;
  /** Access Slides operations */
  slides: SlidesApi;
  /** Access Chat operations */
  chat: ChatApi;
  /** Access Classroom operations */
  classroom: ClassroomApi;
  /** Access Forms operations */
  forms: FormsApi;
  /** Access Apps Script operations */
  appscript: AppScriptApi;
  /** Access People operations */
  people: PeopleApi;
  /** Access Groups operations */
  groups: GroupsApi;
  /** Access Keep operations */
  keep: KeepApi;

  /** Create a pipeline for chained operations */
  pipeline(): PipelineBuilder;

  /** Get the underlying kernel */
  kernel: Kernel;

  /** Destroy client and cleanup resources */
  destroy(): Promise<void>;
}
```

---

## SERVICE API EXAMPLES

### Gmail API

```typescript
export interface GmailApi {
  // Search
  search(query: string, options?: { max?: number; includeBody?: boolean }): Promise<Thread[]>;
  messagesSearch(query: string, options?: { max?: number; includeBody?: boolean }): Promise<Message[]>;

  // Read
  threadGet(threadId: string, options?: { download?: boolean; outDir?: string }): Promise<Thread>;
  messageGet(messageId: string, options?: { format?: 'full' | 'metadata' | 'minimal' }): Promise<Message>;

  // Send
  send(options: SendOptions): Promise<SentMessage>;
  // { to, cc?, bcc?, subject, body, bodyHtml?, replyToMessageId?, quote?, attachments? }

  // Labels
  labelsList(): Promise<Label[]>;
  labelsCreate(name: string): Promise<Label>;
  labelsDelete(labelIdOrName: string): Promise<void>;
  threadModify(threadId: string, options: { add?: string[]; remove?: string[] }): Promise<void>;

  // Drafts
  draftsList(): Promise<Draft[]>;
  draftsCreate(options: DraftOptions): Promise<Draft>;
  draftsSend(draftId: string): Promise<SentMessage>;

  // Filters
  filtersList(): Promise<Filter[]>;
  filtersCreate(options: FilterOptions): Promise<Filter>;
  filtersDelete(filterId: string): Promise<void>;

  // Attachments
  attachmentGet(messageId: string, attachmentId: string, options?: { out?: string }): Promise<Buffer>;

  // Settings
  vacationGet(): Promise<VacationSettings>;
  vacationEnable(options: VacationOptions): Promise<void>;
  vacationDisable(): Promise<void>;
  forwardingList(): Promise<ForwardingAddress[]>;
  delegatesList(): Promise<Delegate[]>;

  // Watch (Pub/Sub)
  watchStart(options: WatchOptions): Promise<WatchResponse>;
  historyList(options: { since: string }): Promise<HistoryRecord[]>;

  // Batch
  batchModify(messageIds: string[], options: { add?: string[]; remove?: string[] }): Promise<void>;
  batchDelete(messageIds: string[]): Promise<void>;

  // Utility
  url(threadId: string): string;
}
```

### Calendar API

```typescript
export interface CalendarApi {
  // Calendars
  calendarsList(): Promise<CalendarEntry[]>;
  acl(calendarId: string): Promise<AclRule[]>;
  colors(): Promise<ColorDefinitions>;

  // Events
  events(calendarId: string, options?: EventsOptions): Promise<Event[]>;
  // EventsOptions: { today?, tomorrow?, week?, days?, from?, to?, weekday?, max? }
  eventsAll(options?: EventsOptions): Promise<Event[]>;
  eventGet(calendarId: string, eventId: string): Promise<Event>;
  search(query: string, options?: EventsOptions & { max?: number }): Promise<Event[]>;

  // Create & Update
  create(calendarId: string, options: CreateEventOptions): Promise<Event>;
  update(calendarId: string, eventId: string, options: UpdateEventOptions): Promise<Event>;
  delete(calendarId: string, eventId: string, options?: { sendUpdates?: SendUpdates; force?: boolean }): Promise<void>;

  // Special events
  focusTime(options: FocusTimeOptions): Promise<Event>;
  outOfOffice(options: OOOOptions): Promise<Event>;
  workingLocation(options: WorkingLocationOptions): Promise<Event>;

  // Invitations
  respond(calendarId: string, eventId: string, options: { status: 'accepted' | 'declined' | 'tentative'; sendUpdates?: SendUpdates }): Promise<void>;
  proposeTime(calendarId: string, eventId: string, options?: { open?: boolean; decline?: boolean; comment?: string }): Promise<string>;

  // Availability
  freebusy(options: FreeBusyOptions): Promise<FreeBusyResponse>;
  conflicts(options: FreeBusyOptions): Promise<Conflict[]>;

  // Team
  team(groupEmail: string, options?: TeamOptions): Promise<TeamCalendar>;
}
```

### Drive API

```typescript
export interface DriveApi {
  // List & Search
  list(options?: { max?: number; parent?: string; allDrives?: boolean }): Promise<DriveFile[]>;
  search(query: string, options?: { max?: number; allDrives?: boolean; rawQuery?: boolean }): Promise<DriveFile[]>;
  get(fileId: string): Promise<DriveFile>;

  // Upload & Download
  upload(filePath: string, options?: { parent?: string; replace?: string; convert?: boolean; convertTo?: string; name?: string }): Promise<DriveFile>;
  download(fileId: string, options?: { out?: string; format?: ExportFormat }): Promise<Buffer | string>;

  // Organize
  mkdir(name: string, options?: { parent?: string }): Promise<DriveFile>;
  rename(fileId: string, newName: string): Promise<DriveFile>;
  move(fileId: string, options: { parent: string }): Promise<DriveFile>;
  copy(fileId: string, name: string): Promise<DriveFile>;
  delete(fileId: string, options?: { permanent?: boolean }): Promise<void>;

  // Permissions
  permissions(fileId: string): Promise<Permission[]>;
  share(fileId: string, options: ShareOptions): Promise<Permission>;
  unshare(fileId: string, permissionId: string): Promise<void>;

  // Shared drives
  drives(options?: { max?: number }): Promise<SharedDrive[]>;

  // Utility
  url(fileId: string): string;
}
```

*(All other 13 service APIs follow the same pattern — typed, JSDoc'd, predictable naming)*

---

## CLI DESIGN

The CLI command is `ows` (OpenWorkspace). Feature-parity with gogcli plus extras:

```bash
# ── Auth ──────────────────────────────────────────────
ows auth credentials <path>               # Store OAuth client credentials
ows auth add <email>                      # Authorize account (browser flow)
ows auth add <email> --headless           # Headless flow (paste redirect URL)
ows auth add <email> --device             # Device code flow (for servers)
ows auth list                             # List accounts
ows auth list --check                     # Validate tokens
ows auth remove <email>                   # Remove account
ows auth status                           # Current auth state
ows auth alias set <alias> <email>        # Set alias
ows auth service-account set <email> --key <path>  # Service account

# ── Gmail ─────────────────────────────────────────────
ows gmail search 'newer_than:7d' --max 10
ows gmail thread get <threadId> --download
ows gmail send --to a@b.com --subject "Hi" --body "Hello" --html
ows gmail send --interactive              # TUI wizard
ows gmail labels list
ows gmail drafts list
ows gmail filters list
ows gmail watch start --topic <topic>

# ── Calendar ──────────────────────────────────────────
ows calendar events primary --today
ows calendar events primary --week
ows calendar create primary --summary "Meeting" --start "tomorrow 10am" --end "tomorrow 11am"
ows calendar freebusy --calendars "primary,work" --today
ows calendar conflicts --today

# ── Drive ─────────────────────────────────────────────
ows drive ls --max 20
ows drive search "invoice" --max 10
ows drive upload ./file.pdf --folder "Work"
ows drive download <fileId> -o ./output.pdf

# ── Sheets ────────────────────────────────────────────
ows sheets get <spreadsheetId> 'Sheet1!A1:B10'
ows sheets update <spreadsheetId> 'A1' 'val1|val2'
ows sheets create "My Sheet" --sheets "Data,Summary"

# ── All other services follow same pattern ────────────
ows docs export <docId> --format pdf -o ./doc.pdf
ows slides export <presentationId> --format pptx -o ./deck.pptx
ows contacts search "John"
ows tasks list <tasklistId>
ows chat spaces list
ows classroom courses list
ows forms get <formId>
ows appscript run <scriptId> myFunction
ows people me
ows groups list
ows keep list

# ── Pipeline ──────────────────────────────────────────
ows pipeline run ./workflow.yaml
ows pipeline validate ./workflow.yaml
ows pipeline list                         # List available pipelines

# ── MCP Server ────────────────────────────────────────
ows mcp serve --stdio                     # For Claude Desktop
ows mcp serve --http --port 3000          # HTTP/SSE transport
ows mcp tools                             # List available MCP tools

# ── Config ────────────────────────────────────────────
ows config path
ows config list
ows config set default_timezone UTC
ows config get default_timezone

# ── Interactive Mode ──────────────────────────────────
ows --interactive                         # Full TUI wizard
ows gmail send --interactive              # Step-by-step email compose

# ── Global Flags ──────────────────────────────────────
--account <email|alias>                   # Account selection
--json                                    # JSON output
--plain                                   # TSV output
--csv                                     # CSV output
--color <auto|always|never>               # Color mode
--verbose                                 # Debug logging
--force                                   # Skip confirmations
--no-input                                # Never prompt (CI mode)
--cache <on|off>                          # Toggle cache
--help                                    # Help
--version                                 # Version
```

---

## MCP SERVER DESIGN

MCP tools that AI agents (Claude, etc.) can invoke:

```typescript
// Tool definitions for the MCP server
const TOOLS = {
  // ── Gmail ──
  gmail_search: {
    description: 'Search Gmail threads by query',
    params: { query: 'string', max: 'number?' },
  },
  gmail_read: {
    description: 'Read a Gmail thread or message',
    params: { threadId: 'string', includeBody: 'boolean?' },
  },
  gmail_send: {
    description: 'Send an email',
    params: { to: 'string', subject: 'string', body: 'string', html: 'boolean?' },
  },
  gmail_labels: {
    description: 'List Gmail labels',
    params: {},
  },

  // ── Calendar ──
  calendar_events: {
    description: 'List calendar events',
    params: { calendarId: 'string?', today: 'boolean?', tomorrow: 'boolean?', days: 'number?' },
  },
  calendar_create: {
    description: 'Create a calendar event',
    params: { summary: 'string', start: 'string', end: 'string', attendees: 'string[]?', location: 'string?' },
  },
  calendar_freebusy: {
    description: 'Check availability across calendars',
    params: { calendars: 'string[]', from: 'string', to: 'string' },
  },

  // ── Drive ──
  drive_search: {
    description: 'Search files in Google Drive',
    params: { query: 'string', max: 'number?' },
  },
  drive_read: {
    description: 'Get file metadata or content',
    params: { fileId: 'string' },
  },
  drive_upload: {
    description: 'Upload a file to Drive',
    params: { content: 'string', name: 'string', mimeType: 'string?', parent: 'string?' },
  },

  // ── Sheets ──
  sheets_read: {
    description: 'Read spreadsheet cell values',
    params: { spreadsheetId: 'string', range: 'string' },
  },
  sheets_write: {
    description: 'Write values to spreadsheet cells',
    params: { spreadsheetId: 'string', range: 'string', values: 'string[][]' },
  },

  // ── Tasks ──
  tasks_list: {
    description: 'List tasks in a tasklist',
    params: { tasklistId: 'string', max: 'number?' },
  },
  tasks_create: {
    description: 'Create a new task',
    params: { tasklistId: 'string', title: 'string', due: 'string?', notes: 'string?' },
  },
  tasks_complete: {
    description: 'Mark a task as completed',
    params: { tasklistId: 'string', taskId: 'string' },
  },

  // ── Cross-Service ──
  workspace_search: {
    description: 'Search across Gmail, Drive, and Calendar',
    params: { query: 'string', services: 'string[]?', max: 'number?' },
  },

  // ── Contacts ──
  contacts_search: {
    description: 'Search contacts by name or email',
    params: { query: 'string', max: 'number?' },
  },
};
```

### Claude Desktop Integration

```jsonc
// ~/.config/claude/claude_desktop_config.json
{
  "mcpServers": {
    "openworkspace": {
      "command": "npx",
      "args": ["@openworkspace/mcp", "serve", "--stdio"],
      "env": {
        "OWS_ACCOUNT": "ersin@example.com",
        "OWS_CREDENTIALS": "~/.config/openworkspace/credentials.json"
      }
    }
  }
}
```

---

## PIPELINE ENGINE DESIGN

### YAML Workflow Format

```yaml
# daily-email-backup.yaml
name: Daily Email Attachment Backup
description: Downloads email attachments and uploads to Drive

account: ersin@example.com

steps:
  - id: find_emails
    service: gmail
    action: search
    params:
      query: "has:attachment newer_than:1d"
      max: 50
      includeBody: false

  - id: create_backup_folder
    service: drive
    action: mkdir
    params:
      name: "Backup ${{ date('YYYY-MM-DD') }}"
      parent: "1abc123_backup_folder_id"

  - id: download_attachments
    service: gmail
    action: downloadAttachments
    forEach: ${{ steps.find_emails.result }}
    params:
      threadId: ${{ item.id }}

  - id: upload_to_drive
    service: drive
    action: upload
    forEach: ${{ steps.download_attachments.result }}
    params:
      file: ${{ item.path }}
      parent: ${{ steps.create_backup_folder.result.id }}

  - id: send_summary
    service: gmail
    action: send
    condition: ${{ steps.upload_to_drive.result.length > 0 }}
    params:
      to: ersin@example.com
      subject: "✅ Backup complete: ${{ steps.upload_to_drive.result.length }} files"
      body: "Backed up to: ${{ steps.create_backup_folder.result.name }}"
```

### Programmatic Pipeline API

```typescript
const result = await ows.pipeline()
  .step('search', () => ows.gmail.search('has:attachment newer_than:1d'))
  .step('folder', () => ows.drive.mkdir(`Backup ${new Date().toISOString().split('T')[0]}`))
  .step('download', async (ctx) => {
    const files = [];
    for (const thread of ctx.search) {
      const attachments = await ows.gmail.downloadAttachments(thread.id);
      files.push(...attachments);
    }
    return files;
  })
  .step('upload', (ctx) =>
    Promise.all(ctx.download.map(f => ows.drive.upload(f.path, { parent: ctx.folder.id })))
  )
  .onError((step, error) => console.error(`Step ${step} failed:`, error))
  .run();
```

---

## ENVIRONMENT VARIABLES

```bash
OWS_ACCOUNT           # Default account email or alias
OWS_CREDENTIALS       # Path to OAuth client credentials JSON
OWS_JSON              # Default JSON output (1 or true)
OWS_PLAIN             # Default plain output (1 or true)
OWS_COLOR             # Color mode: auto | always | never
OWS_TIMEZONE          # Default timezone (IANA name, UTC, or local)
OWS_CACHE             # Cache mode: on | off
OWS_ENABLE_COMMANDS   # Command allowlist (comma-separated)
OWS_CONFIG_DIR        # Config directory override
OWS_KEYRING_PASSWORD  # Encryption password for file-based token storage
OWS_LOG_LEVEL         # Log level: debug | info | warn | error | silent
```

---

## CONFIG FILE (JSON5)

Default paths:
- macOS: `~/Library/Application Support/openworkspace/config.json`
- Linux: `~/.config/openworkspace/config.json`
- Windows: `%AppData%\\openworkspace\\config.json`

```jsonc
{
  // Default timezone for calendar/gmail output
  default_timezone: "Europe/Istanbul",

  // Token storage backend
  token_backend: "file",

  // Cache settings
  cache: {
    backend: "memory",
    ttl: "5m",
    max_entries: 1000,
  },

  // Account aliases
  account_aliases: {
    work: "ersin@company.com",
    personal: "ersin@gmail.com",
  },

  // Rate limiting
  rate_limit: {
    strategy: "adaptive",
    max_rps: 10,
  },

  // MCP server settings
  mcp: {
    enabled_services: ["gmail", "calendar", "drive", "sheets", "tasks"],
    max_results_default: 20,
  },
}
```

---

## ERROR HANDLING

All errors use a Result<T, E> pattern AND custom error hierarchy:

```typescript
// Result pattern for composable error handling
export type Result<T, E = WorkspaceError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Error hierarchy
export class WorkspaceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'WorkspaceError';
  }
}

export class AuthError extends WorkspaceError { /* INVALID_CREDENTIALS, TOKEN_EXPIRED, SCOPE_INSUFFICIENT */ }
export class ApiError extends WorkspaceError { /* HTTP_ERROR, RATE_LIMITED, QUOTA_EXCEEDED */ }
export class PluginError extends WorkspaceError { /* PLUGIN_NOT_FOUND, PLUGIN_INIT_FAILED */ }
export class PipelineError extends WorkspaceError { /* STEP_FAILED, CONDITION_ERROR */ }
export class ConfigError extends WorkspaceError { /* INVALID_CONFIG, MISSING_CREDENTIALS */ }
export class ValidationError extends WorkspaceError { /* INVALID_INPUT, MISSING_REQUIRED */ }
export class CacheError extends WorkspaceError { /* CACHE_MISS, CACHE_EXPIRED */ }
```

---

## MONOREPO CONFIG

### pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
  - 'examples/*'
  - 'website'
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "test:coverage": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

### Root package.json

```json
{
  "name": "openworkspace",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Google Workspace CLI + Library + MCP Server",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "test:coverage": "turbo run test:coverage",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write .",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "keywords": [
    "google-workspace", "gmail", "google-calendar", "google-drive",
    "google-sheets", "google-docs", "cli", "mcp", "mcp-server",
    "typescript", "zero-dependency", "pipeline", "automation"
  ],
  "author": "Ersin Koç",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/ersinkoc/openworkspace.git"
  },
  "homepage": "https://openworkspace.oxog.dev",
  "engines": {
    "node": ">=22",
    "pnpm": ">=9"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@vitest/coverage-v8": "^3.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "tsup": "^8.0.0",
    "turbo": "^2.0.0",
    "typescript": "^5.8.0",
    "vitest": "^3.0.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

### Individual Package package.json Pattern

Each service package (e.g., `@openworkspace/gmail`):

```json
{
  "name": "@openworkspace/gmail",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "dependencies": {
    "@openworkspace/core": "workspace:*"
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist coverage"
  },
  "author": "Ersin Koç",
  "license": "MIT"
}
```

**NOTE:** `@openworkspace/*` cross-references via `"workspace:*"` are the ONLY allowed dependencies. No external npm packages.

---

## IMPLEMENTATION CHECKLIST

### Before Starting
- [ ] Create SPECIFICATION.md with complete spec
- [ ] Create IMPLEMENTATION.md with architecture
- [ ] Create TASKS.md with ordered task list
- [ ] All three documents reviewed and complete

### Core Package (@openworkspace/core)
- [ ] Kernel with plugin lifecycle
- [ ] Event bus (typed)
- [ ] Auth engine (OAuth2 browser + headless + device code)
- [ ] Service account auth
- [ ] Token store (file-encrypted, memory)
- [ ] HTTP client (native fetch, retry, interceptors)
- [ ] Rate limiter (adaptive token bucket)
- [ ] Smart cache (memory LRU + file with TTL)
- [ ] Logger (structured, stderr for CLI)
- [ ] Config store (JSON5 parser)
- [ ] Date parser (natural language: "tomorrow", "next friday")
- [ ] YAML parser (minimal, for pipeline files)
- [ ] Result<T, E> pattern
- [ ] Error hierarchy
- [ ] 100% test coverage

### Service Plugins (16 packages)
- [ ] @openworkspace/gmail — Full Gmail API
- [ ] @openworkspace/calendar — Full Calendar API
- [ ] @openworkspace/drive — Full Drive API
- [ ] @openworkspace/sheets — Full Sheets API
- [ ] @openworkspace/docs — Docs API
- [ ] @openworkspace/slides — Slides API
- [ ] @openworkspace/contacts — People/Contacts API
- [ ] @openworkspace/tasks — Tasks API
- [ ] @openworkspace/chat — Chat API (Workspace only)
- [ ] @openworkspace/classroom — Classroom API
- [ ] @openworkspace/forms — Forms API
- [ ] @openworkspace/appscript — Apps Script API
- [ ] @openworkspace/people — People/Profile API
- [ ] @openworkspace/groups — Groups API (Workspace only)
- [ ] @openworkspace/keep — Keep API (Workspace only, service account)
- [ ] Each with 100% test coverage

### CLI Package (@openworkspace/cli)
- [ ] Zero-dep argument parser
- [ ] Commands for all 16 services
- [ ] Auth commands
- [ ] Config commands
- [ ] Pipeline commands
- [ ] Output formatters (table, JSON, plain, CSV)
- [ ] Interactive TUI wizard mode
- [ ] Shell completions (bash, zsh, fish)
- [ ] Color support (auto-detect TTY)
- [ ] Global flags

### MCP Server (@openworkspace/mcp)
- [ ] MCP protocol handler (from scratch)
- [ ] stdio transport
- [ ] HTTP/SSE transport
- [ ] Tools for all key services
- [ ] Resources (calendar events, drive files)
- [ ] Prompt templates
- [ ] workspace_search cross-service tool

### Pipeline Engine (@openworkspace/pipeline)
- [ ] YAML parser integration
- [ ] Step execution engine
- [ ] Expression evaluator (${{ }})
- [ ] forEach iteration
- [ ] Conditional steps
- [ ] Parallel execution
- [ ] Error handling & retry
- [ ] Programmatic builder API

### LLM-Native Completion
- [ ] llms.txt created (< 2000 tokens)
- [ ] llms.txt copied to website/public/
- [ ] README first 500 tokens optimized
- [ ] All public APIs have JSDoc + @example
- [ ] 16+ examples in organized folders
- [ ] package.json has 8-12 keywords per package
- [ ] API uses standard naming patterns

### Website (openworkspace.oxog.dev)
- [ ] Landing page with feature overview
- [ ] Getting started guide
- [ ] API reference for each package
- [ ] CLI reference
- [ ] MCP server guide
- [ ] Pipeline guide
- [ ] Examples gallery
- [ ] Dark/Light theme toggle
- [ ] IDE-style code blocks
- [ ] CNAME: openworkspace.oxog.dev
- [ ] Mobile responsive
- [ ] Footer: "Made with ❤️ by Ersin KOÇ"

### Final Verification
- [ ] `pnpm build` succeeds for all packages
- [ ] `pnpm test:coverage` shows 100% for all packages
- [ ] `ows --help` works
- [ ] `ows mcp serve --stdio` works
- [ ] Website builds without errors
- [ ] All 16 examples run successfully
- [ ] README is complete and accurate

---

## BEGIN IMPLEMENTATION

Start by creating **SPECIFICATION.md** with the complete project specification based on everything above.

Then create **IMPLEMENTATION.md** with architecture decisions.

Then create **TASKS.md** with ordered, numbered tasks.

Only after all three documents are complete, begin implementing code by following TASKS.md sequentially.

**Remember:**
- All packages will be published to npm under @openworkspace/* scope
- Each package must be production-ready
- Zero runtime dependencies (only workspace:* cross-refs)
- 100% test coverage per package
- Professionally documented with JSDoc
- LLM-native design throughout
- Beautiful documentation website at openworkspace.oxog.dev
- CLI command is `ows`
- This project should be SUPERIOR to gogcli in every measurable way
