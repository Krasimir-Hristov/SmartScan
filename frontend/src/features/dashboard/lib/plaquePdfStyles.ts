import { Font, StyleSheet } from '@react-pdf/renderer';
import type { PlaqueFormat, PlaqueTheme } from './plaqueConfig';

let fontsRegistered = false;

/**
 * Registers the locally hosted Unicode Roboto cut (Latin + Cyrillic + Greek).
 * Local-only on purpose: printing must never depend on a remote CDN.
 */
export const registerPlaqueFonts = (): void => {
  if (fontsRegistered) return;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  Font.register({
    family: 'Roboto',
    fonts: [
      { src: `${origin}/fonts/Roboto-Regular.ttf`, fontWeight: 'normal' },
      { src: `${origin}/fonts/Roboto-Bold.ttf`, fontWeight: 'bold' },
    ],
  });

  // A plaque must never hyphenate guest-facing words.
  Font.registerHyphenationCallback((word) => [word]);

  fontsRegistered = true;
};

export interface PlaquePdfMetrics {
  pagePadding: number;
  qrBoxSize: number;
  titleSize: number;
  subtitleSize: number;
  langTextSize: number;
  langRowMargin: number;
  flagWidth: number;
  badgeSize: number;
  screwSize: number;
}

export const PLAQUE_PDF_METRICS: Record<PlaqueFormat, PlaquePdfMetrics> = {
  A4: {
    pagePadding: 36,
    qrBoxSize: 200,
    titleSize: 26,
    subtitleSize: 10,
    langTextSize: 9.5,
    langRowMargin: 4,
    flagWidth: 16,
    badgeSize: 8,
    screwSize: 12,
  },
  A5: {
    pagePadding: 28,
    qrBoxSize: 150,
    titleSize: 21,
    subtitleSize: 8.5,
    langTextSize: 8,
    langRowMargin: 3.5,
    flagWidth: 14,
    badgeSize: 7.5,
    screwSize: 11,
  },
  A6: {
    pagePadding: 20,
    qrBoxSize: 112,
    titleSize: 16,
    subtitleSize: 7.5,
    langTextSize: 7,
    langRowMargin: 2.5,
    flagWidth: 12,
    badgeSize: 6.5,
    screwSize: 10,
  },
};

export const FLAG_ASPECT_RATIO = 3 / 4;

interface PlaquePdfPalette {
  pageBg: string;
  boxBg: string;
  boxBorder: string;
  accent: string;
  accentText: string;
  textPrimary: string;
  textSecondary: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  screwBg: string;
  screwBorder: string;
  screwSlot: string;
  pillBg: string;
}

/** Mirrors the WYSIWYG preview tokens so paper and PDF outputs stay identical. */
export const PLAQUE_PDF_PALETTE: Record<PlaqueTheme, PlaquePdfPalette> = {
  light: {
    pageBg: '#FFFFFF',
    boxBg: '#FAFAFA',
    boxBorder: '#E4E4E7',
    accent: '#10B981',
    accentText: '#059669',
    textPrimary: '#09090B',
    textSecondary: '#3F3F46',
    badgeBg: '#ECFDF5',
    badgeBorder: '#A7F3D0',
    badgeText: '#047857',
    screwBg: '#E4E4E7',
    screwBorder: '#D4D4D8',
    screwSlot: '#A1A1AA',
    pillBg: '#FFFFFF',
  },
  dark: {
    pageBg: '#09090B',
    boxBg: '#121216',
    boxBorder: '#27272A',
    accent: '#10B981',
    accentText: '#10B981',
    textPrimary: '#FFFFFF',
    textSecondary: '#D4D4D8',
    badgeBg: '#064E3B',
    badgeBorder: '#059669',
    badgeText: '#34D399',
    screwBg: '#18181B',
    screwBorder: '#27272A',
    screwSlot: '#52525B',
    pillBg: '#18181B',
  },
};

export const createPlaquePdfStyles = (
  theme: PlaqueTheme,
  metrics: PlaquePdfMetrics,
) => {
  const palette = PLAQUE_PDF_PALETTE[theme];

  const screwBase = {
    position: 'absolute' as const,
    width: metrics.screwSize,
    height: metrics.screwSize,
    borderRadius: metrics.screwSize / 2,
    borderWidth: 1,
    borderColor: palette.screwBorder,
    backgroundColor: palette.screwBg,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return StyleSheet.create({
    page: {
      fontFamily: 'Roboto',
      backgroundColor: palette.pageBg,
      padding: metrics.pagePadding,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
    },
    screwTopLeft: { ...screwBase, top: 14, left: 14 },
    screwTopRight: { ...screwBase, top: 14, right: 14 },
    screwBottomLeft: { ...screwBase, bottom: 14, left: 14 },
    screwBottomRight: { ...screwBase, bottom: 14, right: 14 },
    screwSlot: {
      width: metrics.screwSize / 2,
      height: 1,
      backgroundColor: palette.screwSlot,
    },
    headerContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginTop: 12,
      marginBottom: 14,
      textAlign: 'center',
      width: '100%',
    },
    brandBadge: {
      backgroundColor: palette.badgeBg,
      borderColor: palette.badgeBorder,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 3,
      paddingHorizontal: 10,
      marginBottom: 6,
    },
    brandBadgeText: {
      color: palette.badgeText,
      fontSize: metrics.badgeSize,
      fontWeight: 'bold',
      letterSpacing: 1,
    },
    spaceTitle: {
      color: palette.textPrimary,
      fontSize: metrics.titleSize,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
      maxWidth: '90%',
    },
    spaceSubtitle: {
      color: palette.textSecondary,
      fontSize: metrics.subtitleSize,
      fontWeight: 'normal',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    langBox: {
      width: '100%',
      backgroundColor: palette.boxBg,
      borderColor: palette.boxBorder,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 9,
      paddingHorizontal: 14,
      marginVertical: 6,
    },
    langRow: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: metrics.langRowMargin,
    },
    flagSlot: {
      marginRight: 7,
    },
    langText: {
      color: palette.accentText,
      fontSize: metrics.badgeSize - 1,
      fontWeight: 'bold',
      marginRight: 6,
    },
    langDescription: {
      color: palette.textSecondary,
      fontSize: metrics.langTextSize,
      fontWeight: 'normal',
      flex: 1,
    },
    qrContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      backgroundColor: palette.boxBg,
      borderColor: palette.accentText,
      borderWidth: 1.5,
      borderRadius: 16,
      marginVertical: 8,
    },
    qrSurface: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    qrCaption: {
      marginTop: 8,
      fontSize: metrics.badgeSize,
      fontWeight: 'bold',
      color: palette.accentText,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
  });
};
