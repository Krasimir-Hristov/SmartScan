import { locales, type LocaleCode } from '@/lib/i18n/config';

export type PlaqueFormat = 'A4' | 'A5' | 'A6';
export type PlaqueTheme = 'light' | 'dark';

/**
 * Every country code that ships with a vector flag. Derived from the locale
 * table, so a language without a matching flag becomes a compile-time error
 * instead of a silently empty flag in the printed PDF.
 */
export type PlaqueCountryCode = (typeof locales)[number]['countryCode'];

export interface PlaqueLanguageCallout {
  code: LocaleCode;
  countryCode: PlaqueCountryCode;
  langName: string;
  text: string;
}

export interface PlaquePrintSpec {
  format: PlaqueFormat;
  widthMm: number;
  heightMm: number;
  /** CSS `@page { size: ... }` value — the physical paper format. */
  pageSizeCss: string;
  /** Design width in CSS px used both by the WYSIWYG preview and by print. */
  designWidthPx: number;
  /** Inner padding in CSS px for the printed plaque. */
  designPaddingPx: number;
  /** QR render size in CSS px (scales with the format). */
  qrRenderSizePx: number;
  /** Static Tailwind class (literal so the JIT compiler picks it up). */
  screenMaxWidthClass: string;
}

/* -------------------------------------------------------------------------- */
/*  Plaque face copy (guest facing, deliberately language-independent of the   */
/*  host UI locale — these are printed on the physical plaque).                */
/* -------------------------------------------------------------------------- */

export const DEFAULT_PLAQUE_FORMAT: PlaqueFormat = 'A4';
export const DEFAULT_PLAQUE_THEME: PlaqueTheme = 'light';

export const PLAQUE_PRINT_ID = 'printable-plaque';
export const PLAQUE_QR_ID = 'plaque-qr-svg';

export const PLAQUE_BRAND_BADGE = 'SmartScan Stay';
export const PLAQUE_SUBTITLE = 'Digital Guest Guide & 24/7 AI Concierge';
export const PLAQUE_QR_CAPTION = 'Point Camera to Scan';

export const QR_FOREGROUND_COLOR = '#09090b';
export const QR_BACKGROUND_COLOR = '#ffffff';
export const QR_QUIET_ZONE_MODULES = 4;

export const STANDALONE_QR_SIZE_PX = 1024;
export const PDF_QR_RASTER_SIZE_PX = 1200;

/** Keeps the scaled print output a hair inside the page box (rounding guard). */
export const PRINT_SCALE_SAFETY = 0.995;

const CALLOUT_TEXTS: Record<LocaleCode, string> = {
  en: 'Scan for Wi-Fi, digital guide & 24/7 AI Concierge',
  bg: 'Сканирайте за Wi-Fi, дигитален гид и 24/7 AI консиерж',
  de: 'Scannen für WLAN, digitalen Guide & 24/7 KI-Concierge',
  ro: 'Scanați pentru Wi-Fi, ghid digital și 24/7 AI Concierge',
  el: 'Σαρώστε για Wi-Fi, ψηφιακό οδηγό & 24/7 AI Concierge',
  ru: 'Отсканируйте для Wi-Fi, гида и 24/7 AI-консьержа',
  tr: 'Wi-Fi, dijital rehber ve 24/7 AI danışman için tarayın',
  es: 'Escanee para Wi-Fi, guía digital y conserje IA 24/7',
  it: 'Scansiona per Wi-Fi, guida digitale e concierge AI 24/7',
  fr: 'Scannez pour Wi-Fi, guide digital et concierge IA 24/7',
};

/** Print order: EN, BG, DE, RO, EL on top — RU, TR, ES, IT, FR at the bottom. */
const PLAQUE_LANGUAGE_ORDER: readonly LocaleCode[] = [
  'en',
  'bg',
  'de',
  'ro',
  'el',
  'ru',
  'tr',
  'es',
  'it',
  'fr',
];

/** Fallback used only if a UI locale ever loses its flag mapping. */
const FALLBACK_COUNTRY_CODE: PlaqueCountryCode = 'gb';

const resolveCountryCode = (code: LocaleCode): PlaqueCountryCode =>
  locales.find((locale) => locale.code === code)?.countryCode ??
  FALLBACK_COUNTRY_CODE;

