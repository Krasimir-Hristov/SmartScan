import type { LegalDocument } from '../types/legalTypes';
import type { TranslationFn } from './termsContent';

export function buildPrivacyDocument(t: TranslationFn): LegalDocument {
  return {
    title: t('title'),
    subtitle: t('subtitle'),
    lastUpdated: t('lastUpdated'),
    effectiveDate: t('effectiveDate'),
    summary: t('summary'),
    clauses: [
      {
        id: 'controller',
        number: '01',
        title: t('c1Title'),
        paragraphs: [t('c1P1'), t('c1P2')],
        callout: {
          type: 'shield',
          title: t('c1CalloutTitle'),
          text: t('c1CalloutText'),
        },
      },
      {
        id: 'lawful-basis',
        number: '02',
        title: t('c2Title'),
        paragraphs: [t('c2P1')],
        bulletPoints: [t('c2B1'), t('c2B2'), t('c2B3'), t('c2B4')],
      },
      {
        id: 'data-categories',
        number: '03',
        title: t('c3Title'),
        paragraphs: [t('c3P1')],
        bulletPoints: [
          t('c3B1'),
          t('c3B2'),
          t('c3B3'),
          t('c3B4'),
          t('c3B5'),
        ],
        callout: {
          type: 'info',
          title: t('c3CalloutTitle'),
          text: t('c3CalloutText'),
        },
      },
      {
        id: 'subprocessors',
        number: '04',
        title: t('c4Title'),
        paragraphs: [t('c4P1')],
        bulletPoints: [t('c4B1'), t('c4B2'), t('c4B3'), t('c4B4')],
      },
      {
        id: 'security-measures',
        number: '05',
        title: t('c5Title'),
        paragraphs: [t('c5P1')],
        bulletPoints: [t('c5B1'), t('c5B2'), t('c5B3'), t('c5B4')],
      },
      {
        id: 'retention-purging',
        number: '06',
        title: t('c6Title'),
        paragraphs: [t('c6P1'), t('c6P2')],
      },
      {
        id: 'gdpr-rights',
        number: '07',
        title: t('c7Title'),
        paragraphs: [t('c7P1')],
        bulletPoints: [
          t('c7B1'),
          t('c7B2'),
          t('c7B3'),
          t('c7B4'),
          t('c7B5'),
          t('c7B6'),
        ],
      },
      {
        id: 'cookies',
        number: '08',
        title: t('c8Title'),
        paragraphs: [t('c8P1'), t('c8P2')],
      },
      {
        id: 'supervisory-authority',
        number: '09',
        title: t('c9Title'),
        paragraphs: [t('c9P1'), t('c9P2')],
      },
      {
        id: 'dpo-contact',
        number: '10',
        title: t('c10Title'),
        paragraphs: [t('c10P1')],
      },
    ],
  };
}
