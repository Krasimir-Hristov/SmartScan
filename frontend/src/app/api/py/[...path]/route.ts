import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export const maxDuration = 60;

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToBackend(request, `/api/py/${path.join('/')}`);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToBackend(request, `/api/py/${path.join('/')}`);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToBackend(request, `/api/py/${path.join('/')}`);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToBackend(request, `/api/py/${path.join('/')}`);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToBackend(request, `/api/py/${path.join('/')}`);
}

export async function OPTIONS(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToBackend(request, `/api/py/${path.join('/')}`);
}

