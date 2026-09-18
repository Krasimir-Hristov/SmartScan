import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxies incoming client requests to the internal FastAPI backend service.
 * Enforces strict "Defensive Header Filtering" to mitigate CVE-2025-29927
 * by scrubbing all incoming headers starting with 'x-' (specifically x-middleware-subrequest).
 *
 * Rate-limit trust chain:
 * - The client IP is taken from the RIGHT-MOST x-forwarded-for entry — the one
 *   appended by the nearest trusted edge proxy. Left entries can be freely
 *   spoofed by clients to rotate rate-limit identities.
 * - BACKEND_PROXY_SECRET marks this proxy to the FastAPI backend, which only
 *   trusts forwarded IPs when the secret matches (constant-time compared there).
 *   The secret is server-only (no NEXT_PUBLIC_ prefix) and the scrubbing below
 *   guarantees it can never be injected by an external client.
 */
export async function proxyToBackend(
  request: NextRequest,
  targetPath: string
): Promise<NextResponse> {
  const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000';
  const proxySecret = process.env.BACKEND_PROXY_SECRET;
  const url = new URL(targetPath, backendUrl);
  url.search = request.nextUrl.search;

  // Extract real client IP before scrubbing external x-* headers.
  // Priority:
  // 1. Platform-set headers (e.g. x-vercel-forwarded-for) are assigned by the
  //    hosting edge itself and cannot be spoofed by clients.
  // 2. The RIGHT-MOST x-forwarded-for entry — the one appended by the nearest
  //    trusted edge proxy. Left entries can be freely spoofed by clients to
  //    rotate rate-limit identities.
  const platformForwarded = request.headers.get('x-vercel-forwarded-for');
  const platformIp = platformForwarded
    ? platformForwarded.split(',')[0].trim()
    : '';

  const rawForwarded = request.headers.get('x-forwarded-for');
  const forwardedChain = rawForwarded
    ? rawForwarded
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean)
    : [];
  const clientIp =
    platformIp ||
    (forwardedChain.length > 0
      ? forwardedChain[forwardedChain.length - 1]
      : '') ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  // Defensive Header Filtering (CVE-2025-29927 Mitigation)
  const cleanHeaders = new Headers(request.headers);
  for (const [key] of request.headers.entries()) {
    if (key.toLowerCase().startsWith('x-')) {
      cleanHeaders.delete(key);
    }
  }

  // Inject verified proxy client IP + shared secret for trusted internal rate limiting.
  cleanHeaders.set('x-forwarded-for', clientIp);
  if (proxySecret) {
    cleanHeaders.set('x-internal-auth', proxySecret);
  }

  // Reject incoming payloads exceeding 25 MiB at public ingress layer before forwarding
  const contentLength = Number(request.headers.get('content-length') || '0');
  const MAX_PROXY_BODY_SIZE = 25 * 1024 * 1024; // 25 MiB
  if (contentLength > MAX_PROXY_BODY_SIZE) {
    return NextResponse.json(
      { error: 'Payload exceeds maximum limit of 25MB' },
      { status: 413, statusText: 'Payload Too Large' }
    );
  }

  try {
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    let body: Blob | undefined;
    if (hasBody) {
      const blob = await request.blob();
      if (blob.size > MAX_PROXY_BODY_SIZE) {
        return NextResponse.json(
          { error: 'Payload exceeds maximum limit of 25MB' },
          { status: 413, statusText: 'Payload Too Large' }
        );
      }
      body = blob;
    }

    const backendResponse = await fetch(url.toString(), {
      method: request.method,
      headers: cleanHeaders,
      body,
      signal: request.signal,
    });

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: backendResponse.headers,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return new NextResponse(null, { status: 499, statusText: 'Client Closed Request' });
    }
    return NextResponse.json(
      { error: 'Backend service temporarily unavailable' },
      { status: 502 }
    );
  }
}
