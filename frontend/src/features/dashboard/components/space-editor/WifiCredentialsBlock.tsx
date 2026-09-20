'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, Wifi } from 'lucide-react';

export interface WifiCredentialsBlockProps {
  ssid: string;
  password: string;
  copied: boolean;
  onSsidChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onCopyPassword: () => void;
}

/** Wi-Fi SSID + password card with the 1-click password copy shortcut. */
export const WifiCredentialsBlock: React.FC<WifiCredentialsBlockProps> = ({
  ssid,
  password,
  copied,
  onSsidChange,
  onPasswordChange,
  onCopyPassword,
}) => {
  const t = useTranslations('dashboard');

  return (
    <div className='p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/8 flex flex-col gap-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-200'>
          <Wifi className='w-4 h-4 text-emerald-400' />
          <span>{t('stepWifiTitle')}</span>
        </div>
        {password && (
          <button
            type='button'
            onClick={onCopyPassword}
            aria-label={t('copyWifi')}
            className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition-colors cursor-pointer'
          >
            {copied ? (
              <Check className='w-3 h-3' />
            ) : (
              <Copy className='w-3 h-3' />
            )}
            <span>{copied ? t('wifiCopied') : t('copyWifi')}</span>
          </button>
        )}
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
        <div className='flex flex-col gap-1.5'>
          <span className='text-xs text-zinc-400'>{t('wifiSsidLabel')}</span>
          <input
            type='text'
            placeholder={t('wifiSsidPlaceholder')}
            value={ssid}
            onChange={(e) => onSsidChange(e.target.value)}
            className='w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500'
          />
        </div>
        <div className='flex flex-col gap-1.5'>
          <span className='text-xs text-zinc-400'>
            {t('wifiPasswordLabel')}
          </span>
          <input
            type='text'
            placeholder={t('wifiPasswordPlaceholder')}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className='w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-emerald-500'
          />
        </div>
      </div>
    </div>
  );
};
