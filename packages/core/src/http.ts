/**
 * Native fetch-based HTTP client with interceptors.
 * Zero-dependency implementation.
 */

import type { Result } from './result.js';
import { ok, err } from './result.js';
import { NetworkError, RateLimitError } from './errors.js';

/**
 * HTTP request configuration.
 */
export type HttpRequestConfig = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: string | Uint8Array | Record<string, unknown>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
};

/**
 * HTTP response wrapper.
 */
export type HttpResponse<T = unknown> = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
};

/**
 * Request interceptor function.
 */
export type RequestInterceptor = (
  url: string,
  config: HttpRequestConfig
) => { url: string; config: HttpRequestConfig } | Promise<{ url: string; config: HttpRequestConfig }>;

/**
 * Response interceptor function.
 */
export type ResponseInterceptor<T = unknown> = (
  response: HttpResponse<T>
) => HttpResponse<T> | Promise<HttpResponse<T>>;

/**
 * Error interceptor function.
 */
export type ErrorInterceptor = (error: Error) => Error | Promise<Error>;

/**
 * HTTP client configuration.
 */
export type HttpClientOptions = {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
};

/**
 * HTTP client with interceptor support.
 */
export type HttpClient = {
  request<T>(url: string, config?: HttpRequestConfig): Promise<Result<HttpResponse<T>, NetworkError>>;
  get<T>(url: string, config?: Omit<HttpRequestConfig, 'method'>): Promise<Result<HttpResponse<T>, NetworkError>>;
  post<T>(url: string, config?: Omit<HttpRequestConfig, 'method'>): Promise<Result<HttpResponse<T>, NetworkError>>;
  put<T>(url: string, config?: Omit<HttpRequestConfig, 'method'>): Promise<Result<HttpResponse<T>, NetworkError>>;
  patch<T>(url: string, config?: Omit<HttpRequestConfig, 'method'>): Promise<Result<HttpResponse<T>, NetworkError>>;
  delete<T>(url: string, config?: Omit<HttpRequestConfig, 'method'>): Promise<Result<HttpResponse<T>, NetworkError>>;
  interceptors: {
    request: RequestInterceptor[];
    response: ResponseInterceptor[];
    error: ErrorInterceptor[];
  };
};

/**
 * Default timeout in milliseconds.
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Maximum allowed timeout in milliseconds (5 minutes).
 */
const MAX_TIMEOUT = 5 * 60 * 1000;

/**
 * Default retry count.
 */
const DEFAULT_RETRIES = 3;

/**
 * Default retry delay in milliseconds.
 */
const DEFAULT_RETRY_DELAY = 1000;

/**
 * Parses response data based on content type.
 */
async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  // For empty responses, return null
  const contentLength = response.headers.get('content-length');
  if (contentLength === '0' || response.status === 204) {
    return null;
  }

  return response.text();
}

/**
 * Creates an HTTP client with interceptor support.
 * @example
 * const client = createHttpClient({ baseUrl: 'https://api.example.com' });
 * const result = await client.get('/users');
 * if (result.ok) console.log(result.value.data);
 */
