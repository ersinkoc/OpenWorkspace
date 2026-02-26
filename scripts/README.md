# OpenWorkspace Manual Testing Scripts

Scripts for setting up and testing OpenWorkspace with real Google accounts.

## Prerequisites

- **Node.js 22+** - [Download](https://nodejs.org/)
- **pnpm 9+** - `npm install -g pnpm`
- **A Google Cloud project** with OAuth 2.0 credentials (see below)
- **Built packages** - `pnpm install && pnpm run build`

## Getting Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - Choose "External" user type
   - Fill in the app name and your email
   - Add test users (your Google account email)
6. For the OAuth client, choose **Desktop app** as the application type
7. Click **Create**, then **Download JSON**
8. Enable these APIs in **APIs & Services > Library**:
   - Gmail API
   - Google Calendar API
   - Google Drive API

## Scripts

### Quickstart (Interactive Setup)

The guided wizard that walks you through everything:

```bash
pnpm quickstart
# or
npx tsx scripts/quickstart.ts
```

This will:
1. Check that Node, pnpm, and the build are ready
2. Help you install your `credentials.json`
3. Authorize a Google account via browser
4. Run a quick smoke test

### Smoke Test (CLI Verification)

Runs all CLI commands against a real Google account:

```bash
pnpm smoke-test
# or
npx tsx scripts/smoke-test.ts
# with a specific account:
npx tsx scripts/smoke-test.ts --account user@gmail.com
```

Tests:
- `ows auth list` - verifies account is listed
- `ows gmail labels` - verifies Gmail access
- `ows calendar events --today` - verifies Calendar access
- `ows drive ls --max 5` - verifies Drive access
- `ows config path` - verifies config
- `ows mcp tools` - verifies MCP tool registry

### MCP Server Test

Starts the MCP server as a child process and sends JSON-RPC messages:

```bash
pnpm test:mcp
# or
npx tsx scripts/test-mcp.ts
```

Tests:
- Sends `initialize` request and verifies the server responds
- Sends `tools/list` and verifies expected tools (gmail, calendar, drive) are registered
- Exits cleanly

## Troubleshooting

**"CLI not built"** - Run `pnpm run build` from the repo root.

**"No credentials found"** - Run `pnpm quickstart` or manually:
```bash
node packages/cli/dist/cli.js auth credentials /path/to/credentials.json
```

**"No authorized accounts"** - Authorize with:
```bash
node packages/cli/dist/cli.js auth add your-email@gmail.com
```

**Gmail/Calendar/Drive test fails** - Make sure the relevant API is enabled in your Google Cloud project under APIs & Services > Library.

**Token expired** - Tokens auto-refresh, but if something goes wrong:
```bash
node packages/cli/dist/cli.js auth add your-email@gmail.com
```

**Windows path issues** - All scripts use `node:path` and should work on Windows. If you encounter issues, make sure you are running from the repo root directory.
