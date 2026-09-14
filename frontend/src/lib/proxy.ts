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

  // Defensive Header Filtering (CVE-2025-29927 Mitigation)
  const cleanHeaders = new Headers(request.headers);
  for (const [key] of request.headers.entries()) {
    if (key.toLowerCase().startsWith('x-')) {
      cleanHeaders.delete(key);
    }
  }

  try {
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const backendResponse = await fetch(url.toString(), {
      method: request.method,
      headers: cleanHeaders,
      body: hasBody ? await request.blob() : undefined,
    });

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: backendResponse.headers,
    });
  } catch {
    return NextResponse.json(
      { error: 'Backend service temporarily unavailable' },
      { status: 502 }
    );
  }
}
