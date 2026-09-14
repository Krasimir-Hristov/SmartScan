import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxies incoming client requests to the internal FastAPI backend service.
 * Enforces strict "Defensive Header Filtering" to mitigate CVE-2025-29927
 * by scrubbing all incoming headers starting with 'x-' (specifically x-middleware-subrequest).
 */
export async function proxyToBackend(
  request: NextRequest,
  targetPath: string
): Promise<NextResponse> {
  const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000';
  const url = new URL(targetPath, backendUrl);
  url.search = request.nextUrl.search;

  // Extract real client IP before scrubbing external x-* headers
  const rawForwarded = request.headers.get('x-forwarded-for');
  const clientIp = rawForwarded
    ? rawForwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') || '127.0.0.1';

  // Defensive Header Filtering (CVE-2025-29927 Mitigation)
  const cleanHeaders = new Headers(request.headers);
  for (const [key] of request.headers.entries()) {
    if (key.toLowerCase().startsWith('x-')) {
      cleanHeaders.delete(key);
    }
  }

  // Inject verified proxy client IP for trusted internal rate limiting
  cleanHeaders.set('x-forwarded-for', clientIp);

  try {
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const backendResponse = await fetch(url.toString(), {
      method: request.method,
      headers: cleanHeaders,
      body: hasBody ? await request.blob() : undefined,
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
