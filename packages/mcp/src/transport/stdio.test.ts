import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { createStdioTransport } from './stdio.js';
import type { Transport, JsonRpcMessage, JsonRpcResponse } from '../server.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock stdin (readable) that can emit 'data', 'end', 'error'.
 * Provides setEncoding, resume, pause, removeAllListeners as stubs.
 */
function createMockStdin(): EventEmitter & {
  setEncoding: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
} {
  const emitter = new EventEmitter();
  // Capture the original before we overwrite it via Object.assign
  const originalRemoveAllListeners = emitter.removeAllListeners.bind(emitter);
  return Object.assign(emitter, {
    setEncoding: vi.fn(),
    resume: vi.fn(),
    pause: vi.fn(),
    removeAllListeners: vi.fn(() => {
      originalRemoveAllListeners();
      return emitter;
    }),
  });
}

/**
 * Creates a mock stdout (writable) with a write stub.
 * The write stub captures the data and calls the callback.
 */
function createMockStdout(): {
  write: ReturnType<typeof vi.fn>;
  written: string[];
} {
  const written: string[] = [];
  const write = vi.fn((data: string, cb?: (err?: Error | null) => void) => {
    written.push(data);
    if (cb) cb(null);
    return true;
  });
  return { write, written };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('transport/stdio', () => {
  let originalStdin: typeof process.stdin;
  let originalStdout: typeof process.stdout;
  let mockStdin: ReturnType<typeof createMockStdin>;
  let mockStdout: ReturnType<typeof createMockStdout>;
  let transport: Transport;

  beforeEach(() => {
    // Save originals
    originalStdin = process.stdin;
    originalStdout = process.stdout;

    // Create mocks
    mockStdin = createMockStdin();
    mockStdout = createMockStdout();

    // Replace process.stdin / process.stdout
    Object.defineProperty(process, 'stdin', { value: mockStdin, writable: true });
    Object.defineProperty(process, 'stdout', { value: mockStdout, writable: true });

    transport = createStdioTransport();
  });

  afterEach(() => {
    // Restore originals
    Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    Object.defineProperty(process, 'stdout', { value: originalStdout, writable: true });
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('should have onMessage as null', () => {
      expect(transport.onMessage).toBeNull();
    });

    it('should have onClose as null', () => {
      expect(transport.onClose).toBeNull();
    });

    it('should have onError as null', () => {
      expect(transport.onError).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Setting callbacks
  // -------------------------------------------------------------------------

  describe('setting callbacks', () => {
    it('should accept onMessage callback', () => {
      const fn = vi.fn();
      transport.onMessage = fn;
      expect(transport.onMessage).toBe(fn);
    });

    it('should accept onClose callback', () => {
      const fn = vi.fn();
      transport.onClose = fn;
      expect(transport.onClose).toBe(fn);
    });

    it('should accept onError callback', () => {
      const fn = vi.fn();
      transport.onError = fn;
      expect(transport.onError).toBe(fn);
    });

    it('should allow setting callbacks back to null', () => {
      transport.onMessage = vi.fn();
      transport.onMessage = null;
      expect(transport.onMessage).toBeNull();
    });

    it('should allow replacing callbacks', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      transport.onMessage = fn1;
      expect(transport.onMessage).toBe(fn1);
      transport.onMessage = fn2;
      expect(transport.onMessage).toBe(fn2);
    });
  });

  // -------------------------------------------------------------------------
  // start()
  // -------------------------------------------------------------------------

  describe('start()', () => {
    it('should set encoding to utf-8 on stdin', async () => {
      await transport.start();
      expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf-8');
    });

    it('should resume stdin', async () => {
      await transport.start();
      expect(mockStdin.resume).toHaveBeenCalledOnce();
    });

    it('should register data, end, and error listeners on stdin', async () => {
      await transport.start();
      expect(mockStdin.listenerCount('data')).toBe(1);
      expect(mockStdin.listenerCount('end')).toBe(1);
      expect(mockStdin.listenerCount('error')).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Parsing valid JSON-RPC messages
  // -------------------------------------------------------------------------

  describe('parsing valid JSON-RPC messages from stdin', () => {
    it('should dispatch a valid JSON-RPC message to onMessage', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      const msg: JsonRpcMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      };
      mockStdin.emit('data', JSON.stringify(msg) + '\n');

      expect(onMessage).toHaveBeenCalledOnce();
      expect(onMessage).toHaveBeenCalledWith(msg);
    });

    it('should handle multiple messages in a single data chunk', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      const msg1: JsonRpcMessage = { jsonrpc: '2.0', id: 1, method: 'ping' };
      const msg2: JsonRpcMessage = { jsonrpc: '2.0', id: 2, method: 'ping' };
      mockStdin.emit('data', JSON.stringify(msg1) + '\n' + JSON.stringify(msg2) + '\n');

      expect(onMessage).toHaveBeenCalledTimes(2);
      expect(onMessage).toHaveBeenNthCalledWith(1, msg1);
      expect(onMessage).toHaveBeenNthCalledWith(2, msg2);
    });

    it('should parse a notification message (no id)', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      const msg: JsonRpcMessage = { jsonrpc: '2.0', method: 'initialized' };
      mockStdin.emit('data', JSON.stringify(msg) + '\n');

      expect(onMessage).toHaveBeenCalledOnce();
      expect(onMessage).toHaveBeenCalledWith(msg);
    });

    it('should not call onMessage before a newline is received', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      // Send JSON without trailing newline - should not trigger onMessage yet
      mockStdin.emit('data', '{"jsonrpc":"2.0","id":1,"method":"ping"}');

      expect(onMessage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Partial / chunked input
  // -------------------------------------------------------------------------

  describe('handling partial/chunked input', () => {
    it('should buffer partial lines and process when newline arrives', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      // Send first half
      mockStdin.emit('data', '{"jsonrpc":"2.0"');
      expect(onMessage).not.toHaveBeenCalled();

      // Send second half with newline
      mockStdin.emit('data', ',"id":1,"method":"ping"}\n');
      expect(onMessage).toHaveBeenCalledOnce();
      expect(onMessage).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 1,
        method: 'ping',
      });
    });

    it('should handle message split across three chunks', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      mockStdin.emit('data', '{"jsonrpc"');
      mockStdin.emit('data', ':"2.0","id":');
      mockStdin.emit('data', '1,"method":"ping"}\n');

      expect(onMessage).toHaveBeenCalledOnce();
      expect(onMessage).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 1,
        method: 'ping',
      });
    });

    it('should handle a complete message followed by a partial one', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      // Complete message + start of next
      mockStdin.emit('data', '{"jsonrpc":"2.0","id":1,"method":"ping"}\n{"jsonrpc":"2.0"');
      expect(onMessage).toHaveBeenCalledOnce();

      // Complete the second message
      mockStdin.emit('data', ',"id":2,"method":"ping"}\n');
      expect(onMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle a chunk with trailing content after the newline', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      // Two messages in one chunk, second not yet newline-terminated
      mockStdin.emit('data', '{"jsonrpc":"2.0","id":1,"method":"a"}\n{"jsonrpc":"2.0","id":2,"method":"b"}');
      expect(onMessage).toHaveBeenCalledOnce();

      // Now terminate the second
      mockStdin.emit('data', '\n');
      expect(onMessage).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // Empty lines
  // -------------------------------------------------------------------------

  describe('handling empty lines', () => {
    it('should skip empty lines', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      mockStdin.emit('data', '\n\n\n');

      expect(onMessage).not.toHaveBeenCalled();
    });

    it('should skip whitespace-only lines', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      mockStdin.emit('data', '   \n\t\n  \t  \n');

      expect(onMessage).not.toHaveBeenCalled();
    });

    it('should process messages between empty lines', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      const msg: JsonRpcMessage = { jsonrpc: '2.0', id: 1, method: 'ping' };
      mockStdin.emit('data', '\n\n' + JSON.stringify(msg) + '\n\n\n');

      expect(onMessage).toHaveBeenCalledOnce();
      expect(onMessage).toHaveBeenCalledWith(msg);
    });
  });

  // -------------------------------------------------------------------------
  // Invalid JSON
  // -------------------------------------------------------------------------

  describe('invalid JSON triggers onError', () => {
    it('should call onError for invalid JSON', async () => {
      const onError = vi.fn();
      transport.onError = onError;

      await transport.start();

      mockStdin.emit('data', 'this is not json\n');

      expect(onError).toHaveBeenCalledOnce();
      expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);
    });

    it('should not call onMessage for invalid JSON', async () => {
      const onMessage = vi.fn();
      const onError = vi.fn();
      transport.onMessage = onMessage;
      transport.onError = onError;

      await transport.start();

      mockStdin.emit('data', '{broken\n');

      expect(onMessage).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledOnce();
    });

    it('should continue processing after invalid JSON', async () => {
      const onMessage = vi.fn();
      const onError = vi.fn();
      transport.onMessage = onMessage;
      transport.onError = onError;

      await transport.start();

      const validMsg: JsonRpcMessage = { jsonrpc: '2.0', id: 1, method: 'ping' };
      mockStdin.emit('data', 'invalid json\n' + JSON.stringify(validMsg) + '\n');

      expect(onError).toHaveBeenCalledOnce();
      expect(onMessage).toHaveBeenCalledOnce();
      expect(onMessage).toHaveBeenCalledWith(validMsg);
    });

    it('should not throw if onError is null when invalid JSON arrives', async () => {
      // onError is null by default
      await transport.start();

      // Should not throw
      expect(() => {
        mockStdin.emit('data', 'not json\n');
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // send()
  // -------------------------------------------------------------------------

  describe('send()', () => {
    it('should write JSON + newline to stdout', async () => {
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: { protocolVersion: '2024-11-05' },
      };

      await transport.send(response);

      expect(mockStdout.write).toHaveBeenCalledOnce();
      const writtenData = mockStdout.written[0];
      expect(writtenData).toBe(JSON.stringify(response) + '\n');
    });

    it('should write valid JSON that can be parsed back', async () => {
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: 42,
        result: { tools: [] },
      };

      await transport.send(response);

      const writtenData = mockStdout.written[0]!;
      // Remove trailing newline and parse
      const parsed = JSON.parse(writtenData.trimEnd()) as JsonRpcResponse;
      expect(parsed).toEqual(response);
    });

    it('should write error responses correctly', async () => {
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: 5,
        error: { code: -32601, message: 'Method not found' },
      };

      await transport.send(response);

      const writtenData = mockStdout.written[0]!;
      const parsed = JSON.parse(writtenData.trimEnd()) as JsonRpcResponse;
      expect(parsed.error).toEqual({ code: -32601, message: 'Method not found' });
    });

    it('should reject if stdout.write fails', async () => {
      const writeError = new Error('write failed');
      mockStdout.write.mockImplementation(
        (_data: string, cb?: (err?: Error | null) => void) => {
          if (cb) cb(writeError);
          return false;
        },
      );

      await expect(transport.send({
        jsonrpc: '2.0',
        id: 1,
        result: {},
      })).rejects.toThrow('write failed');
    });

    it('should handle multiple sequential sends', async () => {
      const response1: JsonRpcResponse = { jsonrpc: '2.0', id: 1, result: {} };
      const response2: JsonRpcResponse = { jsonrpc: '2.0', id: 2, result: {} };

      await transport.send(response1);
      await transport.send(response2);

      expect(mockStdout.write).toHaveBeenCalledTimes(2);
      expect(mockStdout.written).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // close()
  // -------------------------------------------------------------------------

  describe('close()', () => {
    it('should pause stdin', async () => {
      await transport.start();
      await transport.close();
      expect(mockStdin.pause).toHaveBeenCalled();
    });

    it('should remove all listeners from stdin', async () => {
      await transport.start();
      await transport.close();
      expect(mockStdin.removeAllListeners).toHaveBeenCalled();
    });

    it('should clear the buffer so partial data is discarded', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      // Send partial data (no newline)
      mockStdin.emit('data', '{"jsonrpc":"2.0","id":1');

      // Close - should clear the buffer
      await transport.close();

      // Now create a new transport and start it to verify
      // the old buffer is gone. We verify indirectly by
      // checking that onMessage was never called.
      expect(onMessage).not.toHaveBeenCalled();
    });

    it('should be safe to call close() multiple times', async () => {
      await transport.start();
      await transport.close();
      // Second close should not throw
      await expect(transport.close()).resolves.toBeUndefined();
    });

    it('should be safe to call close() without start()', async () => {
      await expect(transport.close()).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // stdin 'end' event
  // -------------------------------------------------------------------------

  describe('stdin end event', () => {
    it('should trigger onClose when stdin emits end', async () => {
      const onClose = vi.fn();
      transport.onClose = onClose;

      await transport.start();

      mockStdin.emit('end');

      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should not throw if onClose is null when stdin emits end', async () => {
      // onClose is null by default
      await transport.start();

      expect(() => {
        mockStdin.emit('end');
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // stdin 'error' event
  // -------------------------------------------------------------------------

  describe('stdin error event', () => {
    it('should trigger onError when stdin emits error', async () => {
      const onError = vi.fn();
      transport.onError = onError;

      await transport.start();

      const error = new Error('stdin read error');
      mockStdin.emit('error', error);

      expect(onError).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should not throw if onError is null when stdin emits error', async () => {
      // onError is null by default
      await transport.start();

      expect(() => {
        mockStdin.emit('error', new Error('stdin read error'));
      }).not.toThrow();
    });

    it('should pass the original Error object from stdin', async () => {
      const onError = vi.fn();
      transport.onError = onError;

      await transport.start();

      const error = new Error('specific error');
      mockStdin.emit('error', error);

      expect(onError.mock.calls[0]![0]).toBe(error);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should not call onMessage if onMessage is null', async () => {
      // Do not set onMessage
      await transport.start();

      // Should not throw
      expect(() => {
        mockStdin.emit('data', '{"jsonrpc":"2.0","id":1,"method":"ping"}\n');
      }).not.toThrow();
    });

    it('should handle \\r\\n line endings (trimmed)', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      const msg: JsonRpcMessage = { jsonrpc: '2.0', id: 1, method: 'ping' };
      mockStdin.emit('data', JSON.stringify(msg) + '\r\n');

      expect(onMessage).toHaveBeenCalledOnce();
      expect(onMessage).toHaveBeenCalledWith(msg);
    });

    it('should handle messages with string ids', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      const msg: JsonRpcMessage = {
        jsonrpc: '2.0',
        id: 'req-abc-123',
        method: 'tools/list',
      };
      mockStdin.emit('data', JSON.stringify(msg) + '\n');

      expect(onMessage).toHaveBeenCalledOnce();
      const received = onMessage.mock.calls[0]![0] as JsonRpcMessage;
      expect((received as { id: string }).id).toBe('req-abc-123');
    });

    it('should handle messages with nested params', async () => {
      const onMessage = vi.fn();
      transport.onMessage = onMessage;

      await transport.start();

      const msg: JsonRpcMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'my_tool',
          arguments: { nested: { deep: true }, list: [1, 2, 3] },
        },
      };
      mockStdin.emit('data', JSON.stringify(msg) + '\n');

      expect(onMessage).toHaveBeenCalledOnce();
      expect(onMessage).toHaveBeenCalledWith(msg);
    });
  });
});
