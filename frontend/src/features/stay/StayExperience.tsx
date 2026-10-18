'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { SpaceStayData } from './types/stayTypes';
import { getSpaceStayData } from './data/demoVilla';
import { StayContainer } from './components/StayContainer';
import { StayHeader } from './components/StayHeader';
import { WifiCard } from './components/WifiCard';
import { FastActionGrid } from './components/FastActionGrid';
import { StayScheduleCard } from './components/StayScheduleCard';
import { QuietHoursCard } from './components/QuietHoursCard';
import { ConciergeBar } from './components/ConciergeBar';
import { Sparkles } from 'lucide-react';

export interface StayExperienceProps {
  slug: string;
  initialData?: SpaceStayData;
}

export const StayExperience: React.FC<StayExperienceProps> = ({
  slug,
  initialData,
}) => {
  const t = useTranslations('stay');
  const rawData = initialData ?? getSpaceStayData(slug);

  // Dynamically attach localized tagline and WhatsApp message based on active language
  const data: SpaceStayData = {
    ...rawData,
    tagline: t('villaTagline'),
    contacts: {
      ...rawData.contacts,
      whatsappPrefilledMessage: t('whatsappMsg'),
    },
  };

  return (
    <StayContainer>
      {/* Top Header with Property Name and 10-Language Switcher */}
      <StayHeader propertyName={data.name} badgeText={data.badge} />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-8 items-start">
          {/* Left Column: Property Essentials & Fast Actions */}
          <div className="md:col-span-6 lg:col-span-7 flex flex-col gap-4 sm:gap-5">
            {/* 1-Click Wi-Fi Hero Card */}
            <WifiCard wifi={data.wifi} />

            {/* Fast Action Grid: Taxi Address, Call Taxi, WhatsApp, 112 SOS */}
            <FastActionGrid contacts={data.contacts} />

            {/* Schedule & Keybox */}
            <StayScheduleCard schedule={data.schedule} />

            {/* Quiet Hours & Siesta Protocol */}
            <QuietHoursCard quietHours={data.quietHours} />
          </div>

          {/* Right Column: 24/7 AI Concierge (Sticky on Tablet/Desktop) */}
          <div className="md:col-span-6 lg:col-span-5 md:sticky md:top-20 flex flex-col gap-4">
            <ConciergeBar spaceId={data.id} stayData={data} />
          </div>
        </div>

        {/* Footer Brand Credit */}
        <footer className="mt-4 pb-8 flex flex-col items-center justify-center gap-1.5 text-center">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('poweredBy')}</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            {data.name} · {data.tagline}
          </p>
        </footer>
      </main>
    </StayContainer>
  );
};
