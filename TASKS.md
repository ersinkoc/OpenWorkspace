# OpenWorkspace Tasks

## Milestone 1: Foundation (Current)
1. Create root monorepo files (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, base `tsconfig`).
2. Create `@openworkspace/core` with kernel/result/errors/event bus/logger/http primitives.
3. Create `@openworkspace/mcp` with tool registry and list operation.
4. Create `@openworkspace/pipeline` with minimal YAML parsing and sequential step execution.
5. Create `@openworkspace/cli` with zero-dependency parser and command dispatch.
6. Add unit tests for all foundation packages and enforce 100% coverage.
7. Validate with build + test + typecheck.

Dependencies:
- (2) must finish before (3), (4), (5).
- (3) and (4) should exist before final CLI command wiring in (5).
- (6) follows package implementation.

## Milestone 2: Auth + Config
1. OAuth2 flows: browser/headless/device.
2. Service account auth.
3. Token store backends (memory + encrypted file).
4. JSON5 config parser and persisted config management.
5. CLI auth/config command completion.

## Milestone 3: Primary Services
1. `@openworkspace/gmail`
2. `@openworkspace/calendar`
3. `@openworkspace/drive`
4. `@openworkspace/sheets`
5. Add CLI + MCP mappings for these services.

## Milestone 4: Remaining Services
1. docs
2. slides
3. contacts
4. tasks
5. chat
6. classroom
7. forms
8. appscript
9. people
10. groups
11. keep

## Milestone 5: MCP Transports
1. stdio transport.
2. HTTP/SSE transport.
3. Tool schemas, validation, and error mapping.

## Milestone 6: Pipeline Advanced Features
1. Expression evaluator.
2. forEach and conditional execution.
3. parallel execution.
4. retries, resumability, and structured execution logs.

## Milestone 7: Docs + Examples + LLM Assets
1. README optimization.
2. `llms.txt` and website sync.
3. 16+ examples.
4. API references and CLI docs.

## Milestone 8: Release Hardening
1. CI matrix with Node 22.
2. semantic version and release workflow.
3. full-package verification and npm publish dry runs.