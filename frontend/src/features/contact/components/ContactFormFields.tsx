'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  User,
  Mail,
  Phone,
  HelpCircle,
  MessageSquare,
  Send,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContactFormData } from '../types/contactTypes';

const MAX_MESSAGE_LENGTH = 3000;

interface ContactFormFieldsProps {
  formData: ContactFormData;
  fieldErrors: Partial<Record<keyof ContactFormData, string>>;
  isPending: boolean;
  onInputChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
}

export const ContactFormFields: React.FC<ContactFormFieldsProps> = ({
  formData,
  fieldErrors,
  isPending,
  onInputChange,
}) => {
  const t = useTranslations('contact');

  return (
    <>
      {/* Honeypot Spam Trap (Hidden from real users) */}
      <div className="opacity-0 absolute -left-[9999px] pointer-events-none" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="honeypot"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={formData.honeypot}
          onChange={onInputChange}
        />
      </div>

      {/* 1. Name Field */}
      <div>
        <label
          htmlFor="name"
          className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2"
        >
          {t('nameLabel')} <span className="text-emerald-400">*</span>
        </label>
        <div className="relative">
          <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={100}
            placeholder={t('namePlaceholder')}
            value={formData.name}
            onChange={onInputChange}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'name-error' : undefined}
            className={cn(
              'w-full rounded-xl bg-zinc-950/80 border pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 transition-all focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed',
              fieldErrors.name
                ? 'border-red-500/50 focus:ring-red-500/30'
                : 'border-white/10 focus:border-emerald-500/60 focus:ring-emerald-500/20'
            )}
          />
        </div>
        {fieldErrors.name && (
          <p id="name-error" role="alert" className="mt-1.5 text-xs text-red-400">
            {t('errorNameLength')}
          </p>
        )}
      </div>

      {/* 2. Email and Phone Fields (2-Column Grid on sm+) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2"
          >
            {t('emailLabel')} <span className="text-emerald-400">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={150}
              placeholder={t('emailPlaceholder')}
              value={formData.email}
              onChange={onInputChange}
              disabled={isPending}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              className={cn(
                'w-full rounded-xl bg-zinc-950/80 border pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 transition-all focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed',
                fieldErrors.email
                  ? 'border-red-500/50 focus:ring-red-500/30'
                  : 'border-white/10 focus:border-emerald-500/60 focus:ring-emerald-500/20'
              )}
            />
          </div>
          {fieldErrors.email && (
            <p id="email-error" role="alert" className="mt-1.5 text-xs text-red-400">
              {t('errorEmailFormat')}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="phone"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
            >
              {t('phoneLabel')}
            </label>
            <span className="text-[11px] text-zinc-500 font-medium lowercase">
              ({t('optional')})
            </span>
          </div>
          <div className="relative">
            <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="phone"
              name="phone"
              type="tel"
              maxLength={35}
              placeholder={t('phonePlaceholder')}
              value={formData.phone ?? ''}
              onChange={onInputChange}
              disabled={isPending}
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
              className={cn(
                'w-full rounded-xl bg-zinc-950/80 border pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 transition-all focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed',
                fieldErrors.phone
                  ? 'border-red-500/50 focus:ring-red-500/30'
                  : 'border-white/10 focus:border-emerald-500/60 focus:ring-emerald-500/20'
              )}
            />
          </div>
          {fieldErrors.phone && (
            <p id="phone-error" role="alert" className="mt-1.5 text-xs text-red-400">
              {fieldErrors.phone === 'PHONE_TOO_LONG'
                ? t('errorPhoneLength')
                : t('errorPhoneFormat')}
            </p>
          )}
        </div>
      </div>

      {/* 3. Subject Dropdown */}
      <div>
        <label
          htmlFor="subject"
          className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2"
        >
          {t('subjectLabel')} <span className="text-emerald-400">*</span>
        </label>
        <div className="relative">
          <HelpCircle className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={onInputChange}
            disabled={isPending}
            className="w-full rounded-xl bg-zinc-950/80 border border-white/10 pl-10 pr-10 py-3 text-sm text-white transition-all focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="general">{t('subjectGeneral')}</option>
            <option value="sales">{t('subjectSales')}</option>
            <option value="support">{t('subjectSupport')}</option>
            <option value="legal">{t('subjectLegal')}</option>
          </select>
        </div>
      </div>

      {/* 4. Message Field */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="message"
            className="text-xs font-semibold text-zinc-300 uppercase tracking-wider"
          >
            {t('messageLabel')} <span className="text-emerald-400">*</span>
          </label>
          <span className="text-[11px] font-mono text-zinc-500">
            {formData.message.length} / {MAX_MESSAGE_LENGTH}
          </span>
        </div>
        <div className="relative">
          <MessageSquare className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5 pointer-events-none" />
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={t('messagePlaceholder')}
            value={formData.message}
            onChange={onInputChange}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.message)}
            aria-describedby={fieldErrors.message ? 'message-error' : undefined}
            className={cn(
              'w-full rounded-xl bg-zinc-950/80 border pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 transition-all focus:outline-none focus:ring-2 resize-y min-h-32 disabled:opacity-60 disabled:cursor-not-allowed',
              fieldErrors.message
                ? 'border-red-500/50 focus:ring-red-500/30'
                : 'border-white/10 focus:border-emerald-500/60 focus:ring-emerald-500/20'
            )}
          />
        </div>
        {fieldErrors.message && (
          <p id="message-error" role="alert" className="mt-1.5 text-xs text-red-400">
            {t('errorMessageLength')}
          </p>
        )}
      </div>

      {/* 5. Privacy Consent Checkbox */}
      <div className="pt-1">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            required
            checked={formData.consent}
            onChange={onInputChange}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.consent)}
            aria-describedby={fieldErrors.consent ? 'consent-error' : undefined}
            className="mt-0.5 h-4 w-4 rounded-sm border-white/20 bg-zinc-950 text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 cursor-pointer"
          />
          <span className="text-xs text-zinc-400 leading-relaxed select-none group-hover:text-zinc-300 transition-colors">
            {t('consentText')}{' '}
            <Link
              href="/privacy"
              target="_blank"
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors cursor-pointer"
            >
              {t('privacyLink')}
            </Link>
            .
          </span>
        </label>
        {fieldErrors.consent && (
          <p id="consent-error" role="alert" className="mt-1.5 text-xs text-red-400">
            {t('errorConsent')}
          </p>
        )}
      </div>

      {/* 6. Submit Button */}
      <button
        type="submit"
        disabled={isPending || !formData.consent}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-6 py-3.5 text-sm font-bold text-zinc-950 uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-teal-500 hover:shadow-emerald-500/35 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t('sendingButton')}</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>{t('submitButton')}</span>
          </>
        )}
      </button>
    </>
  );
};
