import React from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { TermsPage } from '@/features/legal';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('legal');
  return {
    title: `${t('termsTitle')} | SmartScan Stay`,
    description: t('termsSubtitle'),
    openGraph: {
      title: `${t('termsTitle')} | SmartScan Stay`,
      description: t('termsSubtitle'),
      type: 'website',
    },
  };
};

const Page: React.FC = () => {
  return <TermsPage />;
};

export default Page;
