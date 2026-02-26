#!/usr/bin/env node
/**
 * Interactive quickstart script for OpenWorkspace.
 *
 * Guides the user through:
 *   1. Checking prerequisites (Node, pnpm, build)
 *   2. Setting up Google OAuth credentials
 *   3. Authorizing a Google account
 *   4. Running a quick smoke test to verify the token works
 *
 * Usage:
 *   npx tsx scripts/quickstart.ts
 *   node --import tsx scripts/quickstart.ts
 */

import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

// ── ANSI helpers ──────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';

function banner(text: string): void {
  const line = '='.repeat(60);
  console.log(`\n${CYAN}${line}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${text}${RESET}`);
  console.log(`${CYAN}${line}${RESET}\n`);
}

function step(n: number, text: string): void {
  console.log(`${BOLD}${BLUE}[${n}/4]${RESET} ${BOLD}${text}${RESET}`);
}

function success(text: string): void {
  console.log(`  ${GREEN}+${RESET} ${text}`);
}

function warn(text: string): void {
  console.log(`  ${YELLOW}!${RESET} ${text}`);
}

function fail(text: string): void {
  console.log(`  ${RED}x${RESET} ${text}`);
}

function info(text: string): void {
  console.log(`  ${DIM}${text}${RESET}`);
}

// ── Readline prompt ───────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise((res) => {
    rl.question(`${MAGENTA}?${RESET} ${question} `, (answer) => {
      res(answer.trim());
    });
  });
}

function askYN(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  return ask(`${question} ${DIM}${hint}${RESET}`).then((a) => {
    if (a === '') return defaultYes;
    return a.toLowerCase().startsWith('y');
  });
}

// ── Paths ─────────────────────────────────────────────────────

const ROOT = resolve(import.meta.dirname ?? '.', '..');
const CLI_BIN = join(ROOT, 'packages', 'cli', 'dist', 'cli.js');
const MCP_BIN = join(ROOT, 'packages', 'mcp', 'dist', 'serve.js');
const CONFIG_DIR =
  process.platform === 'win32'
    ? join(
        process.env['APPDATA'] ?? join(homedir(), 'AppData', 'Roaming'),
        'openworkspace',
      )
    : join(homedir(), '.config', 'openworkspace');

/**
 * Run the CLI with given arguments and return stdout.
 * Uses execFileSync with explicit argv array to avoid shell injection.
 */
