import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToBackend(request, `/api/py/${path.join('/')}`);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToBackend(request, `/api/py/${path.join('/')}`);
}

export async function OPTIONS(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToBackend(request, `/api/py/${path.join('/')}`);
}
