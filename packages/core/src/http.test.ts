import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHttpClient } from './http.js';
import { NetworkError, RateLimitError } from './errors.js';

describe('http', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createHttpClient', () => {
    it('should create an HTTP client', () => {
      const client = createHttpClient();
      expect(client).toBeDefined();
      expect(client.request).toBeDefined();
      expect(client.get).toBeDefined();
      expect(client.post).toBeDefined();
      expect(client.put).toBeDefined();
      expect(client.patch).toBeDefined();
      expect(client.delete).toBeDefined();
      expect(client.interceptors).toBeDefined();
    });

    describe('get', () => {
      it('should make GET request', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: vi.fn().mockResolvedValueOnce({ data: 'test' }),
          text: vi.fn().mockResolvedValueOnce('{"data":"test"}'),
        });

        const client = createHttpClient();
        const result = await client.get('/test');

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.status).toBe(200);
          expect(result.value.data).toEqual({ data: 'test' });
        }
      });

      it('should prepend baseUrl', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: vi.fn().mockResolvedValueOnce({}),
          text: vi.fn().mockResolvedValueOnce('{}'),
        });

        const client = createHttpClient({ baseUrl: 'https://api.example.com' });
        await client.get('/test');

        expect(fetchMock).toHaveBeenCalledWith(
          'https://api.example.com/test',
          expect.any(Object)
        );
      });

      it('should return NetworkError for failed request', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers(),
          json: vi.fn().mockResolvedValueOnce({ error: 'server error' }),
          text: vi.fn().mockResolvedValueOnce('{"error":"server error"}'),
        });

        const client = createHttpClient();
        const result = await client.get('/test');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(NetworkError);
          expect(result.error.statusCode).toBe(500);
        }
      });

      it('should handle network errors', async () => {
        fetchMock.mockRejectedValueOnce(new Error('Network failure'));

        const client = createHttpClient({ retries: 0 });
        const result = await client.get('/test');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(NetworkError);
          expect(result.error.message).toContain('Network failure');
        }
      });

      it('should handle timeout', async () => {
        fetchMock.mockImplementationOnce(() =>
          new Promise((_, reject) => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          })
        );

        const client = createHttpClient({ timeout: 1, retries: 0 });
        const result = await client.get('/test');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain('timeout');
        }
      });
    });

    describe('post', () => {
      it('should make POST request with body', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 201,
          statusText: 'Created',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: vi.fn().mockResolvedValueOnce({ id: 1 }),
          text: vi.fn().mockResolvedValueOnce('{"id":1}'),
        });

        const client = createHttpClient();
        const result = await client.post('/test', { body: { name: 'test' } });

        expect(fetchMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ name: 'test' }),
          })
        );
        expect(result.ok).toBe(true);
      });
    });

    describe('put', () => {
      it('should make PUT request', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: vi.fn().mockResolvedValueOnce({}),
          text: vi.fn().mockResolvedValueOnce('{}'),
        });

        const client = createHttpClient();
        await client.put('/test');

        expect(fetchMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    describe('patch', () => {
      it('should make PATCH request', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: vi.fn().mockResolvedValueOnce({}),
          text: vi.fn().mockResolvedValueOnce('{}'),
        });

        const client = createHttpClient();
        await client.patch('/test');

        expect(fetchMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ method: 'PATCH' })
        );
      });
    });

    describe('delete', () => {
      it('should make DELETE request', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 204,
          statusText: 'No Content',
          headers: new Headers(),
          json: vi.fn().mockResolvedValueOnce({}),
          text: vi.fn().mockResolvedValueOnce(''),
        });

        const client = createHttpClient();
        await client.delete('/test');

        expect(fetchMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    describe('rate limiting', () => {
      it('should return RateLimitError on 429', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({ 'X-RateLimit-Reset': '1234567890' }),
          json: vi.fn().mockResolvedValueOnce({}),
          text: vi.fn().mockResolvedValueOnce('{}'),
        });

        const client = createHttpClient({ retries: 0 });
        const result = await client.get('/test');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(RateLimitError);
          expect(result.error.statusCode).toBe(429);
        }
      });

      it('should retry on rate limit', async () => {
        fetchMock
          .mockResolvedValueOnce({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            headers: new Headers(),
            json: vi.fn().mockResolvedValueOnce({}),
            text: vi.fn().mockResolvedValueOnce('{}'),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers(),
            json: vi.fn().mockResolvedValueOnce({ success: true }),
            text: vi.fn().mockResolvedValueOnce('{"success":true}'),
          });

        const client = createHttpClient({ retries: 1, retryDelay: 1 });
        const result = await client.get('/test');

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(result.ok).toBe(true);
      });
    });

    describe('retries', () => {
      it('should retry on failure', async () => {
        fetchMock
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers(),
            json: vi.fn().mockResolvedValueOnce({ success: true }),
            text: vi.fn().mockResolvedValueOnce('{"success":true}'),
          });

        const client = createHttpClient({ retries: 1, retryDelay: 1 });
        const result = await client.get('/test');

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(result.ok).toBe(true);
      });

      it('should fail after max retries', async () => {
        fetchMock.mockRejectedValue(new Error('Network error'));

        const client = createHttpClient({ retries: 2, retryDelay: 1 });
        const result = await client.get('/test');

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(result.ok).toBe(false);
      });
    });

    describe('interceptors', () => {
      it('should apply request interceptors', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: vi.fn().mockResolvedValueOnce({}),
          text: vi.fn().mockResolvedValueOnce('{}'),
        });

        const client = createHttpClient();
        client.interceptors.request.push(async (url, config) => ({
          url: url + '?modified=true',
          config: { ...config, headers: { ...config.headers, 'X-Custom': 'value' } },
        }));

        await client.get('/test');

        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('?modified=true'),
          expect.objectContaining({
            headers: expect.objectContaining({ 'X-Custom': 'value' }),
          })
        );
      });

      it('should apply response interceptors', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: vi.fn().mockResolvedValueOnce({ data: 'original' }),
          text: vi.fn().mockResolvedValueOnce('{"data":"original"}'),
        });

        const client = createHttpClient();
        client.interceptors.response.push(async (response) => ({
          ...response,
          data: { modified: true },
        }));

        const result = await client.get('/test');

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.data).toEqual({ modified: true });
        }
      });

      it('should apply error interceptors', async () => {
        fetchMock.mockRejectedValueOnce(new Error('Original error'));

        const client = createHttpClient({ retries: 0 });
        client.interceptors.error.push(async (error) => {
          return new Error('Modified error');
        });

        const result = await client.get('/test');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe('Modified error');
        }
      });
    });

    describe('request method', () => {
      it('should make a request via the generic request method', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: vi.fn().mockResolvedValueOnce({ generic: true }),
          text: vi.fn().mockResolvedValueOnce('{"generic":true}'),
        });

        const client = createHttpClient();
        const result = await client.request('/test', { method: 'GET' });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.status).toBe(200);
          expect(result.value.data).toEqual({ generic: true });
        }
      });
    });

    describe('default headers', () => {
      it('should include default headers', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: vi.fn().mockResolvedValueOnce({}),
          text: vi.fn().mockResolvedValueOnce('{}'),
        });

        const client = createHttpClient({
          defaultHeaders: { 'X-API-Key': 'secret' },
        });
        await client.get('/test');

        expect(fetchMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({ 'X-API-Key': 'secret' }),
          })
        );
      });
    });

    describe('text response', () => {
      it('should handle non-JSON responses', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'text/plain' }),
          json: vi.fn(),
          text: vi.fn().mockResolvedValueOnce('Plain text response'),
        });

        const client = createHttpClient();
        const result = await client.get('/test');

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.data).toBe('Plain text response');
        }
      });
    });
  });
});
