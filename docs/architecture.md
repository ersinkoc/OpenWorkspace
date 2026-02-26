# OpenWorkspace Architecture

## Overview

OpenWorkspace uses a **micro-kernel plugin architecture** with four layers:

```
+----------------------------------------------------------+
|                     User Layer                            |
|   CLI (ows)   |  Programmatic API  |  MCP Server         |
+----------------------------------------------------------+
|                   Pipeline Engine                         |
|   YAML Workflows | Step Execution | Parallel/Conditional |
+----------------------------------------------------------+
|                  Plugin Registry (15 services)            |
|   gmail | calendar | drive | sheets | docs | slides ...  |
+----------------------------------------------------------+
|                    Core Kernel                            |
|   Auth | HTTP Client | Event Bus | Logger | Config       |
+----------------------------------------------------------+
```

## Package Decisions

### `@openworkspace/core`

Provides shared primitives:

- Plugin kernel (`createKernel`) with lifecycle management
- Typed result helper (`ok`, `err`) -- never throws
- Error hierarchy (`WorkspaceError` and specialized errors: `AuthError`, `NetworkError`, `ValidationError`, etc.)
- Typed event bus for cross-plugin communication
- Structured logger (stderr for CLI compatibility)
- Native `fetch` wrapper with interceptor support
- OAuth2 flows (browser redirect, headless, device code)
- Service account authentication (JWT signing)
- Encrypted token store (AES-256-GCM)
- JSON5 config parser and persistent config store

**Rationale:** Keeps all other packages runtime-dependency free. Defines stable contracts that service packages depend on.

### `@openworkspace/cli`

Provides:

- Zero-dependency argument parser supporting commands, subcommands, flags, and positional args
- 19 command groups (auth, config, mcp, pipeline, + 15 service commands)
- Output formatters: table, JSON, plain/TSV, CSV
- Shell completions (bash, zsh, fish)
- Color support with auto-detection

**Rationale:** Enables immediate user-facing execution with an extensible command model.

### `@openworkspace/mcp`

Provides:

- MCP protocol server (JSON-RPC 2.0)
- Tool registry with 28 tools across all services
- Resource registry (calendar events, drive files)
- Prompt templates (email compose, meeting schedule)
- Two transports: stdio (for Claude Desktop) and HTTP/SSE

**Rationale:** First-class AI integration through the Model Context Protocol.

### `@openworkspace/pipeline`

Provides:

- Minimal YAML parser (subset required for workflow format)
- Expression evaluator (`${{ }}`) with variable interpolation
- Pipeline step executor with context passing
- `forEach` iteration, `parallel` execution, conditional steps
- Retry with configurable attempts and backoff
- Programmatic builder API

**Rationale:** Pipeline is a differentiator, enabling automation workflows across services.

### Service Plugins (15 packages)

Each service plugin follows the same pattern:

- Exports a `plugin` object for kernel registration
- Exports individual operation functions (`searchMessages`, `createEvent`, etc.)
- Registers CLI commands and MCP tools through the plugin contract
- Uses `HttpClient` from core for all API calls
- Returns `Result<T, WorkspaceError>` from all operations

## Technical Standards

### TypeScript

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride: true`
- ES2022 target, ESM modules

### Testing

- Vitest per package with V8 coverage provider
- 100% statement coverage enforced
- All HTTP responses mocked (never hit real APIs in tests)
- 2,346 tests across 19 packages

### Build

- tsup for package bundling (ESM + DTS)
- Turborepo for monorepo orchestration (topological build order)
- pnpm workspaces for dependency management

### Error Handling

- All public APIs return `Result<T, WorkspaceError>`
- Throwing is limited to unrecoverable internal programmer errors
- Typed error hierarchy enables pattern matching on error types

### Security

- No secrets committed
- Tokens encrypted with AES-256-GCM (PBKDF2 key derivation)
- HTTP wrapper supports auth header injection via interceptor
- OAuth2 with PKCE for browser flow
