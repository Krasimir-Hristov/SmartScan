import type { Space, StaySettings } from '@/lib/types/databaseTypes';
import type { UpdateSpaceInput } from '../../types/dashboardTypes';

/** Editable values of the space credentials form. */
export interface SpaceFormValues {
  name: string;
  taxiAddress: string;
  wifiSsid: string;
  wifiPassword: string;
  taxiPhone: string;
  whatsappPhone: string;
  emergencyNumber: string;
  hasNightSilence: boolean;
  nightSilenceStart: string;
  nightSilenceEnd: string;
  hasAfternoonRest: boolean;
  afternoonRestStart: string;
  afternoonRestEnd: string;
  checkInTime: string;
  checkOutTime: string;
  keyboxCode: string;
}

/** Any key of the form state — used by the generic change handler. */
export type SpaceFormField = keyof SpaceFormValues;

/** Builds the initial form state from a space row (pure, no side effects). */
export const createSpaceFormValues = (space: Space): SpaceFormValues => {
  const settings = (space.stay_settings || {}) as StaySettings;

  return {
    name: space.name,
    taxiAddress: settings.taxiAddress || '',
    wifiSsid: settings.wifiSsid || '',
    wifiPassword: settings.wifiPassword || '',
    taxiPhone: settings.taxiPhone || '',
    whatsappPhone: settings.whatsappPhone || '',
    emergencyNumber: settings.emergencyNumber || '112',
    hasNightSilence: Boolean(
      settings.nightSilenceStart && settings.nightSilenceEnd,
    ),
    nightSilenceStart: settings.nightSilenceStart || '23:00',
    nightSilenceEnd: settings.nightSilenceEnd || '08:00',
    hasAfternoonRest: Boolean(
      settings.afternoonRestStart && settings.afternoonRestEnd,
    ),
    afternoonRestStart: settings.afternoonRestStart || '14:30',
    afternoonRestEnd: settings.afternoonRestEnd || '17:30',
    checkInTime: settings.checkInTime || '15:00',
    checkOutTime: settings.checkOutTime || '11:00',
    keyboxCode: settings.keyboxCode || '',
  };
};

/** Maps the form state onto the update action payload (pure). */
export const toUpdateSpaceInput = (
  spaceId: string,
  values: SpaceFormValues,
): UpdateSpaceInput => ({
  id: spaceId,
  name: values.name.trim(),
  taxiAddress: values.taxiAddress.trim() || undefined,
  wifiSsid: values.wifiSsid.trim() || undefined,
  wifiPassword: values.wifiPassword.trim() || undefined,
  taxiPhone: values.taxiPhone.trim() || undefined,
  whatsappPhone: values.whatsappPhone.trim() || undefined,
  emergencyNumber: values.emergencyNumber.trim() || '112',
  nightSilenceStart: values.hasNightSilence ? values.nightSilenceStart : '',
  nightSilenceEnd: values.hasNightSilence ? values.nightSilenceEnd : '',
  afternoonRestStart: values.hasAfternoonRest ? values.afternoonRestStart : '',
  afternoonRestEnd: values.hasAfternoonRest ? values.afternoonRestEnd : '',
  checkInTime: values.checkInTime || '15:00',
  checkOutTime: values.checkOutTime || '11:00',
  keyboxCode: values.keyboxCode.trim() || undefined,
});
