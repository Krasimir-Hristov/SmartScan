import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, type LocaleCode } from '@/lib/i18n/config';

/**
 * Detects the best-matching locale from the Accept-Language header.
 * Parses the q-weighted list and matches against the supported locales.
 */
const detectLocaleFromHeader = (acceptLanguage: string | null): LocaleCode => {
  if (!acceptLanguage) return defaultLocale;

  const supported = locales.map((l) => l.code);

  // Parse Accept-Language: "de-DE,de;q=0.9,en;q=0.8"
  const preferred = acceptLanguage
    .split(',')
    .map((part) => {
      const [langQ] = part.trim().split(';');
      return langQ.split('-')[0].toLowerCase(); // "de-DE" → "de"
    });

  for (const lang of preferred) {
    if (supported.includes(lang as LocaleCode)) {
      return lang as LocaleCode;
    }
  }

  return defaultLocale;
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value as LocaleCode | undefined;
  const acceptLanguage = headerStore.get('accept-language');

  // Priority: explicit cookie → Accept-Language header → 'en'
  const supported = locales.map((l) => l.code) as string[];
  const locale: LocaleCode =
    cookieLocale && supported.includes(cookieLocale)
      ? cookieLocale
      : detectLocaleFromHeader(acceptLanguage);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
