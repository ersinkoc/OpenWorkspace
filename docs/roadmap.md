# OpenWorkspace Roadmap

## Completed Milestones

### Milestone 1: Foundation
- [x] Root monorepo files (package.json, pnpm-workspace.yaml, turbo.json, tsconfig)
- [x] `@openworkspace/core` with kernel, result, errors, event bus, logger, HTTP client
- [x] `@openworkspace/mcp` with tool registry
- [x] `@openworkspace/pipeline` with YAML parsing and sequential step execution
- [x] `@openworkspace/cli` with zero-dependency parser and command dispatch
- [x] Unit tests with 100% coverage

### Milestone 2: Auth + Config
- [x] OAuth2 flows: browser, headless, device code
- [x] Service account auth (JWT signing)
- [x] Token store backends (memory + encrypted file)
- [x] JSON5 config parser and persistent config store
- [x] CLI auth/config command completion

### Milestone 3: Primary Services
- [x] `@openworkspace/gmail` -- search, send, labels, threads, drafts
- [x] `@openworkspace/calendar` -- events, create, free/busy, calendar list
- [x] `@openworkspace/drive` -- search, upload, download, folders, permissions
- [x] `@openworkspace/sheets` -- read, write, append, format, structure
- [x] CLI + MCP mappings for all primary services

### Milestone 4: Remaining Services
- [x] `@openworkspace/docs` -- get, create, batch update, export
- [x] `@openworkspace/slides` -- presentations, slides, speaker notes, export
- [x] `@openworkspace/contacts` -- contacts, directory, other contacts
- [x] `@openworkspace/tasks` -- task lists, tasks CRUD
- [x] `@openworkspace/chat` -- spaces, messages, direct messages
- [x] `@openworkspace/classroom` -- courses, coursework, roster, submissions, announcements, guardians
- [x] `@openworkspace/forms` -- forms, responses
- [x] `@openworkspace/appscript` -- script execution, projects
- [x] `@openworkspace/people` -- profiles, relations
- [x] `@openworkspace/groups` -- groups, members, settings
- [x] `@openworkspace/keep` -- notes, attachments

### Milestone 5: MCP Transports
- [x] stdio transport (for Claude Desktop)
- [x] HTTP/SSE transport
- [x] Tool schemas, validation, and error mapping
- [x] Resource and prompt registries

### Milestone 6: Pipeline Advanced Features
- [x] Expression evaluator (`${{ }}`)
- [x] forEach and conditional execution
- [x] Parallel execution
- [x] Retries and structured execution logs
- [x] Programmatic builder API

## Upcoming Milestones

### Milestone 7: Docs + Examples + LLM Assets
- [ ] `llms.txt` (< 2000 tokens)
- [ ] 16+ examples organized by service
- [ ] API reference documentation
- [ ] CLI command reference

### Milestone 8: Website
- [ ] Landing page at openworkspace.oxog.dev
- [ ] Getting started guide
- [ ] API reference per package
- [ ] MCP server guide
- [ ] Pipeline guide

### Milestone 9: Release Hardening
- [ ] CI matrix with Node 22
- [ ] Semantic version and release workflow
- [ ] npm publish dry runs
- [ ] Full-package verification
