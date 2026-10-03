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
    throw new Error(await readBackendError(response));
  }

  const data: unknown = await response.json();
  return data as T;
}

/**
 * Extracts a human-readable message from a failed backend response.
 *
 * FastAPI returns validation failures as a 422 whose `detail` is an ARRAY of
 * error objects (`{loc, msg, type}`) instead of a plain string. Rendering only
 * the string case is what surfaced the opaque "Error connecting to backend
 * service." message for what was really a `space_id: Field required` payload
 * mismatch, so both shapes are handled here.
 */
async function readBackendError(response: Response): Promise<string> {
  const fallback = 'Error connecting to backend service.';
  try {
    const errData: unknown = await response.json();
    if (!errData || typeof errData !== 'object' || !('detail' in errData)) {
      return fallback;
    }

    const detail = (errData as { detail: unknown }).detail;
    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) =>
          item && typeof item === 'object' && 'msg' in item
            ? String((item as { msg: unknown }).msg)
            : null
        )
        .filter((msg): msg is string => Boolean(msg));
      if (messages.length > 0) {
        return messages.join('; ');
      }
    }

    return fallback;
  } catch {
    return fallback;
  }
}

