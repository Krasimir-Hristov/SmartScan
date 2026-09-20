import React, { useMemo } from 'react';
import {
  Document,
  Image,
  Page,
  Path,
  Rect,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer';
import type { PlaqueFormat, PlaqueTheme } from '../../lib/plaqueConfig';
import {
  DEFAULT_PLAQUE_FORMAT,
  DEFAULT_PLAQUE_THEME,
  PLAQUE_BOTTOM_LANGUAGES,
  PLAQUE_BRAND_BADGE,
  PLAQUE_QR_CAPTION,
  PLAQUE_SUBTITLE,
  PLAQUE_TOP_LANGUAGES,
  QR_BACKGROUND_COLOR,
  QR_FOREGROUND_COLOR,
  type PlaqueLanguageCallout,
} from '../../lib/plaqueConfig';
import {
  createPlaquePdfStyles,
  PLAQUE_PDF_METRICS,
  registerPlaqueFonts,
} from '../../lib/plaquePdfStyles';
import type { QrVectorPayload } from '../../lib/qrCode';
import { PlaquePdfFlag } from './PlaquePdfFlag';

registerPlaqueFonts();

export interface PlaquePdfDocumentProps {
  spaceName: string;
  /** High-density PNG of the QR code — used when vector geometry is unavailable. */
  qrDataUrl: string;
  /** Module-exact vector geometry of the QR code (preferred for print). */
  qrVector?: QrVectorPayload | null;
  format?: PlaqueFormat;
  theme?: PlaqueTheme;
}

export const PlaquePdfDocument: React.FC<PlaquePdfDocumentProps> = ({
  spaceName,
  qrDataUrl,
  qrVector = null,
  format = DEFAULT_PLAQUE_FORMAT,
  theme = DEFAULT_PLAQUE_THEME,
}) => {
  const metrics = PLAQUE_PDF_METRICS[format];
  const styles = useMemo(
    () => createPlaquePdfStyles(theme, metrics),
    [theme, metrics],
  );

  const qrStyle = { width: metrics.qrBoxSize, height: metrics.qrBoxSize };

  const renderLanguageRows = (
    callouts: readonly PlaqueLanguageCallout[],
  ) =>
    callouts.map((callout) => (
      <View key={callout.code} style={styles.langRow}>
        <View style={styles.flagSlot}>
          <PlaquePdfFlag
            countryCode={callout.countryCode}
            width={metrics.flagWidth}
          />
        </View>
        <Text style={styles.langText}>{callout.langName}</Text>
        <Text style={styles.langDescription}>{callout.text}</Text>
      </View>
    ));

  return (
    <Document
      title={`SmartScan_${spaceName}_${format}_${theme}`}
      author='SmartScan Stay'
      subject='Physical QR guest plaque with 24/7 AI Concierge'
    >
      <Page size={format} orientation='portrait' style={styles.page}>
        {/* Corner screw mounts (vector accents) */}
        <View style={styles.screwTopLeft}>
          <View style={styles.screwSlot} />
        </View>
        <View style={styles.screwTopRight}>
          <View style={styles.screwSlot} />
        </View>
        <View style={styles.screwBottomLeft}>
          <View style={styles.screwSlot} />
        </View>
        <View style={styles.screwBottomRight}>
          <View style={styles.screwSlot} />
        </View>

        {/* 1. Header */}
        <View style={styles.headerContainer}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>
              {PLAQUE_BRAND_BADGE.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.spaceTitle}>{spaceName || 'Villa Sanctuary'}</Text>
          <Text style={styles.spaceSubtitle}>{PLAQUE_SUBTITLE}</Text>
        </View>

        {/* 2. Top five languages with pure vector flags */}
        <View style={styles.langBox}>
          {renderLanguageRows(PLAQUE_TOP_LANGUAGES)}
        </View>

        {/* 3. Center QR code */}
        <View style={styles.qrContainer}>
          <View style={styles.qrSurface}>
            {qrVector ? (
              <Svg viewBox={qrVector.viewBox} style={qrStyle}>
                <Rect
                  x={0}
                  y={0}
                  width={qrVector.moduleCount}
                  height={qrVector.moduleCount}
                  fill={QR_BACKGROUND_COLOR}
                />
                <Path d={qrVector.pathData} fill={QR_FOREGROUND_COLOR} />
              </Svg>
            ) : (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={qrDataUrl} style={qrStyle} />
            )}
          </View>
          <Text style={styles.qrCaption}>{PLAQUE_QR_CAPTION}</Text>
        </View>

        {/* 4. Bottom five languages with pure vector flags */}
        <View style={styles.langBox}>
          {renderLanguageRows(PLAQUE_BOTTOM_LANGUAGES)}
        </View>
      </Page>
    </Document>
  );
};
