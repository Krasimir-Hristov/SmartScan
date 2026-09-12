import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const isLocalEnv = process.env.NODE_ENV === 'development';
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

        // Security: Prevent Host Header Injection (CWE-601 / CWE-644).
        // Redirect to verified local origin in dev, or configured canonical origin in production.
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`);
        }

        if (siteUrl) {
          const canonicalOrigin = siteUrl.replace(/\/$/, '');
          return NextResponse.redirect(`${canonicalOrigin}${next}`);
        }

        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch {
      return NextResponse.redirect(`${origin}/?error=auth-failed`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth-failed`);
}
