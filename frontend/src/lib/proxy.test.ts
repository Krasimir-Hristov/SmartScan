import { NextRequest } from 'next/server';
import { proxyToBackend } from './proxy';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('proxyToBackend', () => {
  beforeEach(() => {
    vi.stubEnv('BACKEND_INTERNAL_URL', 'http://127.0.0.1:8000');
    vi.stubEnv('BACKEND_PROXY_SECRET', 'test-secret');
    
    global.fetch = vi.fn().mockResolvedValue(new Response('backend data', {
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' })
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const createRequest = (url: string, init?: unknown) => {
    // @ts-expect-error Type mismatch with NextRequest RequestInit
    return new NextRequest(new URL(url, 'http://localhost:3000'), init);
  };

  it('scrubs external x-* headers (CVE-2025-29927 mitigation)', async () => {
    const req = createRequest('/api/test', {
      headers: {
        'x-middleware-subrequest': '1',
        'x-malicious-header': 'attack',
        'authorization': 'Bearer token',
        'content-type': 'application/json'
      }
    });

    await proxyToBackend(req, '/api/test');
    
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCallArgs = vi.mocked(global.fetch).mock.calls[0];
    const fetchHeaders = fetchCallArgs[1]?.headers as Headers;
    
    expect(fetchHeaders.get('x-middleware-subrequest')).toBeNull();
    expect(fetchHeaders.get('x-malicious-header')).toBeNull();
    expect(fetchHeaders.get('authorization')).toBe('Bearer token');
    expect(fetchHeaders.get('content-type')).toBe('application/json');
  });

  it('sets correct x-forwarded-for and internal auth headers', async () => {
    const req = createRequest('/api/test', {
      headers: {
        'x-vercel-forwarded-for': '203.0.113.195', // Platform injected
        'x-forwarded-for': '1.1.1.1, 8.8.8.8' // Spoofed chain
      }
    });

    await proxyToBackend(req, '/api/test');
    
    const fetchCallArgs = vi.mocked(global.fetch).mock.calls[0];
    const fetchHeaders = fetchCallArgs[1]?.headers as Headers;
    
    expect(fetchHeaders.get('x-forwarded-for')).toBe('203.0.113.195');
    expect(fetchHeaders.get('x-internal-auth')).toBe('test-secret');
  });

  it('rejects payload exceeding 25MB from content-length', async () => {
    const req = createRequest('/api/test', {
      method: 'POST',
      headers: {
        'content-length': (30 * 1024 * 1024).toString()
      }
    });

    const res = await proxyToBackend(req, '/api/test');
    
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toContain('Payload exceeds maximum limit');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('uses rightmost x-forwarded-for when x-vercel-forwarded-for is absent', async () => {
    const req = createRequest('/api/test', {
      headers: {
        'x-forwarded-for': '1.1.1.1, 8.8.8.8, 203.0.113.50'
      }
    });

    await proxyToBackend(req, '/api/test');

    const fetchHeaders = vi.mocked(global.fetch).mock.calls[0][1]?.headers as Headers;
    expect(fetchHeaders.get('x-forwarded-for')).toBe('203.0.113.50');
    expect(fetchHeaders.get('x-internal-auth')).toBe('test-secret');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
    const req = createRequest('/api/test', {
      headers: {
        'x-real-ip': '10.0.0.5'
      }
    });

    await proxyToBackend(req, '/api/test');

    const fetchHeaders = vi.mocked(global.fetch).mock.calls[0][1]?.headers as Headers;
    expect(fetchHeaders.get('x-forwarded-for')).toBe('10.0.0.5');
  });

  it('falls back to 127.0.0.1 when all identity headers are absent', async () => {
    const req = createRequest('/api/test', {
      headers: {
        'content-type': 'application/json'
      }
    });

    await proxyToBackend(req, '/api/test');

    const fetchHeaders = vi.mocked(global.fetch).mock.calls[0][1]?.headers as Headers;
    expect(fetchHeaders.get('x-forwarded-for')).toBe('127.0.0.1');
  });

  it('forwards query parameters correctly', async () => {
    const req = createRequest('/api/test?space_id=123&sort=desc');
    await proxyToBackend(req, '/api/test');
    
    const fetchUrl = vi.mocked(global.fetch).mock.calls[0][0];
    expect(fetchUrl).toContain('space_id=123');
    expect(fetchUrl).toContain('sort=desc');
  });

  it('handles backend network failures gracefully', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('ECONNREFUSED'));
    const req = createRequest('/api/test');
    
    const res = await proxyToBackend(req, '/api/test');
    
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBeDefined(); // Backend unavailable
  });

  it('allows request with missing content-length header', async () => {
    const req = createRequest('/api/test', {
      method: 'POST',
      headers: {} // No content-length
    });
    
    await proxyToBackend(req, '/api/test');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
