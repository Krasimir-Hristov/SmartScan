import type { LegalDocument } from '../types/legalTypes';

export type TranslationFn = (key: string) => string;

export function buildTermsDocument(t: TranslationFn): LegalDocument {
  return {
    title: t('title'),
    subtitle: t('subtitle'),
    lastUpdated: t('lastUpdated'),
    effectiveDate: t('effectiveDate'),
    summary: t('summary'),
    clauses: [
      {
        id: 'definitions',
        number: '01',
        title: t('c1Title'),
        paragraphs: [t('c1P1'), t('c1P2')],
        bulletPoints: [t('c1B1'), t('c1B2'), t('c1B3')],
      },
      {
        id: 'account-eligibility',
        number: '02',
        title: t('c2Title'),
        paragraphs: [t('c2P1'), t('c2P2')],
        callout: {
          type: 'shield',
          title: t('c2CalloutTitle'),
          text: t('c2CalloutText'),
        },
      },
      {
        id: 'subscriptions-stripe',
        number: '03',
        title: t('c3Title'),
        paragraphs: [t('c3P1'), t('c3P2')],
        bulletPoints: [t('c3B1'), t('c3B2'), t('c3B3'), t('c3B4')],
        callout: {
          type: 'info',
          title: t('c3CalloutTitle'),
          text: t('c3CalloutText'),
        },
      },
      {
        id: 'host-responsibilities',
        number: '04',
        title: t('c4Title'),
        paragraphs: [t('c4P1'), t('c4P2')],
      },
      {
        id: 'ai-concierge-disclaimers',
        number: '05',
        title: t('c5Title'),
        paragraphs: [t('c5P1'), t('c5P2')],
        callout: {
          type: 'warning',
          title: t('c5CalloutTitle'),
          text: t('c5CalloutText'),
        },
        bulletPoints: [t('c5B1'), t('c5B2')],
      },
      {
        id: 'intellectual-property',
        number: '06',
        title: t('c6Title'),
        paragraphs: [t('c6P1'), t('c6P2')],
      },
      {
        id: 'prohibited-use',
        number: '07',
        title: t('c7Title'),
        paragraphs: [t('c7P1'), t('c7P2')],
      },
      {
        id: 'termination-purge',
        number: '08',
        title: t('c8Title'),
        paragraphs: [t('c8P1'), t('c8P2')],
      },
      {
        id: 'limitation-liability',
        number: '09',
        title: t('c9Title'),
        paragraphs: [t('c9P1'), t('c9P2')],
      },
      {
        id: 'governing-law',
        number: '10',
        title: t('c10Title'),
        paragraphs: [t('c10P1'), t('c10P2')],
      },
      {
        id: 'contact',
        number: '11',
        title: t('c11Title'),
        paragraphs: [t('c11P1')],
      },
    ],
  };
}
