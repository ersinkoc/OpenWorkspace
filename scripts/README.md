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
   - Google Sheets API
   - Google Docs API
   - Google Slides API
   - People API
   - Tasks API
   - *(Optional)* Google Chat API, Classroom API, Forms API, Apps Script API, Keep API, Cloud Identity API

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

### Full E2E Test (All 15 Services)

Comprehensive end-to-end test that exercises every Google Workspace service. Safe to run -- all created items are prefixed with `[OWS-TEST]` and cleaned up automatically.

```bash
pnpm test:e2e
# or
npx tsx scripts/e2e-test.ts
# with a specific account:
npx tsx scripts/e2e-test.ts --account user@gmail.com
# skip services that need Workspace:
npx tsx scripts/e2e-test.ts --skip chat,classroom,groups,keep
```

**Required APIs** (enable in Google Cloud Console > APIs & Services > Library):
- Gmail API
- Google Calendar API
- Google Drive API
- Google Sheets API
- Google Docs API
- Google Slides API
- People API
- Tasks API

**Optional APIs** (Workspace / admin accounts only):
- Google Chat API (requires Workspace)
- Google Classroom API (requires educator account)
- Cloud Identity API (requires Workspace admin)
- Google Keep API (requires Workspace)
- Apps Script API
- Google Forms API

**What it tests per service:**

| Service    | Read-only Tests             | Create + Cleanup Tests                      |
|------------|-----------------------------|---------------------------------------------|
| Gmail      | List labels, search, drafts | Create draft (not sent)                     |
| Calendar   | List calendars/events, free/busy | Create event -> delete                 |
| Drive      | List files, search          | Create folder -> upload -> download -> delete |
| Sheets     | -                           | Create spreadsheet -> write -> read -> append -> delete |
| Docs       | -                           | Create doc -> read -> delete                |
| Slides     | -                           | Create presentation -> read -> delete       |
| Contacts   | List contacts               | Create contact -> delete                    |
| Tasks      | List task lists              | Create list -> create task -> complete -> delete |
| People     | Get own profile             | -                                           |
| Chat       | List spaces                 | -                                           |
| Classroom  | List courses                | -                                           |
| Forms      | -                           | Create form -> read -> delete               |
| Apps Script| List processes              | -                                           |
| Groups     | List groups                 | -                                           |
| Keep       | List notes                  | -                                           |

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
