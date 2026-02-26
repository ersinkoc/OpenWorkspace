# OpenWorkspace Implementation

## Architecture Overview
OpenWorkspace uses a micro-kernel architecture.

Layers:
1. Core infrastructure (`@openworkspace/core`)
2. Service plugins (`@openworkspace/<service>`)
3. Interfaces (`@openworkspace/cli`, `@openworkspace/mcp`, programmatic APIs)
4. Automation (`@openworkspace/pipeline`)

## Package Decisions (Initial Milestone)

### `@openworkspace/core`
Provides shared primitives:
- plugin kernel (`createKernel`)
- typed result helper (`ok`, `err`)
- error hierarchy (`WorkspaceError`, specialized errors)
- tiny event bus
- logger
- native fetch wrapper with interceptor support

Rationale:
- Keeps other packages runtime-dependency free.
- Defines stable contracts before service packages are added.

### `@openworkspace/cli`
Provides:
- zero-dependency parser for command/flags
- command registry model
- core commands: `--help`, `--version`, `mcp tools`, `pipeline run`

Rationale:
- Enables immediate user-facing execution with extensible command model.

### `@openworkspace/pipeline`
Provides:
- minimal YAML parser (subset required for workflow format)
- pipeline step executor
- context interpolation and step outputs

Rationale:
- Pipeline is a differentiator and central to automation workflows.

### `@openworkspace/mcp`
Provides:
- in-process tool registry
- tool listing and invocation abstraction
- CLI integration hooks (`ows mcp tools`)

Rationale:
- Establishes MCP boundaries before transport implementations.

## Technical Standards

## TypeScript
- strict mode
- noUncheckedIndexedAccess
- noImplicitOverride
- ES2022 target, ESM modules

## Testing
- Vitest per package
- V8 coverage provider
- 100% thresholds enforced

## Build
- tsup for package bundling
- turbo for monorepo orchestration

## Error Handling
- All public APIs return `Result<T, WorkspaceError>` where practical.
- Throwing is limited to unrecoverable internal programmer errors.

## Extensibility Strategy
- Kernel plugin contract is intentionally small:
  - `name`
  - `setup(ctx)`
  - `teardown?(ctx)`
- Service plugins add commands and tools through registration hooks.

## Security Strategy (Foundation)
- No secrets committed.
- Token storage interfaces only; concrete encrypted file backend expanded in next milestone.
- HTTP wrapper supports auth header injection via interceptor.

## Future Milestones
1. Auth flows (browser/headless/device + service account)
2. Config (JSON5 parser + persisted settings)
3. Gmail/Calendar/Drive/Sheets service packages
4. Remaining service packages
5. MCP transports (stdio + HTTP/SSE)
6. Website and examples expansion