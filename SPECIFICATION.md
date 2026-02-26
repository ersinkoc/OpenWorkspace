# OpenWorkspace Specification

## 1. Purpose
OpenWorkspace is a zero-runtime-dependency TypeScript monorepo that provides:
- CLI (`ows`)
- Programmatic API (`@openworkspace/*`)
- MCP server (`@openworkspace/mcp`)

Primary domain: Google Workspace automation across Gmail, Calendar, Drive, Sheets, Docs, Slides, Contacts, Tasks, Chat, Classroom, Forms, Apps Script, People, Groups, and Keep.

## 2. Non-Negotiable Constraints
1. Runtime dependencies are forbidden in all packages.
2. Only `@openworkspace/*` workspace cross-dependencies are allowed.
3. 100% line/branch/function coverage is required for implemented packages.
4. Node.js >= 22, ESM-only.
5. TypeScript strict mode enabled.
6. Micro-kernel plugin architecture is mandatory.
7. LLM-native assets and API conventions are mandatory.

## 3. Product Scope
### 3.1 Core capabilities
- Plugin kernel and lifecycle
- Typed event bus
- Auth subsystem (OAuth2 flows + service account)
- Token store backends
- Native fetch-based HTTP client
- Retry + adaptive rate limiting
- Cache backends (memory + file)
- Structured logger
- Utility parsers (date, JSON5, YAML)
- Error hierarchy + Result pattern

### 3.2 Service plugin capabilities
Each service package exposes:
- `create<service>Client` style factory
- `plugin` implementation for kernel registration
- typed operations aligned to service API domain

### 3.3 CLI capabilities
- Zero-dependency argument parser
- Global options (`--json`, `--plain`, `--csv`, `--verbose`, etc.)
- Service commands for all supported services
- Auth/config/pipeline/mcp commands
- Optional interactive mode

### 3.4 MCP capabilities
- Tool registry and dispatch
- stdio transport
- HTTP/SSE transport
- Cross-service `workspace_search`

### 3.5 Pipeline capabilities
- YAML workflow ingestion
- Step executor with context passing
- Expression interpolation (`${{ ... }}`)
- Conditional and iterative steps
- retry/error boundaries

## 4. Quality and Verification
- Unit tests for every package
- Coverage gate 100% for implemented code
- Typecheck, build, and test in CI
- Deterministic error contracts using typed error hierarchy

## 5. Packaging and Distribution
- Monorepo with `packages/*`, `examples/*`, `website`
- NPM scope `@openworkspace/*`
- CLI command `ows`

## 6. Documentation Requirements
- Root README with quick start and architecture
- `llms.txt` (<2000 tokens)
- JSDoc with `@example` on public APIs
- Examples grouped by service and use-case

## 7. Acceptance Criteria (Initial Foundation Milestone)
1. Repository contains root workspace configs and scripts.
2. `@openworkspace/core`, `@openworkspace/cli`, `@openworkspace/pipeline`, `@openworkspace/mcp` compile and test successfully.
3. `ows --help` works.
4. `ows mcp tools` works.
5. Pipeline runner can parse and execute a minimal workflow.
6. Coverage for foundation packages is 100%.

## 8. Out of Scope for Initial Milestone
- Full Google API parity for all 16 service plugins
- Production OAuth redirect UX
- Complete TUI workflow
These are planned in subsequent milestones in TASKS.md.