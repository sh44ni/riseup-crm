import createClient from 'openapi-fetch';
import type { paths } from './generated/schema';
import { ApiError } from './errors';
import { env } from '../config/env';

export {
  PUBLIC_ENDPOINTS,
  PUBLIC_PAGES,
  isPublicEndpoint,
  isOnPublicPage,
} from './publicRoutes';
import { isPublicEndpoint, isOnPublicPage } from './publicRoutes';

// One-time cleanup of legacy tokens from browser localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('crm_auth_token');
    localStorage.removeItem('crm_user');
  } catch {
    // Ignore environments where localStorage is restricted
  }
}

let csrfToken: string | null = null;
let authToken: string | null = null;
let isRedirecting401 = false;

export function getCsrfToken(): string | null {
  if (csrfToken) return csrfToken;
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    if (match) {
      csrfToken = decodeURIComponent(match[1]);
      return csrfToken;
    }
  }
  return null;
}

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getToken(): string | null {
  return authToken;
}

export function setToken(token: string | null): void {
  authToken = token;
  if (!token) {
    csrfToken = null;
  }
}

export function getAuthHeaders(method: string = 'GET'): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client-Platform': 'crm-web',
  };
  const upperMethod = method.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
    const csrf = getCsrfToken();
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}


function handle401(url: string): void {
  if (isPublicEndpoint(url) || isOnPublicPage()) {
    return;
  }
  setToken(null);
  if (typeof window !== 'undefined' && !isRedirecting401) {
    isRedirecting401 = true;
    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
  }
}

const customFetch: typeof globalThis.fetch = async (input, init = {}) => {
  const timeoutMs = 12000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const signal = init.signal
    ? init.signal
    : controller.signal;

  try {
    const res = await globalThis.fetch(input, {
      ...init,
      credentials: 'include',
      signal,
    });
    clearTimeout(timeoutId);

    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (res.status === 401) {
      handle401(urlStr);
    }

    return res;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
      throw new ApiError({
        status: 408,
        code: 'TIMEOUT',
        message: `Request timed out after ${timeoutMs / 1000}s`,
      });
    }
    throw err;
  }
};

/** Typed openapi-fetch client for compile-time verified requests against OpenAPI schema */
export const openapiClient = createClient<paths>({
  baseUrl: env.VITE_API_BASE_URL === '/api' ? '' : env.VITE_API_BASE_URL,
  fetch: customFetch,
});

openapiClient.use({
  onRequest({ request }) {
    request.headers.set('X-Client-Platform', 'crm-web');
    if (!request.headers.has('Accept')) {
      request.headers.set('Accept', 'application/json');
    }
    const method = request.method.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrf = getCsrfToken();
      if (csrf && !request.headers.has('X-CSRF-Token')) {
        request.headers.set('X-CSRF-Token', csrf);
      }
    }
    if (authToken && !request.headers.has('Authorization')) {
      request.headers.set('Authorization', `Bearer ${authToken}`);
    }
  },
  onResponse({ response }) {
    if (response.status === 401) {
      handle401(response.url);
    }
  },
});

export class ApiHttpClient {
  getToken(): string | null {
    return getToken();
  }

  setToken(token: string | null): void {
    setToken(token);
  }

  getAuthHeaders(method: string = 'GET'): Record<string, string> {
    return getAuthHeaders(method);
  }

  async request<T = unknown>(endpoint: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
    const { timeoutMs = 12000, ...fetchOptions } = options;
    const url = endpoint.startsWith('http')
      ? endpoint
      : endpoint.startsWith('/api')
        ? endpoint
        : `/api${endpoint}`;

    const method = (fetchOptions.method || 'GET').toUpperCase();
    const headers: Record<string, string> = {
      ...getAuthHeaders(method),
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    let body = fetchOptions.body;
    if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
      body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    } else if (body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await globalThis.fetch(url, {
        ...fetchOptions,
        body,
        headers,
        credentials: 'include',
        signal: fetchOptions.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 401) {
        handle401(url);
        throw new ApiError({
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Session expired. Please log in again.',
        });
      }

      let data: unknown = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => '');
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!res.ok) {
        const requestId = res.headers.get('x-request-id') || undefined;
        throw ApiError.fromResponse(res.status, data, requestId);
      }

      return data as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
        throw new ApiError({
          status: 408,
          code: 'TIMEOUT',
          message: `Request timed out after ${timeoutMs / 1000}s`,
        });
      }
      throw err;
    }
  }

  async get<T = unknown>(endpoint: string, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = unknown>(endpoint: string, data?: unknown, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: data as BodyInit });
  }

  async put<T = unknown>(endpoint: string, data?: unknown, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: data as BodyInit });
  }

  async patch<T = unknown>(endpoint: string, data?: unknown, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: data as BodyInit });
  }

  async delete<T = unknown>(endpoint: string, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const httpClient = new ApiHttpClient();
export default openapiClient;