export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  const {
    baseUrl = '',
    defaultHeaders = {},
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
  } = options;

  const interceptors = {
    request: [] as RequestInterceptor[],
    response: [] as ResponseInterceptor[],
    error: [] as ErrorInterceptor[],
  };

  async function executeRequest<T>(
    url: string,
    config: HttpRequestConfig,
    attempt: number
  ): Promise<Result<HttpResponse<T>, NetworkError>> {
    let finalUrl = baseUrl + url;
    let finalConfig = { ...config };

    // Apply request interceptors
    for (const interceptor of interceptors.request) {
      const result = await interceptor(finalUrl, finalConfig);
      finalUrl = result.url;
      finalConfig = result.config;
    }

    const controller = new AbortController();
    const effectiveTimeout = Math.min(finalConfig.timeout ?? timeout, MAX_TIMEOUT);
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const autoSerialized =
        !!finalConfig.body && typeof finalConfig.body === 'object' && !(finalConfig.body instanceof Uint8Array);
      const body =
        finalConfig.body && typeof finalConfig.body === 'object' && !(finalConfig.body instanceof Uint8Array)
          ? JSON.stringify(finalConfig.body)
          : finalConfig.body;

      const response = await fetch(finalUrl, {
        method: finalConfig.method ?? 'GET',
        headers: {
          ...defaultHeaders,
          ...(autoSerialized ? { 'Content-Type': 'application/json' } : {}),
          ...finalConfig.headers,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if the request was aborted during fetch
      if (controller.signal.aborted) {
        return err(
          new NetworkError('Request was aborted', {
            url: finalUrl,
            aborted: true,
          })
        );
      }

      // Handle rate limiting
      if (response.status === 429) {
        const resetHeader = response.headers.get('X-RateLimit-Reset');
        const resetAt = resetHeader ? new Date(parseInt(resetHeader) * 1000) : undefined;

        if (attempt < (finalConfig.retries ?? retries)) {
          const delay = finalConfig.retryDelay ?? retryDelay;
          await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
          return executeRequest(url, config, attempt + 1);
        }

        return err(
          new RateLimitError('Rate limit exceeded', resetAt, {
            url: finalUrl,
            status: response.status,
          })
        );
      }

      const data = await parseResponse(response);

      let httpResponse: HttpResponse<T> = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: data as T,
      };

      // Apply response interceptors
      for (const interceptor of interceptors.response) {
        httpResponse = (await interceptor(httpResponse)) as HttpResponse<T>;
      }

      if (!response.ok) {
        return err(
          new NetworkError(`HTTP ${response.status}: ${response.statusText}`, {
            url: finalUrl,
            status: response.status,
            data,
          }, response.status)
        );
      }

      return ok(httpResponse);
    } catch (error) {
      clearTimeout(timeoutId);

      let finalError = error instanceof Error ? error : new Error(String(error));

      // Apply error interceptors
      for (const interceptor of interceptors.error) {
        finalError = await interceptor(finalError);
      }

      if (finalError.name === 'AbortError') {
        return err(
          new NetworkError('Request timeout', {
            url: finalUrl,
            timeout: effectiveTimeout,
          })
        );
      }

      const idempotent = ['GET','HEAD','OPTIONS','PUT','DELETE'].includes((finalConfig.method ?? 'GET').toUpperCase());
      if (idempotent && attempt < (finalConfig.retries ?? retries)) {
        const delay = finalConfig.retryDelay ?? retryDelay;
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
        return executeRequest(url, config, attempt + 1);
      }

      return err(
        new NetworkError(finalError.message, {
          url: finalUrl,
          originalError: finalError,
        })
      );
    }
  }

  return {
    request<T>(url: string, config: HttpRequestConfig = {}): Promise<Result<HttpResponse<T>, NetworkError>> {
      return executeRequest<T>(url, config, 0);
    },

    get<T>(url: string, config: Omit<HttpRequestConfig, 'method'> = {}): Promise<Result<HttpResponse<T>, NetworkError>> {
      return executeRequest<T>(url, { ...config, method: 'GET' }, 0);
    },

    post<T>(url: string, config: Omit<HttpRequestConfig, 'method'> = {}): Promise<Result<HttpResponse<T>, NetworkError>> {
      return executeRequest<T>(url, { ...config, method: 'POST' }, 0);
    },

    put<T>(url: string, config: Omit<HttpRequestConfig, 'method'> = {}): Promise<Result<HttpResponse<T>, NetworkError>> {
      return executeRequest<T>(url, { ...config, method: 'PUT' }, 0);
    },

    patch<T>(url: string, config: Omit<HttpRequestConfig, 'method'> = {}): Promise<Result<HttpResponse<T>, NetworkError>> {
      return executeRequest<T>(url, { ...config, method: 'PATCH' }, 0);
    },

    delete<T>(url: string, config: Omit<HttpRequestConfig, 'method'> = {}): Promise<Result<HttpResponse<T>, NetworkError>> {
      return executeRequest<T>(url, { ...config, method: 'DELETE' }, 0);
    },

    interceptors,
  };
}
