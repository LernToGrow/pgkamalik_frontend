import { describe, it, expect, vi, beforeEach } from 'vitest';

let capturedRequestHandler;
let capturedResponseSuccess;
let capturedResponseError;
let mockAxiosInstance;

vi.mock('axios', () => {
  const requestUse = vi.fn((fn) => { capturedRequestHandler = fn; });
  const responseUse = vi.fn((ok, err) => {
    capturedResponseSuccess = ok;
    capturedResponseError = err;
  });
  mockAxiosInstance = {
    interceptors: {
      request: { use: requestUse },
      response: { use: responseUse },
    },
  };
  return { default: { create: vi.fn(() => mockAxiosInstance) } };
});

describe('api/axios.js', () => {
  beforeEach(async () => {
    vi.resetModules();
    // Clear captured handlers
    capturedRequestHandler = undefined;
    capturedResponseSuccess = undefined;
    capturedResponseError = undefined;

    localStorage.clear();
    delete window.location;
    window.location = { href: '' };

    await import('../axios.js');
  });

  // ─── Instance creation ───────────────────────────────────────────────────────

  it('creates axios instance with baseURL /api', async () => {
    const axios = await import('axios');
    expect(axios.default.create).toHaveBeenCalledWith({ baseURL: '/api' });
  });

  // ─── Request interceptor ─────────────────────────────────────────────────────

  it('attaches Authorization header when token is in localStorage', () => {
    localStorage.setItem('token', 'my-token');
    const config = { headers: {} };
    const result = capturedRequestHandler(config);
    expect(result.headers.Authorization).toBe('Bearer my-token');
  });

  it('does not attach Authorization header when no token in localStorage', () => {
    const config = { headers: {} };
    const result = capturedRequestHandler(config);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('passes through existing headers unchanged when no token', () => {
    const config = { headers: { 'Content-Type': 'application/json' } };
    const result = capturedRequestHandler(config);
    expect(result.headers['Content-Type']).toBe('application/json');
  });

  // ─── Response interceptor ────────────────────────────────────────────────────

  it('passes successful responses through unchanged', () => {
    const response = { status: 200, data: { ok: true } };
    expect(capturedResponseSuccess(response)).toBe(response);
  });

  it('removes token and redirects to /login on 401 error', async () => {
    localStorage.setItem('token', 'old-token');
    const err = { response: { status: 401 } };

    await expect(capturedResponseError(err)).rejects.toEqual(err);

    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('does NOT redirect on non-401 errors', async () => {
    window.location.href = '';
    const err = { response: { status: 500 } };

    await expect(capturedResponseError(err)).rejects.toEqual(err);

    expect(window.location.href).toBe('');
  });

  it('rejects the promise for all errors', async () => {
    const err = { response: { status: 403 } };
    await expect(capturedResponseError(err)).rejects.toEqual(err);
  });
});
