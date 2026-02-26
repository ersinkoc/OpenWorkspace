#!/usr/bin/env node
/**
 * MCP server integration test.
 *
 * Starts the MCP server in stdio mode as a child process, then:
 *   1. Sends a JSON-RPC `initialize` request
 *   2. Sends a `notifications/initialized` notification
 *   3. Sends a `tools/list` request
 *   4. Verifies the response contains expected tools
 *   5. Exits cleanly
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed
 *
 * Usage:
 *   npx tsx scripts/test-mcp.ts
 */

import { spawn } from 'node:child_process';
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
const MCP_BIN = join(ROOT, 'packages', 'mcp', 'dist', 'serve.js');

// ── JSON-RPC helpers ──────────────────────────────────────────

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

let nextId = 1;

function makeRequest(
  method: string,
  params?: Record<string, unknown>,
): string {
  const msg = {
    jsonrpc: '2.0' as const,
    id: nextId++,
    method,
    ...(params !== undefined ? { params } : {}),
  };
  return JSON.stringify(msg) + '\n';
}

function makeNotification(
  method: string,
  params?: Record<string, unknown>,
): string {
  const msg = {
    jsonrpc: '2.0' as const,
    method,
    ...(params !== undefined ? { params } : {}),
  };
  return JSON.stringify(msg) + '\n';
}

// ── Main test ─────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log();
  console.log(`${CYAN}${BOLD}MCP Server Integration Test${RESET}`);
  console.log(`${DIM}${'='.repeat(50)}${RESET}`);
  console.log();

  if (!existsSync(MCP_BIN)) {
    console.error(
      `${RED}MCP server not built. Run \`pnpm run build\` first.${RESET}`,
    );
    process.exit(1);
  }

  // Spawn the MCP server in stdio mode
  const child = spawn(process.execPath, [MCP_BIN, '--stdio'], {
    cwd: ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (data: Buffer) => {
    stderr += data.toString();
  });

  // Collect stdout data and resolve JSON-RPC responses
  const responseQueue: Array<(resp: JsonRpcResponse) => void> = [];
  let stdoutBuffer = '';

  child.stdout.setEncoding('utf-8');
  child.stdout.on('data', (chunk: string) => {
    stdoutBuffer += chunk;
    // Process line-delimited JSON
    let newlineIdx: number;
    while ((newlineIdx = stdoutBuffer.indexOf('\n')) !== -1) {
      const line = stdoutBuffer.slice(0, newlineIdx).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIdx + 1);
      if (line.length === 0) continue;
      try {
        const parsed = JSON.parse(line) as JsonRpcResponse;
        const resolver = responseQueue.shift();
        if (resolver) {
          resolver(parsed);
        }
      } catch {
        // Ignore non-JSON lines (e.g. server log messages)
      }
    }
  });

  /**
   * Send a JSON-RPC request and wait for a response.
   */
  function sendRequest(
    method: string,
    params?: Record<string, unknown>,
    timeoutMs = 10_000,
  ): Promise<JsonRpcResponse> {
    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for response to '${method}' (${timeoutMs}ms)`));
      }, timeoutMs);

      responseQueue.push((resp) => {
        clearTimeout(timer);
        resolve(resp);
      });

      child.stdin.write(makeRequest(method, params));
    });
  }

  /**
   * Send a JSON-RPC notification (no response expected).
   */
  function sendNotification(
    method: string,
    params?: Record<string, unknown>,
  ): void {
    child.stdin.write(makeNotification(method, params));
  }

  let passed = 0;
  let failed = 0;

  function pass(label: string, detail?: string): void {
    const extra = detail ? ` ${DIM}(${detail})${RESET}` : '';
    console.log(`  ${GREEN}PASS${RESET}  ${label}${extra}`);
    passed++;
  }

  function fail(label: string, detail?: string): void {
    const extra = detail ? ` ${DIM}(${detail})${RESET}` : '';
    console.log(`  ${RED}FAIL${RESET}  ${label}${extra}`);
    failed++;
  }

  try {
    // ── Test 1: initialize ──────────────────────────────────

    const initResp = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'ows-test', version: '0.1.0' },
    });

    if (initResp.error) {
      fail('initialize', initResp.error.message);
    } else {
      const result = initResp.result as Record<string, unknown> | undefined;
      const serverInfo = result?.['serverInfo'] as
        | Record<string, unknown>
        | undefined;
      const serverName = serverInfo?.['name'] ?? 'unknown';
      pass('initialize', `server: ${serverName}`);
    }

    // ── Send initialized notification ───────────────────────

    sendNotification('notifications/initialized');

    // Small delay to let the server process the notification
    await new Promise((r) => setTimeout(r, 200));

    // ── Test 2: tools/list ──────────────────────────────────

    const toolsResp = await sendRequest('tools/list', {});

    if (toolsResp.error) {
      fail('tools/list', toolsResp.error.message);
    } else {
      const result = toolsResp.result as Record<string, unknown> | undefined;
      const tools = result?.['tools'] as Array<Record<string, unknown>> | undefined;
      if (!tools || !Array.isArray(tools)) {
        fail('tools/list', 'no tools array in response');
      } else {
        pass('tools/list', `${tools.length} tools returned`);

        // ── Test 3: verify expected tools ───────────────────

        const toolNames = new Set(tools.map((t) => t['name'] as string));
        const expectedToolPrefixes = [
          'gmail',
          'calendar',
          'drive',
        ];

        let foundExpected = 0;
        for (const prefix of expectedToolPrefixes) {
          const hasMatch = [...toolNames].some((n) =>
            n.toLowerCase().includes(prefix),
          );
          if (hasMatch) {
            foundExpected++;
          } else {
            console.log(
              `    ${YELLOW}!${RESET} ${DIM}No tool matching "${prefix}" found${RESET}`,
            );
          }
        }

        if (foundExpected === expectedToolPrefixes.length) {
          pass(
            'expected tools present',
            expectedToolPrefixes.join(', '),
          );
        } else {
          fail(
            'expected tools present',
            `${foundExpected}/${expectedToolPrefixes.length} found`,
          );
        }

        // Print first few tool names for info
        const preview = [...toolNames].slice(0, 8);
        console.log(
          `\n  ${DIM}Sample tools: ${preview.join(', ')}${preview.length < toolNames.size ? ', ...' : ''}${RESET}`,
        );
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fail('MCP communication', msg);
  }

  // ── Cleanup ─────────────────────────────────────────────────

  child.stdin.end();
  // Give the process a moment to exit on its own
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve();
    }, 3000);
    child.on('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });

  if (stderr.trim().length > 0) {
    console.log(`\n  ${DIM}Server stderr: ${stderr.trim().split('\n')[0]}${RESET}`);
  }

  // ── Report ──────────────────────────────────────────────────

  console.log();
  console.log(`${DIM}${'─'.repeat(50)}${RESET}`);

  if (failed === 0) {
    console.log(
      `\n${GREEN}${BOLD}All ${passed} MCP tests passed.${RESET}\n`,
    );
    process.exit(0);
  } else {
    console.log(
      `\n${RED}${BOLD}${failed} failed${RESET}, ${GREEN}${passed} passed${RESET} out of ${passed + failed} tests.\n`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n${RED}Fatal error:${RESET}`, err);
  process.exit(1);
});
