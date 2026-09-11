import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, type LocaleCode } from '@/lib/i18n/config';

/**
 * Detects the best-matching locale from the Accept-Language header.
 * Parses the q-weighted list, filters out q=0, sorts by descending q,
 * and matches against the supported locales.
 */
const detectLocaleFromHeader = (acceptLanguage: string | null): LocaleCode => {
  if (!acceptLanguage) return defaultLocale;

  const supported = locales.map((l) => l.code);

  // Parse Accept-Language: "fr-CH, fr;q=0.9, en;q=0.8, de;q=0"
  const parsed = acceptLanguage
    .split(',')
    .map((part) => {
      const [rawLang, ...params] = part.trim().split(';');
      const lang = rawLang.split('-')[0].toLowerCase();
      let q = 1.0;
      for (const param of params) {
        const [key, val] = param.trim().split('=');
        if (key === 'q') {
          const parsedQ = parseFloat(val);
          if (!isNaN(parsedQ)) q = parsedQ;
        }
      }
      return { lang, q };
    })
    .filter((item) => item.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const item of parsed) {
    if (supported.includes(item.lang as LocaleCode)) {
      return item.lang as LocaleCode;
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
