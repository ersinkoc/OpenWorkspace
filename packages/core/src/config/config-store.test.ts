import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { createConfigStore } from './config-store.js';

describe('config-store', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `ows-config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should create a config store with defaults', async () => {
    const config = await createConfigStore(tempDir);
    expect(config).toBeDefined();
    expect(config.get('default_timezone')).toBe('UTC');
    expect(config.get('token_backend')).toBe('file');
  });

  it('should get nested values', async () => {
    const config = await createConfigStore(tempDir);
    expect(config.get('cache.backend')).toBe('memory');
    expect(config.get('cache.ttl')).toBe('5m');
    expect(config.get('cache.max_entries')).toBe(1000);
  });

  it('should set top-level values', async () => {
    const config = await createConfigStore(tempDir);
    config.set('default_timezone', 'America/New_York');
    expect(config.get('default_timezone')).toBe('America/New_York');
  });

  it('should set nested values', async () => {
    const config = await createConfigStore(tempDir);
    config.set('cache.ttl', '10m');
    expect(config.get('cache.ttl')).toBe('10m');
  });

  it('should create intermediate objects when setting deep path', async () => {
    const config = await createConfigStore(tempDir);
    config.set('new.deeply.nested.value', 42);
    expect(config.get('new.deeply.nested.value')).toBe(42);
  });

  it('should delete values', async () => {
    const config = await createConfigStore(tempDir);
    config.set('test_key', 'test_value');
    expect(config.delete('test_key')).toBe(true);
    expect(config.get('test_key')).toBeUndefined();
  });

  it('should return false for deleting non-existent keys', async () => {
    const config = await createConfigStore(tempDir);
    expect(config.delete('nonexistent')).toBe(false);
  });

  it('should list all keys', async () => {
    const config = await createConfigStore(tempDir);
    const keys = config.list();
    expect(keys).toContain('default_timezone');
    expect(keys).toContain('token_backend');
    expect(keys).toContain('cache.backend');
    expect(keys).toContain('cache.ttl');
    expect(keys).toContain('cache.max_entries');
    expect(keys).toContain('rate_limit.strategy');
    expect(keys).toContain('rate_limit.max_rps');
  });

  it('should get all config as object', async () => {
    const config = await createConfigStore(tempDir);
    const all = config.getAll();
    expect(all['default_timezone']).toBe('UTC');
    expect(all['cache']).toBeDefined();
  });

  it('should save and reload config', async () => {
    const config = await createConfigStore(tempDir);
    config.set('custom_key', 'custom_value');
    config.set('cache.ttl', '30m');

    const saveResult = await config.save();
    expect(saveResult.ok).toBe(true);

    // Create new store from same dir
    const config2 = await createConfigStore(tempDir);
    expect(config2.get('custom_key')).toBe('custom_value');
    expect(config2.get('cache.ttl')).toBe('30m');
  });

  it('should return config file path', async () => {
    const config = await createConfigStore(tempDir);
    const configPath = config.getPath();
    expect(configPath).toContain('config.json');
    expect(configPath).toContain(tempDir);
  });

  it('should reload config from disk', async () => {
    const config = await createConfigStore(tempDir);
    config.set('value', 'original');
    await config.save();

    // Modify value in memory
    config.set('value', 'modified');
    expect(config.get('value')).toBe('modified');

    // Reload from disk
    const reloadResult = await config.reload();
    expect(reloadResult.ok).toBe(true);
    expect(config.get('value')).toBe('original');
  });

  it('should handle JSON5 config file with comments', async () => {
    const configContent = `{
      // Custom config
      "default_timezone": "Europe/Istanbul",
      "custom_setting": true,
    }`;
    await fs.writeFile(path.join(tempDir, 'config.json'), configContent, 'utf8');

    const config = await createConfigStore(tempDir);
    expect(config.get('default_timezone')).toBe('Europe/Istanbul');
    expect(config.get('custom_setting')).toBe(true);
    // Defaults should still be merged
    expect(config.get('cache.backend')).toBe('memory');
  });

  it('should return undefined for non-existent keys', async () => {
    const config = await createConfigStore(tempDir);
    expect(config.get('nonexistent')).toBeUndefined();
    expect(config.get('deeply.nested.nonexistent')).toBeUndefined();
  });

  it('should handle empty config file', async () => {
    await fs.writeFile(path.join(tempDir, 'config.json'), '{}', 'utf8');
    const config = await createConfigStore(tempDir);
    // Should still have defaults
    expect(config.get('default_timezone')).toBe('UTC');
  });
});
