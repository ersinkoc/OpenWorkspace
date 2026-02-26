import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'node:path';

// These tests cover getDefaultConfigDir() for non-win32 platforms.
// Since os.platform() returns the current platform in ESM and can't be spied on directly,
// we mock the 'node:os' module.

describe('getDefaultConfigDir – darwin platform', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return macOS path when platform is darwin', async () => {
    vi.doMock('node:os', () => ({
      platform: () => 'darwin',
      homedir: () => '/Users/testuser',
    }));

    const { getDefaultConfigDir } = await import('./token-store.js');
    const dir = getDefaultConfigDir();
    // path.join on Windows uses backslashes, but the important thing is
    // the path segments are correct
    expect(dir).toContain('Library');
    expect(dir).toContain('Application Support');
    expect(dir).toContain('openworkspace');
  });
});

describe('getDefaultConfigDir – linux platform', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return XDG path when platform is linux', async () => {
    const originalXdg = process.env['XDG_CONFIG_HOME'];
    delete process.env['XDG_CONFIG_HOME'];

    vi.doMock('node:os', () => ({
      platform: () => 'linux',
      homedir: () => '/home/testuser',
    }));

    const { getDefaultConfigDir } = await import('./token-store.js');
    const dir = getDefaultConfigDir();
    expect(dir).toContain('.config');
    expect(dir).toContain('openworkspace');

    if (originalXdg !== undefined) {
      process.env['XDG_CONFIG_HOME'] = originalXdg;
    }
  });

  it('should respect XDG_CONFIG_HOME when set on linux', async () => {
    const originalXdg = process.env['XDG_CONFIG_HOME'];
    process.env['XDG_CONFIG_HOME'] = '/custom/config';

    vi.doMock('node:os', () => ({
      platform: () => 'linux',
      homedir: () => '/home/testuser',
    }));

    const { getDefaultConfigDir } = await import('./token-store.js');
    const dir = getDefaultConfigDir();
    // On Windows, path.join converts forward slashes to backslashes
    // so check for the components individually
    expect(dir).toContain('custom');
    expect(dir).toContain('config');
    expect(dir).toContain('openworkspace');

    if (originalXdg !== undefined) {
      process.env['XDG_CONFIG_HOME'] = originalXdg;
    } else {
      delete process.env['XDG_CONFIG_HOME'];
    }
  });
});