export const PLAQUE_LANGUAGES: readonly PlaqueLanguageCallout[] =
  PLAQUE_LANGUAGE_ORDER.map((code) => ({
    code,
    countryCode: resolveCountryCode(code),
    langName: code.toUpperCase(),
    text: CALLOUT_TEXTS[code],
  }));

export const PLAQUE_TOP_LANGUAGES = PLAQUE_LANGUAGES.slice(0, 5);
export const PLAQUE_BOTTOM_LANGUAGES = PLAQUE_LANGUAGES.slice(5);

export const PLAQUE_PRINT_SPECS: Record<PlaqueFormat, PlaquePrintSpec> = {
  A4: {
    format: 'A4',
    widthMm: 210,
    heightMm: 297,
    pageSizeCss: '210mm 297mm',
    designWidthPx: 480,
    designPaddingPx: 32,
    qrRenderSizePx: 168,
    screenMaxWidthClass: 'max-w-[480px]',
  },
  A5: {
    format: 'A5',
    widthMm: 148,
    heightMm: 210,
    pageSizeCss: '148mm 210mm',
    designWidthPx: 430,
    designPaddingPx: 28,
    qrRenderSizePx: 152,
    screenMaxWidthClass: 'max-w-[430px]',
  },
  A6: {
    format: 'A6',
    widthMm: 105,
    heightMm: 148,
    pageSizeCss: '105mm 148mm',
    designWidthPx: 380,
    designPaddingPx: 24,
    qrRenderSizePx: 128,
    screenMaxWidthClass: 'max-w-[380px]',
  },
};

export const PLAQUE_FORMATS: readonly PlaqueFormat[] = ['A4', 'A5', 'A6'];

/* -------------------------------------------------------------------------- */
/*  Pure helpers                                                              */
/* -------------------------------------------------------------------------- */

export const mmToCssPx = (mm: number): number => (mm / 25.4) * 96;

export const getPlaqueDesignHeightPx = (spec: PlaquePrintSpec): number =>
  (spec.designWidthPx * spec.heightMm) / spec.widthMm;

export const getPlaquePrintScale = (spec: PlaquePrintSpec): number =>
  (mmToCssPx(spec.widthMm) / spec.designWidthPx) * PRINT_SCALE_SAFETY;

export const getPlaqueAspectRatio = (spec: PlaquePrintSpec): string =>
  `${spec.widthMm} / ${spec.heightMm}`;

export const buildGuestUrl = (origin: string, slug: string): string => {
  const base = (origin || '').trim().replace(/\/+$/, '');
  const cleanSlug = (slug || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  const path = `/stay/${cleanSlug}`;
  return base ? `${base}${path}` : path;
};

export const sanitizeFileBaseName = (
  value: string,
  fallback = 'smartscan',
): string => {
  const clean = (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || fallback;
};

/** Hostnames that are never publicly reachable (loopback & LAN names). */
const NON_PUBLIC_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  '::1',
]);

/** Hostname suffixes that identify local domains and preview deployments. */
const NON_PUBLIC_HOST_SUFFIXES = [
  '.localhost',
  '.local',
  '.test',
  '.vercel.app',
  '.netlify.app',
];

/**
 * Extracts the hostname from a full origin (`https://host:port`) or from a bare
 * `host:port` string. Returns `null` when the value cannot be parsed.
 */
const parseHostname = (value: string): string | null => {
  for (const candidate of [value, `https://${value}`]) {
    try {
      const { hostname } = new URL(candidate);
      if (hostname) return hostname.toLowerCase().replace(/\.$/, '');
    } catch {
      // Try the next shape (bare host vs. absolute URL)
    }
  }

  return null;
};

/**
 * True for hostnames that must never end up inside a printed QR code
 * (localhost, LAN names, Vercel/Netlify preview deployments, ...).
 *
 * Only the hostname is inspected and the preview indicators are anchored to its
 * end, so an unrelated host such as `api.test.example.com` never matches.
 */
export const isLocalOrPreviewOrigin = (origin: string): boolean => {
  const hostname = parseHostname((origin || '').trim());
  if (!hostname) return false;

  return (
    NON_PUBLIC_HOSTNAMES.has(hostname) ||
    NON_PUBLIC_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  );
};
