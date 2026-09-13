'use client';

import React from 'react';

interface StayContainerProps {
  children: React.ReactNode;
}

export const StayContainer: React.FC<StayContainerProps> = ({ children }) => {
  return (
    <div className="min-h-dvh bg-[#070709] text-zinc-100 flex justify-center items-start selection:bg-emerald-500 selection:text-zinc-950 font-sans">
      {/* Desktop simulated phone frame wrapper */}
      <div className="w-full max-w-md min-h-dvh bg-[#09090b] sm:border-x sm:border-white/[0.08] sm:shadow-2xl sm:shadow-emerald-950/20 flex flex-col relative pb-[env(safe-area-inset-bottom,1.5rem)]">
        {children}
      </div>
    </div>
  );
};
