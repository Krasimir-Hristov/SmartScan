import React from 'react';
import type { Metadata } from 'next';
import { StayExperience, getSpaceStayData } from '@/features/stay';

interface StayPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: StayPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = getSpaceStayData(slug);

  return {
    title: `${data.name} · Дигитален наръчник | SmartScan Stay`,
    description: `Дигитален наръчник за гости на ${data.name}. Моментален достъп до Wi-Fi, настаняване и бързи контакти.`,
    openGraph: {
      title: `${data.name} · Дигитален наръчник`,
      description: `Дигитален наръчник за гости на ${data.name}. Wi-Fi, адрес за такси, настаняване и правила за тишина.`,
      type: 'website',
    },
  };
}

const StayPage = async ({ params }: StayPageProps) => {
  const { slug } = await params;

  return (
    <main className="min-h-dvh bg-[#070709]">
      <StayExperience slug={slug} />
    </main>
  );
};

export default StayPage;
