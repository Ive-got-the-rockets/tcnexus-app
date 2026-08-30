import { AccessCheckResult, RegistrationSettings } from './models';

export const DEFAULT_REGISTRATION_SETTINGS: RegistrationSettings = {
  registration: {
    heading: 'Register to continue watching.',
    message: 'Create a free profile with your email to keep watching. We’ll send your login details by email.',
    button_label: 'Create Profile',
  },
  final_free: {
    heading: 'This will be your last free lesson.',
    message: 'Register your email to keep watching free lessons.',
    button_label: 'Create Profile',
  },
  media: { type: 'none', url: '', alt: '' },
};

export function normalizeRegistrationSettings(value: Partial<RegistrationSettings> | null | undefined): RegistrationSettings {
  const source = value ?? {};
  const media = source.media;
  const mediaType = media?.type === 'image' || media?.type === 'video' ? media.type : 'none';
  return {
    registration: { ...DEFAULT_REGISTRATION_SETTINGS.registration, ...(source.registration ?? {}) },
    final_free: { ...DEFAULT_REGISTRATION_SETTINGS.final_free, ...(source.final_free ?? {}) },
    media: {
      type: mediaType,
      url: media?.url?.trim() ?? '',
      alt: media?.alt ?? '',
    },
  };
}

export function isFinalFreeLesson(access: AccessCheckResult, registered: boolean): boolean {
  return (
    registered === false &&
    access.granted === true &&
    access.tier === 'free' &&
    typeof access.free_views_used === 'number' &&
    typeof access.free_limit === 'number' &&
    access.free_views_used === access.free_limit
  );
}
