import { createClient } from '@/lib/supabase/server';

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000';
const BACKEND_PROXY_SECRET = process.env.BACKEND_PROXY_SECRET || '';

export async function fetchBackend<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': user.id,
    'x-user-email': user.email || '',
    'x-internal-auth': BACKEND_PROXY_SECRET,
  };

  const response = await fetch(`${BACKEND_INTERNAL_URL}/api/py/${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errData: unknown = await response.json().catch(() => ({}));
    let detail = 'Error connecting to backend service.';
    if (errData && typeof errData === 'object' && 'detail' in errData && typeof errData.detail === 'string') {
      detail = errData.detail;
    }
    throw new Error(detail);
  }

  const data: unknown = await response.json();
  return data as T;
}
