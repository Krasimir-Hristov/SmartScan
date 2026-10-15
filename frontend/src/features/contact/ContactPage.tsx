'use client';

import React from 'react';
import { ContactNavbar } from './components/ContactNavbar';
import { ContactHeader } from './components/ContactHeader';
import { ContactForm } from './components/ContactForm';
import { LandingFooter } from '@/features/landing';

export const ContactPage: React.FC = () => {
  return (
    <div className="min-h-dvh flex flex-col bg-[#09090b] text-white selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Sticky Obsidian Header */}
      <ContactNavbar />

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        {/* Ambient Emerald Radial Glows */}
        <div
          className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 w-140 h-100 bg-emerald-500/10 blur-[130px] rounded-full"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 right-10 w-96 h-96 bg-teal-500/5 blur-[120px] rounded-full"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Section Header */}
          <ContactHeader />

          {/* Interactive Form Card */}
          <ContactForm />
        </div>
      </main>

      {/* Global Landing & Legal Footer */}
      <LandingFooter />
    </div>
  );
};
