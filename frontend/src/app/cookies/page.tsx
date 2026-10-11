import React from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CookiesPage } from '@/features/legal';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('legal');
  return {
    title: `${t('cookiesTitle')} | SmartScan Stay`,
    description: t('cookiesSubtitle'),
    openGraph: {
      title: `${t('cookiesTitle')} | SmartScan Stay`,
      description: t('cookiesSubtitle'),
      type: 'website',
    },
  };
};

const Page: React.FC = () => {
  return <CookiesPage />;
};

export default Page;
