export const locales = [
  { code: 'en', label: 'English',   countryCode: 'gb' },
  { code: 'bg', label: 'Български', countryCode: 'bg' },
  { code: 'ro', label: 'Română',    countryCode: 'ro' },
  { code: 'el', label: 'Ελληνικά',  countryCode: 'gr' }, // locale 'el' → country 'gr'
  { code: 'ru', label: 'Русский',   countryCode: 'ru' },
  { code: 'tr', label: 'Türkçe',    countryCode: 'tr' },
  { code: 'de', label: 'Deutsch',   countryCode: 'de' },
  { code: 'es', label: 'Español',   countryCode: 'es' },
  { code: 'it', label: 'Italiano',  countryCode: 'it' },
  { code: 'fr', label: 'Français',  countryCode: 'fr' },
] as const;

export type LocaleCode = (typeof locales)[number]['code'];
export const defaultLocale: LocaleCode = 'en';
