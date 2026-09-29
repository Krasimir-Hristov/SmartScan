import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  const isLocalEnv = process.env.NODE_ENV === 'development';
  let redirectOrigin = requestOrigin;

  if (!isLocalEnv) {
    const fallbackVercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || fallbackVercelUrl || requestOrigin).trim();
    try {
      const parsed = new URL(siteUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        redirectOrigin = parsed.origin;
      }
    } catch {
      redirectOrigin = requestOrigin;
    }
  }

  let safeNext = '/dashboard';
  try {
    const parsedNext = new URL(next, redirectOrigin);
    if (parsedNext.origin === redirectOrigin && parsedNext.pathname.startsWith('/')) {
      safeNext = parsedNext.pathname + parsedNext.search + parsedNext.hash;
    }
  } catch {
    safeNext = '/dashboard';
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(`${redirectOrigin}${safeNext}`);
      }
    } catch {
      return NextResponse.redirect(`${redirectOrigin}/?error=auth-failed`);
    }
  }

  return NextResponse.redirect(`${redirectOrigin}/?error=auth-failed`);
}
