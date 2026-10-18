'use client';

import React from 'react';

interface StayContainerProps {
  children: React.ReactNode;
}

export const StayContainer: React.FC<StayContainerProps> = ({ children }) => {
  return (
    <div className="min-h-dvh w-full bg-[#070709] text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-zinc-950 font-sans relative">
      {/* Ambient glow backdrop */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-emerald-500/[0.03] blur-3xl -z-10"
        aria-hidden="true"
      />
      <div className="w-full flex-1 flex flex-col relative pb-[env(safe-area-inset-bottom,1.5rem)]">
        {children}
      </div>
    </div>
  );
};
