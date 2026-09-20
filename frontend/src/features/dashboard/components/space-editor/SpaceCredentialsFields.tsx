'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Home, KeyRound, MapPin, Phone, ShieldAlert } from 'lucide-react';
import { QuietHoursControl } from '../QuietHoursControl';
import { WifiCredentialsBlock } from './WifiCredentialsBlock';
import { PLAQUE_NAME_MAX_LENGTH } from '../../lib/plaqueName';
import type {
  SpaceFormField,
  SpaceFormValues,
} from './spaceFormModel';

export interface SpaceCredentialsFieldsProps {
  values: SpaceFormValues;
  onChange: <K extends SpaceFormField>(
    field: K,
    value: SpaceFormValues[K],
  ) => void;
  copiedWifi: boolean;
  onCopyWifiPassword: () => void;
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

/** Everything the host can edit about a space, in the dashboard's fixed order. */
export const SpaceCredentialsFields: React.FC<SpaceCredentialsFieldsProps> = ({
  values,
  onChange,
  copiedWifi,
  onCopyWifiPassword,
}) => {
  const t = useTranslations('dashboard');

  return (
    <>
      {/* 1. Име на обекта (Задължително) */}
      <div className='flex flex-col gap-2'>
        <label
          htmlFor='edit-name'
          className='text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5'
        >
          <Home className='w-4 h-4' />
          <span>{t('propertyNameLabel')}</span>
        </label>
        <input
          id='edit-name'
          type='text'
          required
          maxLength={PLAQUE_NAME_MAX_LENGTH}
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          className='w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white font-display text-base font-semibold focus:outline-none focus:border-emerald-500 transition-colors'
        />
      </div>

      {/* 2. Точен адрес (Веднага под името!) */}
      <div className='flex flex-col gap-2'>
        <label
          htmlFor='edit-address'
          className='text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5'
        >
          <MapPin className='w-4 h-4 text-emerald-400' />
          <span>{t('exactAddressLabel')}</span>
        </label>
        <input
          id='edit-address'
          type='text'
          placeholder={t('stepAddressPlaceholder')}
          value={values.taxiAddress}
          onChange={(e) => onChange('taxiAddress', e.target.value)}
          className='w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors'
        />
        <span className='text-[11px] text-zinc-500'>
          {t('stepAddressDesc')}
        </span>
      </div>

      {/* 3. Wi-Fi Данни (С бутон за бързо копиране) */}
      <WifiCredentialsBlock
        ssid={values.wifiSsid}
        password={values.wifiPassword}
        copied={copiedWifi}
        onSsidChange={(value) => onChange('wifiSsid', value)}
        onPasswordChange={(value) => onChange('wifiPassword', value)}
        onCopyPassword={onCopyWifiPassword}
      />

      {/* 4. Телефон за местно такси */}
      <div className='flex flex-col gap-2'>
        <label
          htmlFor='edit-taxi-phone'
          className='text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5'
        >
          <Phone className='w-4 h-4 text-emerald-400' />
          <span>{t('stepTaxiTitle')}</span>
        </label>
        <input
          id='edit-taxi-phone'
          type='tel'
          placeholder={t('stepTaxiPlaceholder')}
          value={values.taxiPhone}
          onChange={(e) => onChange('taxiPhone', e.target.value)}
          className='w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500'
        />
      </div>

      {/* 5. Контакти & WhatsApp & Спешен номер */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
        <div className='flex flex-col gap-1.5'>
          <label htmlFor='edit-whatsapp' className='text-xs text-zinc-400'>
            {t('whatsappLabel')}
          </label>
          <input
            id='edit-whatsapp'
            type='tel'
            placeholder={t('whatsappPlaceholder')}
            value={values.whatsappPhone}
            onChange={(e) => onChange('whatsappPhone', e.target.value)}
            className='w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500'
          />
        </div>
        <div className='flex flex-col gap-1.5'>
          <label
            htmlFor='edit-emergency'
            className='text-xs text-zinc-400 flex items-center gap-1'
          >
            <ShieldAlert className='w-3.5 h-3.5 text-red-400' />
            <span>{t('emergencyLabel')}</span>
          </label>
          <input
            id='edit-emergency'
            type='text'
            value={values.emergencyNumber}
            onChange={(e) => onChange('emergencyNumber', e.target.value)}
            className='w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-emerald-500'
          />
        </div>
      </div>
      {/* 6. Часове за тишина (Toggle бутони и падащи менюта) */}
      <QuietHoursControl
        idPrefix='editor'
        nightSilenceStart={values.nightSilenceStart}
        nightSilenceEnd={values.nightSilenceEnd}
        hasNightSilence={values.hasNightSilence}
        onToggleNightSilence={(active) => onChange('hasNightSilence', active)}
        onChangeNightStart={(val) => onChange('nightSilenceStart', val)}
        onChangeNightEnd={(val) => onChange('nightSilenceEnd', val)}
        afternoonRestStart={values.afternoonRestStart}
        afternoonRestEnd={values.afternoonRestEnd}
        hasAfternoonRest={values.hasAfternoonRest}
        onToggleAfternoonRest={(active) =>
          onChange('hasAfternoonRest', active)
        }
        onChangeAfternoonStart={(val) => onChange('afternoonRestStart', val)}
        onChangeAfternoonEnd={(val) => onChange('afternoonRestEnd', val)}
      />

      {/* 7. Настаняване & Сейф за ключ */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3.5'>
        <div className='flex flex-col gap-1.5'>
          <label htmlFor='edit-checkin' className='text-xs text-zinc-400'>
            {t('checkInLabel')}
          </label>
          <select
            id='edit-checkin'
            value={values.checkInTime}
            onChange={(e) => onChange('checkInTime', e.target.value)}
            className='w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 cursor-pointer'
          >
            {CHECKIN_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <div className='flex flex-col gap-1.5'>
          <label htmlFor='edit-checkout' className='text-xs text-zinc-400'>
            {t('checkOutLabel')}
          </label>
          <select
            id='edit-checkout'
            value={values.checkOutTime}
            onChange={(e) => onChange('checkOutTime', e.target.value)}
            className='w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 cursor-pointer'
          >
            {CHECKOUT_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <div className='flex flex-col gap-1.5'>
          <label
            htmlFor='edit-keybox'
            className='text-xs text-zinc-400 flex items-center gap-1'
          >
            <KeyRound className='w-3.5 h-3.5 text-emerald-400' />
            <span>{t('keyboxLabel')}</span>
          </label>
          <input
            id='edit-keybox'
            type='text'
            placeholder={t('keyboxPlaceholder')}
            value={values.keyboxCode}
            onChange={(e) => onChange('keyboxCode', e.target.value)}
            className='w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm'
          />
        </div>
      </div>
    </>
  );
};
