'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Loader2, Save } from 'lucide-react';
import type { Space } from '@/lib/types/databaseTypes';
import { triggerHaptic } from '@/lib/utils';
import { updateSpaceAction } from '../actions/spaceActions';
import { buildGuestUrl, getValidGuestLinkOrigin } from '../lib/plaqueConfig';
import { DeleteSpaceModal } from './DeleteSpaceModal';
import { QrPrintModal } from './QrPrintModal';
import { SpaceCredentialsFields } from './space-editor/SpaceCredentialsFields';
import { SpaceDangerZone } from './space-editor/SpaceDangerZone';
import { SpaceGuestLinkBanner } from './space-editor/SpaceGuestLinkBanner';
import {
  createSpaceFormValues,
  toUpdateSpaceInput,
  type SpaceFormField,
  type SpaceFormValues,
} from './space-editor/spaceFormModel';

export interface SpaceEditorProps {
  space: Space;
  onSpaceUpdated: (updatedSpace: Space) => void;
  onSpaceDeleted?: (spaceId: string) => void;
  /** Canonical public origin used for guest links and printed QR codes. */
  canonicalOrigin?: string;
}

export const SpaceEditor: React.FC<SpaceEditorProps> = ({
  space,
  onSpaceUpdated,
  onSpaceDeleted,
  canonicalOrigin = '',
}) => {
  const t = useTranslations('dashboard');

  const [values, setValues] = useState<SpaceFormValues>(() =>
    createSpaceFormValues(space),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWifi, setCopiedWifi] = useState(false);

  const handleFieldChange = <K extends SpaceFormField>(
    field: K,
    value: SpaceFormValues[K],
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  };

  const handleCopyGuestLink = async () => {
    try {
      const browserOrigin =
        typeof window !== 'undefined' ? window.location.origin : '';
      const validOrigin = getValidGuestLinkOrigin(
        canonicalOrigin,
        browserOrigin,
        process.env.NODE_ENV !== 'production',
      );
      if (!validOrigin) {
        setStatusMessage({
          type: 'error',
          text: t('errorServer'),
        });
        return;
      }
      const fullUrl = buildGuestUrl(validOrigin, space.slug);
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      triggerHaptic(50);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleCopyWifiPassword = async () => {
    if (!values.wifiPassword) return;
    try {
      await navigator.clipboard.writeText(values.wifiPassword);
      setCopiedWifi(true);
      triggerHaptic(50);
      setTimeout(() => setCopiedWifi(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) {
      setStatusMessage({ type: 'error', text: t('errorNameRequired') });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const result = await updateSpaceAction(
        toUpdateSpaceInput(space.id, values),
      );

      if (result.success && result.data) {
        onSpaceUpdated(result.data);
        setStatusMessage({ type: 'success', text: t('saveSuccess') });
        triggerHaptic(50);
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || t('errorGeneral'),
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: t('errorServer') });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='flex flex-col gap-6'>
      <SpaceGuestLinkBanner
        slug={space.slug}
        copiedLink={copiedLink}
        onCopyGuestLink={handleCopyGuestLink}
        onOpenPrintModal={() => {
          setIsPrintModalOpen(true);
          triggerHaptic(50);
        }}
      />

      {/* Main Edit Form */}
      <form
        onSubmit={handleSave}
        className='p-5 sm:p-7 rounded-3xl bg-[#121216] border border-white/8 flex flex-col gap-6 shadow-2xl'
      >
        <div className='flex items-center justify-between pb-4 border-b border-white/8'>
          <div>
            <h2 className='font-display text-lg font-bold text-white'>
              {t('credentialsTitle')}
            </h2>
          </div>

          <button
            type='submit'
            disabled={isSaving}
            aria-label={t('saveChanges')}
            className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
          >
            {isSaving ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>{t('saving')}</span>
              </>
            ) : (
              <>
                <Save className='w-4 h-4' />
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
            {statusMessage.type === 'success' && (
              <Check className='w-4 h-4 shrink-0' />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <SpaceCredentialsFields
          values={values}
          onChange={handleFieldChange}
          copiedWifi={copiedWifi}
          onCopyWifiPassword={handleCopyWifiPassword}
        />

        <SpaceDangerZone onRequestDelete={() => setIsDeleteModalOpen(true)} />
      </form>

      {/* GitHub-Style Delete Space Modal with Exact Name Confirmation */}
      {isDeleteModalOpen && (
        <DeleteSpaceModal
          isOpen={isDeleteModalOpen}
          spaceId={space.id}
          spaceName={space.name}
          onClose={() => setIsDeleteModalOpen(false)}
          onSpaceDeleted={onSpaceDeleted}
        />
      )}

      {/* Interactive Physical QR Print Plate Modal */}
      {isPrintModalOpen && (
        <QrPrintModal
          isOpen={isPrintModalOpen}
          space={space}
          canonicalOrigin={canonicalOrigin}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
