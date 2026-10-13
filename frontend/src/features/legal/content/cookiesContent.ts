import type { LegalDocument } from '../types/legalTypes';
import type { TranslationFn } from './termsContent';

export function buildCookiesDocument(t: TranslationFn): LegalDocument {
  return {
    title: t('title'),
    subtitle: t('subtitle'),
    lastUpdated: t('lastUpdated'),
    effectiveDate: t('effectiveDate'),
    summary: t('summary'),
    clauses: [
      {
        id: 'what-are-cookies',
        number: '01',
        title: t('c1Title'),
        paragraphs: [t('c1P1'), t('c1P2')],
        callout: {
          type: 'info',
          title: t('c1CalloutTitle'),
          text: t('c1CalloutText'),
        },
      },
      {
        id: 'strictly-necessary',
        number: '02',
        title: t('c2Title'),
        paragraphs: [t('c2P1')],
        bulletPoints: [t('c2B1'), t('c2B2'), t('c2B3'), t('c2B4')].filter(Boolean),
        callout: {
          type: 'shield',
          title: t('c2CalloutTitle'),
          text: t('c2CalloutText'),
        },
        table: {
          headers: [
            t('tableHeaderName'),
            t('tableHeaderProvider'),
            t('tableHeaderPurpose'),
            t('tableHeaderDuration'),
            t('tableHeaderType'),
            t('tableHeaderCategory'),
          ],
          rows: [
            [
              'NEXT_LOCALE',
              t('tableRow1Provider'),
              t('tableRow1Purpose'),
              t('tableRow1Duration'),
              'HTTP Cookie',
              t('tableRow1Category'),
            ],
            [
              'sb-*-auth-token',
              t('tableRow2Provider'),
              t('tableRow2Purpose'),
              t('tableRow2Duration'),
              'HttpOnly Secure',
              t('tableRow2Category'),
            ],
            [
              'smartscan_cookie_consent',
              t('tableRow3Provider'),
              t('tableRow3Purpose'),
              t('tableRow3Duration'),
              'Cookie & LocalStorage',
              t('tableRow3Category'),
            ],
            [
              'smartscan_proxy_shield',
              t('tableRow4Provider'),
              t('tableRow4Purpose'),
              t('tableRow4Duration'),
              'HTTP Header / Cookie',
              t('tableRow4Category'),
            ],
            [
              '__stripe_mid, __stripe_sid',
              t('tableRow5Provider'),
              t('tableRow5Purpose'),
              t('tableRow5Duration'),
              'Secure Cookie (Stripe)',
              t('tableRow5Category'),
            ],
            [
              'smartscan_recent_space',
              t('tableRow6Provider'),
              t('tableRow6Purpose'),
              t('tableRow6Duration'),
              'LocalStorage',
              t('tableRow6Category'),
            ],
          ],
        },
      },
      {
        id: 'zero-trackers',
        number: '03',
        title: t('c3Title'),
        paragraphs: [t('c3P1'), t('c3P2')],
        bulletPoints: [t('c3B1'), t('c3B2'), t('c3B3')],
      },
      {
        id: 'consent-storage',
        number: '04',
        title: t('c4Title'),
        paragraphs: [t('c4P1')],
        bulletPoints: [t('c4B1'), t('c4B2')],
      },
      {
        id: 'browser-management',
        number: '05',
        title: t('c5Title'),
        paragraphs: [t('c5P1'), t('c5P2')],
        bulletPoints: [t('c5B1'), t('c5B2'), t('c5B3'), t('c5B4')],
      },
      {
        id: 'updates-and-contact',
        number: '06',
        title: t('c6Title'),
        paragraphs: [t('c6P1'), t('c6P2')],
      },
    ],
  };
}
