# @openworkspace/cli

> Zero-dependency CLI for Google Workspace services. Binary: `ows`.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install -g @openworkspace/cli
```

## Usage

```bash
# Authenticate
ows auth login

# Gmail
ows gmail search "from:boss subject:urgent"
ows gmail send --to alice@example.com --subject "Hello" --body "Hi!"

# Calendar
ows calendar list --days 7
ows calendar create --title "Standup" --start "2025-01-15T09:00:00"

# Drive
ows drive search "budget 2025"
ows drive upload ./report.pdf

# Sheets
ows sheets get <spreadsheetId> "Sheet1!A1:D10"

# Tasks
ows tasks list
ows tasks add "Buy groceries"

# Pipeline
ows pipeline run workflow.yaml

# MCP server (stdio)
ows mcp serve
```

## Commands

| Command | Description |
|---------|-------------|
| `ows auth login` | Start OAuth2 login flow |
| `ows auth status` | Show current auth status |
| `ows gmail search <query>` | Search Gmail messages |
| `ows gmail send` | Send an email |
| `ows calendar list` | List upcoming events |
| `ows calendar create` | Create a calendar event |
| `ows drive search <query>` | Search Drive files |
| `ows drive upload <file>` | Upload a file to Drive |
| `ows sheets get <id> <range>` | Read spreadsheet values |
| `ows tasks list` | List task lists and tasks |
| `ows pipeline run <file>` | Run a YAML pipeline |
| `ows mcp serve` | Start MCP server (stdio) |

## Options

```
--format, -f   Output format: table, json, yaml (default: table)
--profile, -p  Auth profile to use (default: default)
--verbose, -v  Verbose output
--help, -h     Show help
```

## License

[MIT](../../LICENSE)
