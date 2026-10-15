'use client';

import React, { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { sendContactAction } from '../actions/sendContactAction';
import type { ContactFormData } from '../types/contactTypes';
import { ContactSuccessState } from './ContactSuccessState';
import { ContactFormFields } from './ContactFormFields';

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
        <ContactFormFields
          formData={formData}
          fieldErrors={fieldErrors}
          isPending={isPending}
          onInputChange={handleInputChange}
        />
      </form>
    </div>
  );
};
