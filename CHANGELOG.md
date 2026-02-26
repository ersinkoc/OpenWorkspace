# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-26

### Added

- **Core** (`@openworkspace/core`): Micro-kernel with plugin lifecycle, typed event bus, structured logger, Result pattern, error hierarchy
- **Auth**: OAuth2 flows (browser, headless, device code), service account auth, encrypted token store
- **Config**: JSON5 parser, persistent config store with nested key support
- **HTTP**: Zero-dependency HTTP client with interceptors, built on native `fetch`
- **CLI** (`@openworkspace/cli`): Zero-dependency argument parser with 19 command groups, output formatters (table, JSON, plain, CSV), shell completions, color support
- **MCP** (`@openworkspace/mcp`): Model Context Protocol server with 28 tools, JSON-RPC 2.0, stdio and HTTP/SSE transports
- **Pipeline** (`@openworkspace/pipeline`): YAML workflow engine with expression evaluator, forEach iteration, parallel execution, retries
- **15 Google Workspace service plugins**:
  - `@openworkspace/gmail` -- search, read, send, labels, threads, drafts
  - `@openworkspace/calendar` -- events, create, free/busy, calendar list
  - `@openworkspace/drive` -- search, upload, download, folders, permissions
  - `@openworkspace/sheets` -- read, write, append, format, structure
  - `@openworkspace/docs` -- get, create, batch update, export
  - `@openworkspace/slides` -- presentations, slides, speaker notes, export
  - `@openworkspace/contacts` -- contacts, directory, other contacts
  - `@openworkspace/tasks` -- task lists, tasks CRUD
  - `@openworkspace/chat` -- spaces, messages, direct messages
  - `@openworkspace/classroom` -- courses, coursework, roster, submissions, announcements, guardians
  - `@openworkspace/forms` -- forms, responses
  - `@openworkspace/appscript` -- script execution, projects
  - `@openworkspace/people` -- profiles, relations (manager, reports)
  - `@openworkspace/groups` -- groups, members, settings
  - `@openworkspace/keep` -- notes, attachments
- **Testing**: 2,346 tests with 100% statement coverage across all 19 packages
- **Scripts**: Quickstart wizard, smoke test, MCP server test for manual testing with real Google accounts

[1.0.0]: https://github.com/ersinkoc/openworkspace/releases/tag/v1.0.0
