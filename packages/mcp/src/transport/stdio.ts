/**
 * stdio transport for the MCP server.
 *
 * Reads line-delimited JSON-RPC messages from stdin and writes
 * line-delimited JSON-RPC responses to stdout.
 *
 * This transport is designed for use with Claude Desktop and other
 * MCP clients that communicate via standard I/O pipes.
 */

import type { Transport, JsonRpcMessage, JsonRpcResponse } from '../server.js';

/**
 * Creates a stdio-based MCP transport.
 *
 * Messages are read as newline-delimited JSON from `process.stdin`
 * and responses are written as newline-delimited JSON to `process.stdout`.
 *
 * Partial lines are buffered until a complete newline-terminated line
 * is received, ensuring reliable parsing of chunked input.
 *
 * @returns A Transport implementation using stdin/stdout.
 *
 * @example
 * ```ts
 * const transport = createStdioTransport();
 * const server = createMcpServer(registry, options);
 * await server.connect(transport);
 * ```
 */
export function createStdioTransport(): Transport {
  let onMessage: ((msg: JsonRpcMessage) => void) | null = null;
  let onClose: (() => void) | null = null;
  let onError: ((err: Error) => void) | null = null;
  let buffer = '';

  /**
   * Process the buffer, extracting and dispatching complete lines.
   */
  function processBuffer(): void {
    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);

      if (line.length === 0) {
        continue;
      }

      try {
        const msg = JSON.parse(line) as JsonRpcMessage;
        onMessage?.(msg);
      } catch (e) {
        onError?.(e instanceof Error ? e : new Error(String(e)));
      }
    }
  }

  return {
    get onMessage() {
      return onMessage;
    },
    set onMessage(fn) {
      onMessage = fn;
    },
    get onClose() {
      return onClose;
    },
    set onClose(fn) {
      onClose = fn;
    },
    get onError() {
      return onError;
    },
    set onError(fn) {
      onError = fn;
    },

    async start(): Promise<void> {
      process.stdin.setEncoding('utf-8');

      process.stdin.on('data', (chunk: string) => {
        buffer += chunk;
        processBuffer();
      });

      process.stdin.on('end', () => {
        onClose?.();
      });

      process.stdin.on('error', (e: Error) => {
        onError?.(e);
      });

      process.stdin.resume();
    },

    async close(): Promise<void> {
      process.stdin.pause();
      process.stdin.removeAllListeners();
      buffer = '';
    },

    async send(message: JsonRpcResponse): Promise<void> {
      const json = JSON.stringify(message);
      return new Promise<void>((resolve, reject) => {
        process.stdout.write(json + '\n', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },
  };
}
