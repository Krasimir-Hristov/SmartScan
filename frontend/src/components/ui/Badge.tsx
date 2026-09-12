import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'emerald' | 'zinc' | 'outline';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'emerald',
  className,
  children,
  ...props
}) => {
  const variants = {
    emerald:
      'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    zinc: 'bg-zinc-900/90 text-zinc-300 border border-zinc-800',
    outline: 'border border-emerald-500/20 text-emerald-400 bg-transparent',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-wide',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
