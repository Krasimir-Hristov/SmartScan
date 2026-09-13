'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, PhoneCall, MessageCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { FastActionContacts } from '../types/stayTypes';
import { useClipboard } from '../hooks/useClipboard';
import { useHaptic } from '../hooks/useHaptic';

interface FastActionGridProps {
  contacts: FastActionContacts;
}

export const FastActionGrid: React.FC<FastActionGridProps> = ({ contacts }) => {
  const t = useTranslations('stay');
  const { copied: addressCopied, copy: copyAddress } = useClipboard();
  const { triggerHaptic } = useHaptic();

  const handleCopyAddress = async (e: React.MouseEvent) => {
    e.preventDefault();
    triggerHaptic(50);
    await copyAddress(contacts.taxiAddress);
  };

  const whatsappUrl = contacts.whatsappPhone
    ? `https://wa.me/${contacts.whatsappPhone.replace(/[^\d]/g, '')}${
        contacts.whatsappPrefilledMessage
          ? `?text=${encodeURIComponent(contacts.whatsappPrefilledMessage)}`
          : ''
      }`
    : '';

  const emergencyNumber = contacts.emergencyNumber || '112';

  return (
    <section aria-label={t('fastActionGridAria')} className="grid grid-cols-2 gap-3">
      {/* 1. Copy Taxi Address Tile */}
      {contacts.taxiAddress && (
        <button
          type="button"
          onClick={handleCopyAddress}
          aria-label={addressCopied ? t('addressCopied') : t('copyAddress')}
          className="flex flex-col justify-between p-4 rounded-2xl bg-[#121216] border border-white/[0.08] hover:border-emerald-500/40 text-left transition-all cursor-pointer group active:scale-[0.98] min-h-[120px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            {addressCopied ? (
              <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            ) : (
              <Copy className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
            )}
          </div>
          <div className="flex flex-col gap-0.5 mt-2">
            <span className="text-[11px] font-medium text-zinc-400">
              {addressCopied ? t('addressCopied') : t('taxiAddressTitle')}
            </span>
            <span className="text-xs font-semibold text-white line-clamp-2 leading-tight">
              {contacts.taxiAddress}
            </span>
          </div>
        </button>
      )}

      {/* 2. Call Local Taxi Tile */}
      {contacts.taxiPhone && (
        <a
          href={`tel:${contacts.taxiPhone}`}
          aria-label={t('callTaxiAria')}
          className="flex flex-col justify-between p-4 rounded-2xl bg-[#121216] border border-white/[0.08] hover:border-teal-500/40 text-left transition-all cursor-pointer group active:scale-[0.98] min-h-[120px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:bg-teal-500/20 transition-colors">
              <PhoneCall className="w-5 h-5 text-teal-400" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5 mt-2">
            <span className="text-[11px] font-medium text-zinc-400">{t('callTaxi')}</span>
            <span className="text-xs font-semibold text-white font-mono tracking-tight">
              {contacts.taxiPhone}
            </span>
          </div>
        </a>
      )}

      {/* 3. WhatsApp Host Tile */}
      {contacts.whatsappPhone && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('whatsappHostAria')}
          className="flex flex-col justify-between p-4 rounded-2xl bg-[#121216] border border-white/[0.08] hover:border-emerald-500/40 text-left transition-all cursor-pointer group active:scale-[0.98] min-h-[120px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5 mt-2">
            <span className="text-[11px] font-medium text-zinc-400">{t('whatsappHost')}</span>
            <span className="text-xs font-semibold text-white">WhatsApp</span>
          </div>
        </a>
      )}

      {/* 4. Emergency 112 SOS Tile (Red Accent) */}
      <a
        href={`tel:${emergencyNumber}`}
        aria-label={t('emergencyAria')}
        className="flex flex-col justify-between p-4 rounded-2xl bg-red-950/20 border border-red-500/30 hover:border-red-500/60 text-left transition-all cursor-pointer group active:scale-[0.98] min-h-[120px]"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 group-hover:bg-red-500/30 transition-colors">
            <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 font-mono">
            SOS
          </span>
        </div>
        <div className="flex flex-col gap-0.5 mt-2">
          <span className="text-[11px] font-medium text-red-400">{t('emergencyTitle')}</span>
          <span className="text-[10px] text-zinc-400 leading-tight">
            {t('emergencySubtitle')}
          </span>
        </div>
      </a>
    </section>
  );
};
