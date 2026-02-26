import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks for all imports used by serve.ts
// ---------------------------------------------------------------------------

const mockToolRegistry = { register: vi.fn() };
const mockResourceRegistry = { register: vi.fn() };
const mockPromptRegistry = { register: vi.fn() };

const mockConnect = vi.fn();
const mockServer = { connect: mockConnect };

const mockStdioTransport = { type: 'stdio' };
const mockHttpTransport = { type: 'http' };

vi.mock('./registry.js', () => ({
  createToolRegistry: vi.fn(() => mockToolRegistry),
}));

vi.mock('./tools.js', () => ({
  registerServiceTools: vi.fn(),
}));

vi.mock('./resources.js', () => ({
  createResourceRegistry: vi.fn(() => mockResourceRegistry),
  registerCalendarResources: vi.fn(),
  registerDriveResources: vi.fn(),
}));

vi.mock('./prompts.js', () => ({
  createPromptRegistry: vi.fn(() => mockPromptRegistry),
  registerBuiltinPrompts: vi.fn(),
}));

vi.mock('./server.js', () => ({
  createMcpServer: vi.fn(() => mockServer),
}));

vi.mock('./transport/stdio.js', () => ({
  createStdioTransport: vi.fn(() => mockStdioTransport),
}));

vi.mock('./transport/http.js', () => ({
  createHttpTransport: vi.fn(() => mockHttpTransport),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('serve.ts', () => {
  const originalArgv = process.argv;
  const originalExit = process.exit;
  const originalStderrWrite = process.stderr.write;

  let stderrOutput: string;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    stderrOutput = '';
    process.stderr.write = vi.fn((chunk: string | Uint8Array) => {
      stderrOutput += String(chunk);
      return true;
    }) as unknown as typeof process.stderr.write;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    process.stderr.write = originalStderrWrite;
  });

  it('should start in stdio mode by default (no flags)', async () => {
    process.argv = ['node', 'serve.js'];

    await import('./serve.js');

    const { createToolRegistry } = await import('./registry.js');
    const { registerServiceTools } = await import('./tools.js');
    const { createResourceRegistry, registerCalendarResources, registerDriveResources } = await import('./resources.js');
    const { createPromptRegistry, registerBuiltinPrompts } = await import('./prompts.js');
    const { createMcpServer } = await import('./server.js');
    const { createStdioTransport } = await import('./transport/stdio.js');
    const { createHttpTransport } = await import('./transport/http.js');

    // Registries should be created and populated
    expect(createToolRegistry).toHaveBeenCalledOnce();
    expect(registerServiceTools).toHaveBeenCalledWith(mockToolRegistry);
    expect(createResourceRegistry).toHaveBeenCalledOnce();
    expect(registerCalendarResources).toHaveBeenCalledWith(mockResourceRegistry);
    expect(registerDriveResources).toHaveBeenCalledWith(mockResourceRegistry);
    expect(createPromptRegistry).toHaveBeenCalledOnce();
    expect(registerBuiltinPrompts).toHaveBeenCalledWith(mockPromptRegistry);

    // Server should be created with tool registry and options
    expect(createMcpServer).toHaveBeenCalledWith(mockToolRegistry, {
      name: 'openworkspace',
      version: '0.1.0',
      resourceRegistry: mockResourceRegistry,
      promptRegistry: mockPromptRegistry,
    });

    // Stdio transport should be used (not HTTP)
    expect(createStdioTransport).toHaveBeenCalledOnce();
    expect(createHttpTransport).not.toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalledWith(mockStdioTransport);
  });

  it('should start in HTTP mode with --http flag', async () => {
    process.argv = ['node', 'serve.js', '--http'];

    await import('./serve.js');

    const { createStdioTransport } = await import('./transport/stdio.js');
    const { createHttpTransport } = await import('./transport/http.js');

    expect(createHttpTransport).toHaveBeenCalledWith({ port: 3000, host: '127.0.0.1' });
    expect(createStdioTransport).not.toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalledWith(mockHttpTransport);
    expect(stderrOutput).toContain('OpenWorkspace MCP server listening on http://127.0.0.1:3000/mcp');
  });

  it('should use custom port with --http --port N', async () => {
    process.argv = ['node', 'serve.js', '--http', '--port', '8080'];

    await import('./serve.js');

    const { createHttpTransport } = await import('./transport/http.js');

    expect(createHttpTransport).toHaveBeenCalledWith({ port: 8080, host: '127.0.0.1' });
    expect(stderrOutput).toContain('http://127.0.0.1:8080/mcp');
  });

  it('should default port to 3000 when --port is not provided with --http', async () => {
    process.argv = ['node', 'serve.js', '--http'];

    await import('./serve.js');

    const { createHttpTransport } = await import('./transport/http.js');
    expect(createHttpTransport).toHaveBeenCalledWith({ port: 3000, host: '127.0.0.1' });
  });

  it('should exit with error for invalid port (non-numeric)', async () => {
    process.argv = ['node', 'serve.js', '--http', '--port', 'abc'];

    let exitCode: number | undefined;
    process.exit = vi.fn((code?: number) => {
      exitCode = code;
      throw new Error('process.exit called');
    }) as unknown as typeof process.exit;

    await expect(import('./serve.js')).rejects.toThrow('process.exit called');

    expect(exitCode).toBe(1);
    expect(stderrOutput).toContain('Invalid port number: abc');
  });

  it('should exit with error for port out of range (negative)', async () => {
    process.argv = ['node', 'serve.js', '--http', '--port', '-1'];

    let exitCode: number | undefined;
    process.exit = vi.fn((code?: number) => {
      exitCode = code;
      throw new Error('process.exit called');
    }) as unknown as typeof process.exit;

    await expect(import('./serve.js')).rejects.toThrow('process.exit called');

    expect(exitCode).toBe(1);
    expect(stderrOutput).toContain('Invalid port number: -1');
  });

  it('should exit with error for port out of range (> 65535)', async () => {
    process.argv = ['node', 'serve.js', '--http', '--port', '99999'];

    let exitCode: number | undefined;
    process.exit = vi.fn((code?: number) => {
      exitCode = code;
      throw new Error('process.exit called');
    }) as unknown as typeof process.exit;

    await expect(import('./serve.js')).rejects.toThrow('process.exit called');

    expect(exitCode).toBe(1);
    expect(stderrOutput).toContain('Invalid port number: 99999');
  });

  it('should ignore --port without --http (stdio mode)', async () => {
    process.argv = ['node', 'serve.js', '--port', '9999'];

    await import('./serve.js');

    const { createStdioTransport } = await import('./transport/stdio.js');
    const { createHttpTransport } = await import('./transport/http.js');

    // Should use stdio since --http is not present
    expect(createStdioTransport).toHaveBeenCalledOnce();
    expect(createHttpTransport).not.toHaveBeenCalled();
  });
});
