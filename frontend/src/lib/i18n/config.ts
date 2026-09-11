export const locales = [
  { code: 'en', label: 'English',    flag: '🇬🇧', countryCode: 'gb' },
  { code: 'bg', label: 'Български', flag: '🇧🇬', countryCode: 'bg' },
  { code: 'ro', label: 'Română',    flag: '🇷🇴', countryCode: 'ro' },
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷', countryCode: 'gr' }, // locale 'el' → country 'gr'
  { code: 'ru', label: 'Русский',   flag: '🇷🇺', countryCode: 'ru' },
  { code: 'tr', label: 'Türkçe',    flag: '🇹🇷', countryCode: 'tr' },
  { code: 'de', label: 'Deutsch',   flag: '🇩🇪', countryCode: 'de' },
  { code: 'es', label: 'Español',   flag: '🇪🇸', countryCode: 'es' },
  { code: 'it', label: 'Italiano',  flag: '🇮🇹', countryCode: 'it' },
  { code: 'fr', label: 'Français',  flag: '🇫🇷', countryCode: 'fr' },
] as const;

export type LocaleCode = (typeof locales)[number]['code'];
export const defaultLocale: LocaleCode = 'en';
