'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Sparkles, Home, MapPin, Wifi, Phone, ShieldAlert, KeyRound, Loader2 } from 'lucide-react';
import type { Space } from '@/lib/types/databaseTypes';
import { createSpaceAction } from '../actions/spaceActions';
import { QuietHoursControl } from './QuietHoursControl';

export interface SpaceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpaceCreated: (space: Space) => void;
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

export const SpaceCreateModal: React.FC<SpaceCreateModalProps> = ({
  isOpen,
  onClose,
  onSpaceCreated,
}) => {
  const t = useTranslations('dashboard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [taxiAddress, setTaxiAddress] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [taxiPhone, setTaxiPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [emergencyNumber, setEmergencyNumber] = useState('112');

  // Quiet Hours State with Toggles
  const [hasNightSilence, setHasNightSilence] = useState(true);
  const [nightSilenceStart, setNightSilenceStart] = useState('23:00');
  const [nightSilenceEnd, setNightSilenceEnd] = useState('08:00');
  const [hasAfternoonRest, setHasAfternoonRest] = useState(false);
  const [afternoonRestStart, setAfternoonRestStart] = useState('14:30');
  const [afternoonRestEnd, setAfternoonRestEnd] = useState('17:30');

  // Check-in & Check-out Dropdowns
  const [checkInTime, setCheckInTime] = useState('15:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [keyboxCode, setKeyboxCode] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setTaxiAddress('');
    setWifiSsid('');
    setWifiPassword('');
    setTaxiPhone('');
    setWhatsappPhone('');
    setEmergencyNumber('112');
    setHasNightSilence(true);
    setNightSilenceStart('23:00');
    setNightSilenceEnd('08:00');
    setHasAfternoonRest(false);
    setAfternoonRestStart('14:30');
    setAfternoonRestEnd('17:30');
    setCheckInTime('15:00');
    setCheckOutTime('11:00');
    setKeyboxCode('');
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage(t('errorNameRequired'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await createSpaceAction({
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
        resetForm();
        onSpaceCreated(result.data);
        onClose();
      } else {
        setErrorMessage(result.error || t('errorGeneral'));
      }
    } catch {
      setErrorMessage(t('errorServer'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('createModalAria')}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-3xl bg-[#121216] border border-white/10 shadow-2xl shadow-black/80 overflow-hidden text-zinc-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 bg-zinc-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                {t('createModalTitle')}
              </h2>
              <p className="text-xs text-zinc-400">
                {t('createModalSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t('cancel')}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
              {errorMessage}
            </div>
          )}

          {/* 1. Име на обекта (Задължително) */}
          <div className="flex flex-col gap-2">
            <label htmlFor="modal-name" className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Home className="w-4 h-4" />
              <span>{t('stepNameTitle')}</span>
            </label>
            <input
              id="modal-name"
              type="text"
              required
              placeholder={t('stepNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium transition-colors"
            />
            <span className="text-[11px] text-zinc-500">
              {t('stepNameDesc')}
            </span>
          </div>

          {/* 2. Точен адрес (Веднага под името) */}
          <div className="flex flex-col gap-2">
            <label htmlFor="modal-address" className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>{t('stepAddressTitle')}</span>
            </label>
            <input
              id="modal-address"
              type="text"
              placeholder={t('stepAddressPlaceholder')}
              value={taxiAddress}
              onChange={(e) => setTaxiAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
            />
            <span className="text-[11px] text-zinc-500">
              {t('stepAddressDesc')}
            </span>
          </div>

          {/* 3. Wi-Fi Данни */}
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span>{t('stepWifiTitle')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-zinc-400">{t('wifiSsidLabel')}</span>
                <input
                  type="text"
                  placeholder={t('wifiSsidPlaceholder')}
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-zinc-400">{t('wifiPasswordLabel')}</span>
                <input
                  type="text"
                  placeholder={t('wifiPasswordPlaceholder')}
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Телефон за местно такси */}
          <div className="flex flex-col gap-2">
            <label htmlFor="modal-taxi-phone" className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>{t('stepTaxiTitle')}</span>
            </label>
            <input
              id="modal-taxi-phone"
              type="tel"
              placeholder={t('stepTaxiPlaceholder')}
              value={taxiPhone}
              onChange={(e) => setTaxiPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
            />
          </div>

          {/* 5. Контакти & WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal-whatsapp" className="text-xs text-zinc-400">
                {t('whatsappLabel')}
              </label>
              <input
                id="modal-whatsapp"
                type="tel"
                placeholder={t('whatsappPlaceholder')}
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal-emergency" className="text-xs text-zinc-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span>{t('emergencyLabel')}</span>
              </label>
              <input
                id="modal-emergency"
                type="text"
                value={emergencyNumber}
                onChange={(e) => setEmergencyNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500 text-sm font-mono"
              />
            </div>
          </div>

          {/* 6. Часове за тишина (Нов компонент с Toggle бутони и падащи менюта) */}
          <QuietHoursControl
            idPrefix="create"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal-checkin" className="text-xs text-zinc-400">
                {t('checkInLabel')}
              </label>
              <select
                id="modal-checkin"
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
              <label htmlFor="modal-checkout" className="text-xs text-zinc-400">
                {t('checkOutLabel')}
              </label>
              <select
                id="modal-checkout"
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
              <label htmlFor="modal-keybox" className="text-xs text-zinc-400 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('keyboxLabel')}</span>
              </label>
              <input
                id="modal-keybox"
                type="text"
                placeholder={t('keyboxPlaceholder')}
                value={keyboxCode}
                onChange={(e) => setKeyboxCode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/8 sticky bottom-0 bg-zinc-950/60 pb-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors disabled:cursor-not-allowed cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('creating')}</span>
                </>
              ) : (
                <span>{t('createSpace')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
