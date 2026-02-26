#!/usr/bin/env node
/**
 * Automated smoke test for OpenWorkspace CLI.
 *
 * Runs a series of CLI commands against a real Google account to verify
 * that authentication, Gmail, Calendar, Drive, config, and MCP all work.
 *
 * Exit codes:
 *   0 — all tests passed
 *   1 — one or more tests failed
 *
 * Usage:
 *   npx tsx scripts/smoke-test.ts
 *   npx tsx scripts/smoke-test.ts --account user@gmail.com
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

// ── ANSI helpers ──────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

// ── Paths ─────────────────────────────────────────────────────

const ROOT = resolve(import.meta.dirname ?? '.', '..');
const CLI_BIN = join(ROOT, 'packages', 'cli', 'dist', 'cli.js');

// ── Parse script flags ────────────────────────────────────────

function parseScriptArgs(): { account?: string } {
  const args = process.argv.slice(2);
  const accountIdx = args.indexOf('--account');
  const account =
    accountIdx !== -1 && args[accountIdx + 1] ? args[accountIdx + 1] : undefined;
  return { account };
}

// ── Test infrastructure ───────────────────────────────────────

type TestResult = {
  name: string;
  passed: boolean;
  output: string;
  error?: string;
  durationMs: number;
};

function runCli(args: string[], timeoutMs = 30_000): string {
  return execFileSync(process.execPath, [CLI_BIN, ...args], {
    encoding: 'utf-8',
    cwd: ROOT,
    timeout: timeoutMs,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

async function runTest(
  name: string,
  args: string[],
  validate?: (stdout: string) => void,
): Promise<TestResult> {
  const start = performance.now();
  try {
    const output = runCli(args);
    if (validate) {
      validate(output);
    }
    const durationMs = Math.round(performance.now() - start);
    return { name, passed: true, output, durationMs };
  } catch (e) {
    const durationMs = Math.round(performance.now() - start);
    const error = e instanceof Error ? e.message : String(e);
    // Try to extract just the first meaningful line
    const firstLine = error.split('\n').find((l) => l.trim().length > 0) ?? error;
    return { name, passed: false, output: '', error: firstLine, durationMs };
  }
}

// ── Test suite ────────────────────────────────────────────────

async function main(): Promise<void> {
  const { account } = parseScriptArgs();

  console.log();
  console.log(
    `${CYAN}${BOLD}OpenWorkspace Smoke Tests${RESET}`,
  );
  console.log(`${DIM}${'='.repeat(50)}${RESET}`);

  if (!existsSync(CLI_BIN)) {
    console.error(
      `\n${RED}CLI not built. Run \`pnpm run build\` first.${RESET}`,
    );
    process.exit(1);
  }

  if (account) {
    console.log(`${DIM}Account: ${account}${RESET}`);
  }
  console.log();

  const accountArgs = account ? ['--account', account] : [];

  const results: TestResult[] = [];

  // ── 1. auth list ────────────────────────────────────────────

  results.push(
    await runTest('ows auth list', ['auth', 'list'], (out) => {
      if (!out.includes('Account') && !out.includes('@')) {
        // It is ok if there are zero accounts — that is not a crash
      }
    }),
  );

  // ── 2. gmail labels ────────────────────────────────────────

  results.push(
    await runTest(
      'ows gmail labels',
      ['gmail', 'labels', ...accountArgs],
      (out) => {
        // Gmail should return at least one label like INBOX
        if (!out.toLowerCase().includes('inbox')) {
          throw new Error('Expected output to contain "INBOX"');
        }
      },
    ),
  );

  // ── 3. calendar events --today ─────────────────────────────

  results.push(
    await runTest(
      'ows calendar events --today',
      ['calendar', 'events', '--today', ...accountArgs],
      // Calendar might have zero events — any non-error response is OK
    ),
  );

  // ── 4. drive ls --max 5 ────────────────────────────────────

  results.push(
    await runTest(
      'ows drive ls --max 5',
      ['drive', 'ls', '--max', '5', ...accountArgs],
      // Drive might be empty — any non-error response is OK
    ),
  );

  // ── 5. config path ─────────────────────────────────────────

  results.push(
    await runTest('ows config path', ['config', 'path'], (out) => {
      if (out.length === 0) {
        throw new Error('Expected a non-empty config path');
      }
    }),
  );

  // ── 6. mcp tools ───────────────────────────────────────────

  results.push(
    await runTest('ows mcp tools', ['mcp', 'tools'], (out) => {
      if (!out.toLowerCase().includes('tool')) {
        throw new Error('Expected MCP tools listing');
      }
    }),
  );

  // ── Report ──────────────────────────────────────────────────

  console.log(`${DIM}${'─'.repeat(50)}${RESET}`);
  console.log();

  let passCount = 0;
  let failCount = 0;

  for (const r of results) {
    const status = r.passed
      ? `${GREEN}PASS${RESET}`
      : `${RED}FAIL${RESET}`;
    const duration = `${DIM}(${r.durationMs}ms)${RESET}`;
    console.log(`  ${status}  ${r.name}  ${duration}`);
    if (!r.passed && r.error) {
      // Show a truncated error line
      const shortError =
        r.error.length > 120 ? r.error.slice(0, 120) + '...' : r.error;
      console.log(`         ${RED}${shortError}${RESET}`);
    }
    if (r.passed) passCount++;
    else failCount++;
  }

  console.log();
  console.log(`${DIM}${'─'.repeat(50)}${RESET}`);

  if (failCount === 0) {
    console.log(
      `\n${GREEN}${BOLD}All ${passCount} tests passed.${RESET}\n`,
    );
    process.exit(0);
  } else {
    console.log(
      `\n${RED}${BOLD}${failCount} failed${RESET}, ${GREEN}${passCount} passed${RESET} out of ${results.length} tests.\n`,
    );
    if (failCount > 0) {
      console.log(`${YELLOW}Hints:${RESET}`);
      console.log(
        `  - Make sure you have run ${CYAN}npx tsx scripts/quickstart.ts${RESET} first`,
      );
      console.log(
        `  - Ensure Gmail, Calendar, and Drive APIs are enabled in your Google Cloud project`,
      );
      console.log(
        `  - Check that your OAuth token is not expired (run ${CYAN}ows auth list --check${RESET})`,
      );
      console.log();
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n${RED}Fatal error:${RESET}`, err);
  process.exit(1);
});
