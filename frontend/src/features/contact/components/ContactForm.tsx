'use client';

import React, { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  User,
  Mail,
  Phone,
  HelpCircle,
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { sendContactAction } from '../actions/sendContactAction';
import type { ContactFormData } from '../types/contactTypes';
import { ContactSuccessState } from './ContactSuccessState';

const MAX_MESSAGE_LENGTH = 3000;

export const ContactForm: React.FC = () => {
  const t = useTranslations('contact');
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: 'general',
    message: '',
    honeypot: '',
    consent: false,
  });

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ContactFormData, string>>
  >({});

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setFormData((prev) => ({
      ...prev,
      [name]: checked !== undefined ? checked : value,
    }));

    if (fieldErrors[name as keyof ContactFormData]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      try {
        const result = await sendContactAction(formData);

        if (result.success) {
          setFormSubmitted(true);
        } else {
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
          }
          if (result.error === 'RATE_LIMIT') {
            setErrorMessage(t('errorRateLimit'));
          } else if (result.error === 'VALIDATION_FAILED') {
            setErrorMessage(t('errorValidation'));
          } else {
            setErrorMessage(t('errorGeneric'));
          }
        }
      } catch {
        setErrorMessage(t('errorGeneric'));
      }
    });
  };

  const handleResetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: 'general',
      message: '',
      honeypot: '',
      consent: false,
    });
    setFormSubmitted(false);
    setErrorMessage(null);
    setFieldErrors({});
  };

  if (formSubmitted) {
    return <ContactSuccessState onReset={handleResetForm} />;
  }

  return (
    <div className="w-full max-w-xl mx-auto rounded-3xl bg-zinc-900/60 border border-white/10 p-6 sm:p-10 backdrop-blur-xl shadow-2xl shadow-black/60 relative">
      {/* Top Emerald Ambient Gradient Border */}
      <div
        className="absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-emerald-500/50 to-transparent"
        aria-hidden="true"
      />

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-sm"
        >
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="leading-snug">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
            onChange={handleInputChange}
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
              onChange={handleInputChange}
              disabled={isPending}
              className={cn(
                'w-full rounded-xl bg-zinc-950/80 border pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 transition-all focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed',
                fieldErrors.name
                  ? 'border-red-500/50 focus:ring-red-500/30'
                  : 'border-white/10 focus:border-emerald-500/60 focus:ring-emerald-500/20'
              )}
            />
          </div>
          {fieldErrors.name && (
            <p className="mt-1.5 text-xs text-red-400">{t('errorNameLength')}</p>
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
                onChange={handleInputChange}
                disabled={isPending}
                className={cn(
                  'w-full rounded-xl bg-zinc-950/80 border pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 transition-all focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed',
                  fieldErrors.email
                    ? 'border-red-500/50 focus:ring-red-500/30'
                    : 'border-white/10 focus:border-emerald-500/60 focus:ring-emerald-500/20'
                )}
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-red-400">{t('errorEmailFormat')}</p>
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
                onChange={handleInputChange}
                disabled={isPending}
                className={cn(
                  'w-full rounded-xl bg-zinc-950/80 border pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 transition-all focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed',
                  fieldErrors.phone
                    ? 'border-red-500/50 focus:ring-red-500/30'
                    : 'border-white/10 focus:border-emerald-500/60 focus:ring-emerald-500/20'
                )}
              />
            </div>
            {fieldErrors.phone && (
              <p className="mt-1.5 text-xs text-red-400">{fieldErrors.phone}</p>
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
              onChange={handleInputChange}
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
              onChange={handleInputChange}
              disabled={isPending}
              className={cn(
                'w-full rounded-xl bg-zinc-950/80 border pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 transition-all focus:outline-none focus:ring-2 resize-y min-h-32 disabled:opacity-60 disabled:cursor-not-allowed',
                fieldErrors.message
                  ? 'border-red-500/50 focus:ring-red-500/30'
                  : 'border-white/10 focus:border-emerald-500/60 focus:ring-emerald-500/20'
              )}
            />
          </div>
          {fieldErrors.message && (
            <p className="mt-1.5 text-xs text-red-400">{t('errorMessageLength')}</p>
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
              onChange={handleInputChange}
              disabled={isPending}
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
            <p className="mt-1.5 text-xs text-red-400">{t('errorConsent')}</p>
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
      </form>
    </div>
  );
};
