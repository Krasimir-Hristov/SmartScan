import React from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ContactPage } from '@/features/contact';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('contact');
  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDesc'),
      type: 'website',
    },
  };
};

const Page: React.FC = () => {
  return <ContactPage />;
};

export default Page;
