/**
 * Server Action — set the NEXT_LOCALE cookie to persist language choice
 * across all verticals (Stay, Menu, RealEstate) and page navigations.
 *
 * ⚠️  This MUST stay as a dedicated 'use server' file.
 *     Never inline server actions with cookie writes inside client components.
 */
'use server';

import { cookies } from 'next/headers';
import { locales } from '@/lib/i18n/config';

export const setLocaleCookie = async (locale: string): Promise<void> => {
  const isValid = locales.some((l) => l.code === locale);
  if (!isValid) return;

  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false, // must be readable by client JS for hydration
  });
};
