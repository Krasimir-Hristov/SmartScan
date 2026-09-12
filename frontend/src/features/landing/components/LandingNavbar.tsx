'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Menu, X, Sparkles, QrCode } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface LandingNavbarProps {
  onOpenAuth: () => void;
  onOpenDemo?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  onOpenAuth,
  onOpenDemo,
}) => {
  const t = useTranslations('nav');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  const navItems: NavItem[] = [
    { id: 'overview', label: t('overview'), href: '#overview' },
    { id: 'showcase', label: t('showcase'), href: '#showcase' },
    { id: 'how-it-works', label: t('howItWorks'), href: '#how-it-works' },
    { id: 'pricing', label: t('pricing'), href: '#pricing' },
  ];

  // ── Page Scroll Tracking (Scrollspy) ─────────────────────────────────────────
  useEffect(() => {
    const sectionIds = ['overview', 'showcase', 'how-it-works', 'pricing'];

    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 20);

      // Top of page check
      if (scrollY < 120) {
        setActiveSection('overview');
        return;
      }

      // Bottom of page check (when near footer, highlight pricing)
      if (
        window.innerHeight + scrollY >=
        document.documentElement.scrollHeight - 100
      ) {
        setActiveSection('pricing');
        return;
      }

      // Calculate which section is in view (offset by navbar height + cushion)
      const offset = 140;
      const currentScroll = scrollY + offset;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          if (currentScroll >= top) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Smooth Scroll Handler with Navbar Offset ────────────────────────────────
  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
      e.preventDefault();
      const el = document.getElementById(targetId);
      if (el) {
        const navbarHeight = 72;
        const targetTop =
          el.getBoundingClientRect().top + window.scrollY - navbarHeight;
        window.scrollTo({
          top: targetTop,
          behavior: 'smooth',
        });
        setActiveSection(targetId);
      }
    },
    []
  );

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-300',
        isScrolled
          ? 'border-b border-emerald-500/20 bg-zinc-950/85 backdrop-blur-xl shadow-lg shadow-black/40'
          : 'border-b border-emerald-950/30 bg-zinc-950/60 backdrop-blur-md'
      )}
    >
      <div className='mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8'>
        {/* Brand Logo */}
        <a
          href='#overview'
          onClick={(e) => handleNavClick(e, 'overview')}
          aria-label='SmartScan Stay Home'
          className='flex items-center gap-2.5 group cursor-pointer transition-opacity hover:opacity-90'
        >
          <div className='relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 shadow-md shadow-emerald-500/20 group-hover:shadow-emerald-500/35 transition-all'>
            <QrCode className='h-5 w-5 text-zinc-950' />
            <span className='absolute -top-1 -right-1 flex h-2.5 w-2.5'>
              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' />
              <span className='relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300' />
            </span>
          </div>
          <div className='flex flex-col'>
            <div className='flex items-center gap-1.5'>
              <span className='text-lg font-bold tracking-tight text-white font-display'>
                SmartScan
              </span>
            </div>
            <span className='text-[10px] font-medium tracking-wider uppercase text-emerald-500/80 -mt-1 font-mono'>
              AI Concierge
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links with Active Indicator Pill */}
        <nav
          className='hidden md:flex items-center gap-1 p-1 rounded-full bg-zinc-900/60 border border-white/5 backdrop-blur-md'
          aria-label='Main Navigation'
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.id)}
                className={cn(
                  'relative px-4 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer',
                  isActive
                    ? 'text-emerald-400 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId='activeNavbarIndicator'
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className='absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/30 shadow-xs shadow-emerald-500/20'
                    aria-hidden='true'
                  />
                )}
                <span className='relative z-10'>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Right Section: Global Language Switcher + Sign In */}
        <div className='hidden sm:flex items-center gap-3'>
          {/* Global Language Switcher */}
          <LanguageSwitcher align='right' variant='ghost' />

          {/* Sign In with Google */}
          <button
            type='button'
            aria-label={t('signIn')}
            onClick={onOpenAuth}
            className='inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-zinc-900/90 hover:bg-zinc-800 border border-emerald-500/20 hover:border-emerald-500/40 shadow-sm transition-all cursor-pointer active:scale-[0.98]'
          >
            <svg className='w-4 h-4' viewBox='0 0 24 24' aria-hidden='true'>
              <path
                fill='#4285F4'
                d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
              />
              <path
                fill='#34A853'
                d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
              />
              <path
                fill='#FBBC05'
                d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z'
              />
              <path
                fill='#EA4335'
                d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z'
              />
            </svg>
            <span>{t('signIn')}</span>
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className='flex sm:hidden items-center gap-2'>
          <LanguageSwitcher align='right' variant='ghost' />
          <button
            type='button'
            aria-label={isMobileNavOpen ? t('closeMenu') : t('openMenu')}
            onClick={() => setIsMobileNavOpen((v) => !v)}
            className='p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer disabled:cursor-not-allowed'
          >
            {isMobileNavOpen ? (
              <X className='w-5 h-5' />
            ) : (
              <Menu className='w-5 h-5' />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileNavOpen && (
        <div className='sm:hidden border-b border-zinc-800 bg-zinc-950 px-4 py-5 transition-all duration-200'>
          <div className='flex flex-col gap-4'>
            <nav className='flex flex-col gap-1.5' aria-label='Mobile Navigation'>
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={(e) => {
                      setIsMobileNavOpen(false);
                      handleNavClick(e, item.id);
                    }}
                    className={cn(
                      'flex items-center justify-between text-sm font-medium py-2.5 px-3.5 rounded-xl transition-all cursor-pointer',
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span className='flex h-2 w-2 relative'>
                        <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' />
                        <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-400' />
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>

            <div className='pt-3 border-t border-zinc-900 flex flex-col gap-2.5'>
              <Button
                variant='primary'
                size='md'
                fullWidth
                onClick={() => {
                  setIsMobileNavOpen(false);
                  onOpenAuth();
                }}
                aria-label={t('signIn')}
              >
                <Sparkles className='w-4 h-4 mr-1 text-zinc-950' />
                {t('signIn')}
              </Button>
              {onOpenDemo && (
                <button
                  type='button'
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    onOpenDemo();
                  }}
                  aria-label='Демо преглед за гости'
                  className='w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-500/30 transition-all cursor-pointer'
                >
                  Демо преглед за гости
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