function runCli(args: string[]): string {
  return execFileSync(process.execPath, [CLI_BIN, ...args], {
    encoding: 'utf-8',
    cwd: ROOT,
    timeout: 30_000,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

// ── Step 1: Prerequisites ─────────────────────────────────────

async function checkPrerequisites(): Promise<boolean> {
  step(1, 'Checking prerequisites');

  // Node version
  const nodeVer = process.versions.node;
  const major = parseInt(nodeVer.split('.')[0]!, 10);
  if (major >= 22) {
    success(`Node.js v${nodeVer}`);
  } else {
    fail(`Node.js v${nodeVer} -- version 22+ required`);
    return false;
  }

  // pnpm
  try {
    const pnpmVer = execFileSync('pnpm', ['--version'], {
      encoding: 'utf-8',
      timeout: 10_000,
    }).trim();
    success(`pnpm v${pnpmVer}`);
  } catch {
    fail('pnpm not found. Install it: https://pnpm.io/installation');
    return false;
  }

  // CLI build
  if (existsSync(CLI_BIN)) {
    success('CLI built (packages/cli/dist/cli.js)');
  } else {
    warn('CLI not built yet -- building now...');
    try {
      execFileSync('pnpm', ['run', 'build'], {
        cwd: ROOT,
        stdio: 'inherit',
        timeout: 120_000,
      });
      success('Build completed');
    } catch {
      fail('Build failed. Run `pnpm run build` manually and check errors.');
      return false;
    }
  }

  // MCP build
  if (existsSync(MCP_BIN)) {
    success('MCP server built (packages/mcp/dist/serve.js)');
  } else {
    warn('MCP server not built -- it should have been built in the previous step.');
  }

  console.log();
  return true;
}

// ── Step 2: Credentials ──────────────────────────────────────

async function setupCredentials(): Promise<boolean> {
  step(2, 'Google OAuth credentials');

  const credsPath = join(CONFIG_DIR, 'credentials.json');

  if (existsSync(credsPath)) {
    success(`Credentials already installed at ${credsPath}`);
    const overwrite = await askYN('Overwrite with a new credentials file?', false);
    if (!overwrite) {
      console.log();
      return true;
    }
  }

  console.log();
  info('You need a Google Cloud project with an OAuth 2.0 client (Desktop type).');
  info('If you do not have one yet:');
  info('');
  info(`  1. Go to ${CYAN}https://console.cloud.google.com/apis/credentials${RESET}`);
  info('  2. Create a project (or select an existing one)');
  info('  3. Click "Create Credentials" > "OAuth client ID"');
  info('  4. Choose "Desktop app", give it a name, click "Create"');
  info('  5. Download the JSON file');
  info('');
  info('Enable these APIs in your project:');
  info('  - Gmail API');
  info('  - Google Calendar API');
  info('  - Google Drive API');
  info('');

  const filePath = await ask('Path to your downloaded credentials JSON file:');
  if (!filePath) {
    fail('No path provided. You can run this script again later.');
    return false;
  }

  const resolved = resolve(filePath.replace(/^["']|["']$/g, ''));
  if (!existsSync(resolved)) {
    fail(`File not found: ${resolved}`);
    return false;
  }

  try {
    // Use the CLI's own credential import
    const output = runCli(['auth', 'credentials', resolved]);
    success(output);
  } catch {
    // Fallback: copy manually
    mkdirSync(CONFIG_DIR, { recursive: true });
    copyFileSync(resolved, credsPath);
    success(`Credentials copied to ${credsPath}`);
  }

  console.log();
  return true;
}

// ── Step 3: Authorize account ────────────────────────────────

async function authorizeAccount(): Promise<string | null> {
  step(3, 'Authorize a Google account');

  // Check for existing accounts
  try {
    const listOutput = runCli(['auth', 'list', '--json']);
    const parsed = JSON.parse(listOutput) as {
      accounts: Array<{ account: string }>;
    };
    if (parsed.accounts.length > 0) {
      const names = parsed.accounts.map((a) => a.account);
      success(`Authorized accounts found: ${names.join(', ')}`);
      const addAnother = await askYN('Add another account?', false);
      if (!addAnother) {
        console.log();
        return names[0]!;
      }
    }
  } catch {
    // No accounts yet, proceed to add
  }

  const email = await ask('Google account email to authorize:');
  if (!email) {
    fail('No email provided.');
    return null;
  }

  console.log();
  info('Opening your browser for Google authorization...');
  info('(If the browser does not open, use --headless or --device flag)');
  console.log();

  try {
    execFileSync(process.execPath, [CLI_BIN, 'auth', 'add', email], {
      cwd: ROOT,
      stdio: 'inherit',
      timeout: 120_000,
    });
    success(`Account ${email} authorized!`);
    console.log();
    return email;
  } catch {
    console.log();
    warn('Browser flow failed. Trying device code flow...');
    console.log();
    try {
      execFileSync(
        process.execPath,
        [CLI_BIN, 'auth', 'add', email, '--device'],
        {
          cwd: ROOT,
          stdio: 'inherit',
          timeout: 120_000,
        },
      );
      success(`Account ${email} authorized!`);
      console.log();
      return email;
    } catch {
      fail('Authorization failed. Check your credentials and try again.');
      console.log();
      return null;
    }
  }
}

// ── Step 4: Smoke test ───────────────────────────────────────

async function quickSmokeTest(account: string): Promise<void> {
  step(4, 'Quick smoke test');

  const tests: Array<{ label: string; args: string[] }> = [
    { label: 'Auth list', args: ['auth', 'list'] },
    { label: 'Gmail labels', args: ['gmail', 'labels', '--account', account] },
    { label: 'Config path', args: ['config', 'path'] },
    { label: 'MCP tools', args: ['mcp', 'tools'] },
  ];

  let passed = 0;
  for (const t of tests) {
    try {
      const output = runCli(t.args);
      if (output.length > 0) {
        success(`${t.label} -- OK`);
        passed++;
      } else {
        warn(`${t.label} -- empty output`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      fail(`${t.label} -- ${msg.split('\n')[0]}`);
    }
  }

  console.log();
  if (passed === tests.length) {
    console.log(`${GREEN}${BOLD}All smoke tests passed!${RESET}`);
  } else {
    console.log(
      `${YELLOW}${BOLD}${passed}/${tests.length} tests passed.${RESET} Some services may need additional API enablement.`,
    );
  }
}

// ── Main ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  banner('OpenWorkspace Quickstart');

  console.log(
    `${DIM}This wizard will set up OpenWorkspace on your machine for testing`,
  );
  console.log(`with your own Google account. It takes about 2 minutes.${RESET}\n`);

  const prereqOk = await checkPrerequisites();
  if (!prereqOk) {
    rl.close();
    process.exit(1);
  }

  const credsOk = await setupCredentials();
  if (!credsOk) {
    rl.close();
    process.exit(1);
  }

  const account = await authorizeAccount();
  if (!account) {
    warn('Skipping smoke test (no authorized account).');
    rl.close();
    process.exit(1);
  }

  await quickSmokeTest(account);

  console.log();
  info('Next steps:');
  info(
    `  ${CYAN}npx tsx scripts/smoke-test.ts${RESET}        -- full smoke test suite`,
  );
  info(
    `  ${CYAN}npx tsx scripts/test-mcp.ts${RESET}          -- test MCP server`,
  );
  info(
    `  ${CYAN}node packages/cli/dist/cli.js --help${RESET} -- see all CLI commands`,
  );
  console.log();

  rl.close();
}

main().catch((err) => {
  console.error(`\n${RED}Fatal error:${RESET}`, err);
  rl.close();
  process.exit(1);
});
