import { describe, it, expect, vi } from 'vitest';

vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
  return {
    ...actual,
    createCipheriv: () => {
      throw new Error('mock cipher error');
    },
  };
});

describe('crypto – encrypt error path', () => {
  it('should return error when createCipheriv throws', async () => {
    const { encrypt } = await import('./crypto.js');

    const result = encrypt('test', 'password');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Encryption failed');
      expect(result.error.message).toContain('mock cipher error');
    }
  });
});
