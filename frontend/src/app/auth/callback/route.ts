import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  const isLocalEnv = process.env.NODE_ENV === 'development';
  let redirectOrigin = requestOrigin;

  if (!isLocalEnv) {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    if (!siteUrl) {
      return new NextResponse('Configuration Error: Missing NEXT_PUBLIC_SITE_URL', {
        status: 500,
      });
    }
    try {
      const parsed = new URL(siteUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
      redirectOrigin = parsed.origin;
    } catch {
      return new NextResponse('Configuration Error: Invalid NEXT_PUBLIC_SITE_URL', {
        status: 500,
      });
    }
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(`${redirectOrigin}${next}`);
      }
    } catch {
      return NextResponse.redirect(`${redirectOrigin}/?error=auth-failed`);
    }
  }

  return NextResponse.redirect(`${redirectOrigin}/?error=auth-failed`);
}
