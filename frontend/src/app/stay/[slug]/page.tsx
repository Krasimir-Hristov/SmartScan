import React from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { StayExperience } from '@/features/stay';
import { getSpaceStayDataWithFallback } from '@/lib/dal';

interface StayPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: StayPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getSpaceStayDataWithFallback(slug);
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
  const initialData = await getSpaceStayDataWithFallback(slug);

  return (
    <main className="min-h-dvh bg-[#070709]">
      <StayExperience slug={slug} initialData={initialData} />
    </main>
  );
};

export default StayPage;
