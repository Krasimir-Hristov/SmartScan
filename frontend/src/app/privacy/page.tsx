import React from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PrivacyPage } from '@/features/legal';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('legal');
  return {
    title: `${t('privacyTitle')} | SmartScan Stay`,
    description: t('privacySubtitle'),
    openGraph: {
      title: `${t('privacyTitle')} | SmartScan Stay`,
      description: t('privacySubtitle'),
      type: 'website',
    },
  };
};

const Page: React.FC = () => {
  return <PrivacyPage />;
};

export default Page;
