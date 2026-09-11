'use client';

import React from 'react';
import { PlaqueMockup } from './plaque-mockup';
import { MobileMockup } from './mobile-mockup';

export interface HeroShowcaseProps {
  onOpenAuth: () => void;
  onOpenDemo: () => void;
}

export const HeroShowcase: React.FC<HeroShowcaseProps> = ({
  onOpenDemo,
}) => {
  return (
    <section id="showcase" className="py-8 md:py-14" aria-label="Interactive Showcase">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Left Card: Luxury Physical Acrylic Plaque */}
          <PlaqueMockup onOpenDemo={onOpenDemo} />

          {/* Right Card: Smartphone Guest Concierge PWA */}
          <MobileMockup onOpenDemo={onOpenDemo} />
        </div>
      </div>
    </section>
  );
};
