import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { api } from '../api';

describe('ApiClient (lib/api.ts)', () => {
  beforeEach(() => {
    api.setToken(null);
    localStorage.clear();
  });

  it('injects Authorization header when token is set', async () => {
    api.setToken('valid-test-token-xyz');

    let receivedAuthHeader: string | null = null;
    server.use(
      http.get('*/api/test-auth-header', ({ request }) => {
        receivedAuthHeader = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      })
    );

    const res = await api.request('/test-auth-header');
    expect(res).toEqual({ ok: true });
    expect(receivedAuthHeader).toBe('Bearer valid-test-token-xyz');
  });

  it('parses FastAPI string error detail properly', async () => {
    server.use(
      http.get('*/api/test-fastapi-error', () => {
        return HttpResponse.json({ detail: 'Lead not found in this territory' }, { status: 404 });
      })
    );

    await expect(api.request('/test-fastapi-error')).rejects.toThrow('Lead not found in this territory');
  });

  it('parses FastAPI array validation error details properly', async () => {
    server.use(
      http.post('*/api/test-fastapi-validation', () => {
        return HttpResponse.json(
          {
            detail: [
              { loc: ['body', 'email'], msg: 'field required' },
              { loc: ['body', 'phone'], msg: 'invalid phone number' },
            ],
          },
          { status: 422 }
        );
      })
    );

    await expect(api.request('/test-fastapi-validation', { method: 'POST' })).rejects.toThrow(
      'field required, invalid phone number'
    );
  });

  it('strips Content-Type header when body is FormData', async () => {
    let receivedContentType: string | null = null;
    server.use(
      http.post('*/api/test-formdata', ({ request }) => {
        receivedContentType = request.headers.get('content-type');
        return HttpResponse.json({ ok: true });
      })
    );

    const formData = new FormData();
    formData.append('file', new Blob(['test-content']), 'test.txt');

    await api.request('/test-formdata', { method: 'POST', body: formData });
    // In browser/node, FormData boundary is automatically generated when Content-Type is not forced to application/json
    expect(receivedContentType).not.toBe('application/json');
  });

  it('does not redirect on 401 for public endpoints', async () => {
    server.use(
      http.post('*/api/auth/login', () => {
        return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
      })
    );

    await expect(api.request('/auth/login', { method: 'POST' })).rejects.toThrow('Invalid credentials');
  });

  it('injects X-CSRF-Token header on mutating requests when CSRF token is available', async () => {
    document.cookie = 'csrf_token=test-csrf-token-12345; path=/';
    let receivedCsrfHeader: string | null = null;
    server.use(
      http.post('*/api/test-csrf-header', ({ request }) => {
        receivedCsrfHeader = request.headers.get('x-csrf-token');
        return HttpResponse.json({ ok: true });
      })
    );

    await api.request('/test-csrf-header', { method: 'POST' });
    expect(receivedCsrfHeader).toBe('test-csrf-token-12345');
  });
});

