import React from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { StayExperience, getSpaceStayData } from '@/features/stay';

interface StayPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: StayPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = getSpaceStayData(slug);
  const t = await getTranslations('stay');

  return {
    title: t('metaTitle', { name: data.name }),
    description: t('metaDesc', { name: data.name }),
    openGraph: {
      title: t('metaTitle', { name: data.name }),
      description: t('ogDesc', { name: data.name }),
      type: 'website',
    },
  };
}

const StayPage: React.FC<StayPageProps> = async ({ params }) => {
  const { slug } = await params;

  return (
    <main className="min-h-dvh bg-[#070709]">
      <StayExperience slug={slug} />
    </main>
  );
};

export default StayPage;
