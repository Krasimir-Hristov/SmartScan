'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Home,
  MapPin,
  Wifi,
  Phone,
  ShieldAlert,
  KeyRound,
  ExternalLink,
  Copy,
  Check,
  Save,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { Space, StaySettings } from '@/lib/types/databaseTypes';
import { triggerHaptic } from '@/lib/utils';
import { updateSpaceAction } from '../actions/spaceActions';
import { QuietHoursControl } from './QuietHoursControl';
import { DeleteSpaceModal } from './DeleteSpaceModal';

export interface SpaceEditorProps {
  space: Space;
  onSpaceUpdated: (updatedSpace: Space) => void;
  onSpaceDeleted?: (spaceId: string) => void;
}

const CHECKIN_OPTIONS = [
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

const CHECKOUT_OPTIONS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
];

export const SpaceEditor: React.FC<SpaceEditorProps> = ({
  space,
  onSpaceUpdated,
  onSpaceDeleted,
}) => {
  const t = useTranslations('dashboard');
  const settings = (space.stay_settings || {}) as StaySettings;

  // Form State
  const [name, setName] = useState(space.name);
  const [taxiAddress, setTaxiAddress] = useState(settings.taxiAddress || '');
  const [wifiSsid, setWifiSsid] = useState(settings.wifiSsid || '');
  const [wifiPassword, setWifiPassword] = useState(settings.wifiPassword || '');
  const [taxiPhone, setTaxiPhone] = useState(settings.taxiPhone || '');
  const [whatsappPhone, setWhatsappPhone] = useState(settings.whatsappPhone || '');
  const [emergencyNumber, setEmergencyNumber] = useState(settings.emergencyNumber || '112');

  // Quiet Hours State with Toggles
  const [hasNightSilence, setHasNightSilence] = useState(
    Boolean(settings.nightSilenceStart && settings.nightSilenceEnd)
  );
  const [nightSilenceStart, setNightSilenceStart] = useState(settings.nightSilenceStart || '23:00');
  const [nightSilenceEnd, setNightSilenceEnd] = useState(settings.nightSilenceEnd || '08:00');

  const [hasAfternoonRest, setHasAfternoonRest] = useState(
    Boolean(settings.afternoonRestStart && settings.afternoonRestEnd)
  );
  const [afternoonRestStart, setAfternoonRestStart] = useState(settings.afternoonRestStart || '14:30');
  const [afternoonRestEnd, setAfternoonRestEnd] = useState(settings.afternoonRestEnd || '17:30');

  // Check-in & Check-out Dropdowns
  const [checkInTime, setCheckInTime] = useState(settings.checkInTime || '15:00');
  const [checkOutTime, setCheckOutTime] = useState(settings.checkOutTime || '11:00');
  const [keyboxCode, setKeyboxCode] = useState(settings.keyboxCode || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWifi, setCopiedWifi] = useState(false);

  const handleCopyGuestLink = async () => {
    try {
      const fullUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/stay/${space.slug}`
          : `/stay/${space.slug}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      triggerHaptic(50);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleCopyWifiPassword = async () => {
    if (!wifiPassword) return;
    try {
      await navigator.clipboard.writeText(wifiPassword);
      setCopiedWifi(true);
      triggerHaptic(50);
      setTimeout(() => setCopiedWifi(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: t('errorNameRequired') });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const result = await updateSpaceAction({
        id: space.id,
        name: name.trim(),
        taxiAddress: taxiAddress.trim() || undefined,
        wifiSsid: wifiSsid.trim() || undefined,
        wifiPassword: wifiPassword.trim() || undefined,
        taxiPhone: taxiPhone.trim() || undefined,
        whatsappPhone: whatsappPhone.trim() || undefined,
        emergencyNumber: emergencyNumber.trim() || '112',
        nightSilenceStart: hasNightSilence ? nightSilenceStart : undefined,
        nightSilenceEnd: hasNightSilence ? nightSilenceEnd : undefined,
        afternoonRestStart: hasAfternoonRest ? afternoonRestStart : undefined,
        afternoonRestEnd: hasAfternoonRest ? afternoonRestEnd : undefined,
        checkInTime: checkInTime || '15:00',
        checkOutTime: checkOutTime || '11:00',
        keyboxCode: keyboxCode.trim() || undefined,
      });

      if (result.success && result.data) {
        onSpaceUpdated(result.data);
        setStatusMessage({ type: 'success', text: t('saveSuccess') });
        triggerHaptic(50);
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        setStatusMessage({ type: 'error', text: result.error || t('errorGeneral') });
      }
    } catch {
      setStatusMessage({ type: 'error', text: t('errorServer') });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner: Direct Guest Link & Fast Previews */}
      <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-r from-zinc-900/90 via-[#121216] to-zinc-900/90 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              <Sparkles className="w-3 h-3" />
              <span>{t('guestLinkTitle')}</span>
            </span>
            <span className="text-xs text-zinc-400">{t('guestLinkSub')}</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs sm:text-sm font-mono text-emerald-300 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-white/8 select-all">
              <span className="text-zinc-500 font-sans text-xs select-none">/stay/</span>
              {space.slug}
            </code>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={handleCopyGuestLink}
            aria-label={t('copyLink')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t('linkCopied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t('copyLink')}</span>
              </>
            )}
          </button>

          <Link
            href={`/stay/${space.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('previewGuest')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{t('previewGuest')}</span>
          </Link>
        </div>
      </div>

      {/* Main Edit Form */}
      <form onSubmit={handleSave} className="p-5 sm:p-7 rounded-3xl bg-[#121216] border border-white/8 flex flex-col gap-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/8">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              {t('credentialsTitle')}
            </h2>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            aria-label={t('saveChanges')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('saving')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('saveChanges')}</span>
              </>
            )}
          </button>
        </div>

        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            {statusMessage.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* 1. Име на обекта (Задължително) */}
        <div className="flex flex-col gap-2">
          <label htmlFor="edit-name" className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Home className="w-4 h-4" />
            <span>{t('propertyNameLabel')}</span>
          </label>
          <input
            id="edit-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white font-display text-base font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* 2. Точен адрес (Веднага под името!) */}
        <div className="flex flex-col gap-2">
          <label htmlFor="edit-address" className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>{t('exactAddressLabel')}</span>
          </label>
          <input
            id="edit-address"
            type="text"
            placeholder={t('stepAddressPlaceholder')}
            value={taxiAddress}
            onChange={(e) => setTaxiAddress(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <span className="text-[11px] text-zinc-500">
            {t('stepAddressDesc')}
          </span>
        </div>

        {/* 3. Wi-Fi Данни (С бутон за бързо копиране) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/8 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-200">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span>{t('stepWifiTitle')}</span>
            </div>
            {wifiPassword && (
              <button
                type="button"
                onClick={handleCopyWifiPassword}
                aria-label={t('copyWifi')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition-colors cursor-pointer"
              >
                {copiedWifi ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedWifi ? t('wifiCopied') : t('copyWifi')}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-400">{t('wifiSsidLabel')}</span>
              <input
                type="text"
                placeholder={t('wifiSsidPlaceholder')}
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-400">{t('wifiPasswordLabel')}</span>
              <input
                type="text"
                placeholder={t('wifiPasswordPlaceholder')}
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 4. Телефон за местно такси */}
        <div className="flex flex-col gap-2">
          <label htmlFor="edit-taxi-phone" className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>{t('stepTaxiTitle')}</span>
          </label>
          <input
            id="edit-taxi-phone"
            type="tel"
            placeholder={t('stepTaxiPlaceholder')}
            value={taxiPhone}
            onChange={(e) => setTaxiPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 5. Контакти & WhatsApp & Спешен номер */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-whatsapp" className="text-xs text-zinc-400">
              {t('whatsappLabel')}
            </label>
            <input
              id="edit-whatsapp"
              type="tel"
              placeholder={t('whatsappPlaceholder')}
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-emergency" className="text-xs text-zinc-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>{t('emergencyLabel')}</span>
            </label>
            <input
              id="edit-emergency"
              type="text"
              value={emergencyNumber}
              onChange={(e) => setEmergencyNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* 6. Часове за тишина (Нов компонент с Toggle бутони и падащи менюта) */}
        <QuietHoursControl
          nightSilenceStart={nightSilenceStart}
          nightSilenceEnd={nightSilenceEnd}
          hasNightSilence={hasNightSilence}
          onToggleNightSilence={(active) => setHasNightSilence(active)}
          onChangeNightStart={(val) => setNightSilenceStart(val)}
          onChangeNightEnd={(val) => setNightSilenceEnd(val)}

          afternoonRestStart={afternoonRestStart}
          afternoonRestEnd={afternoonRestEnd}
          hasAfternoonRest={hasAfternoonRest}
          onToggleAfternoonRest={(active) => setHasAfternoonRest(active)}
          onChangeAfternoonStart={(val) => setAfternoonRestStart(val)}
          onChangeAfternoonEnd={(val) => setAfternoonRestEnd(val)}
        />

        {/* 7. Настаняване & Сейф за ключ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-checkin" className="text-xs text-zinc-400">
              {t('checkInLabel')}
            </label>
            <select
              id="edit-checkin"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {CHECKIN_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-checkout" className="text-xs text-zinc-400">
              {t('checkOutLabel')}
            </label>
            <select
              id="edit-checkout"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {CHECKOUT_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-keybox" className="text-xs text-zinc-400 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('keyboxLabel')}</span>
            </label>
            <input
              id="edit-keybox"
              type="text"
              placeholder={t('keyboxPlaceholder')}
              value={keyboxCode}
              onChange={(e) => setKeyboxCode(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm"
            />
          </div>
        </div>

        {/* Danger Zone: Delete Property */}
        <div className="mt-4 pt-6 border-t border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-red-950/20 border border-red-500/30">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('dangerZoneTitle')}</span>
            </span>
            <span className="text-[11px] text-zinc-400">
              {t('dangerZoneDesc')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            aria-label={t('deleteSpace')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('deleteSpace')}</span>
          </button>
        </div>
      </form>

      {/* GitHub-Style Delete Space Modal with Exact Name Confirmation */}
      <DeleteSpaceModal
        isOpen={isDeleteModalOpen}
        spaceId={space.id}
        spaceName={space.name}
        onClose={() => setIsDeleteModalOpen(false)}
        onSpaceDeleted={onSpaceDeleted}
      />
    </div>
  );
};

