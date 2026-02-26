# Example: MCP for Claude Desktop

Configure the OpenWorkspace MCP server to work with Claude Desktop.

## Setup

1. Copy `claude_desktop_config.json` to your Claude Desktop config directory:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. Restart Claude Desktop.

3. The OpenWorkspace tools will appear in Claude's tool list, allowing
   Claude to search Gmail, manage Calendar events, upload files to Drive, and more.

## What it demonstrates

- Configuring an MCP server for Claude Desktop
- Using stdio transport for local process communication
- Exposing Google Workspace operations as MCP tools
