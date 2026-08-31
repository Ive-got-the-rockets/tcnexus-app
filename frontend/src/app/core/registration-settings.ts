import { AccessCheckResult, RegistrationCopy, RegistrationMedia, RegistrationSettings } from './models';

export const DEFAULT_REGISTRATION_SETTINGS: RegistrationSettings = {
  registration: {
    heading: 'Register to continue watching.',
    message: 'Create a free profile with your email to keep watching. We’ll send your login details by email.',
    button_label: 'Create Profile',
    media: { type: 'none', url: '', alt: '' },
  },
  final_free: {
    heading: 'This will be your last free lesson.',
    message: 'Register your email to keep watching free lessons.',
    button_label: 'Create Profile',
    media: { type: 'none', url: '', alt: '' },
  },
  paid_member: {
    heading: 'Become a paid member',
    message: 'Become a paid member to access locked content and more.',
    button_label: 'Become a Paid Member',
    media: { type: 'none', url: '', alt: '' },
  },
};

export function normalizeRegistrationSettings(value: Partial<RegistrationSettings> | null | undefined): RegistrationSettings {
  const source = (value ?? {}) as Partial<RegistrationSettings> & {
    media?: RegistrationMedia;
    registration?: Partial<RegistrationCopy>;
    final_free?: Partial<RegistrationCopy>;
    paid_member?: Partial<RegistrationCopy>;
  };
  const legacyMedia = normalizeMedia(source.media);
  const normalizeCopy = (copy: Partial<RegistrationCopy> | undefined, fallback: RegistrationCopy): RegistrationCopy => ({
    ...fallback,
    ...(copy ?? {}),
    media: normalizeMedia(copy?.media ?? legacyMedia),
  });
  return {
    registration: normalizeCopy(source.registration, DEFAULT_REGISTRATION_SETTINGS.registration),
    final_free: normalizeCopy(source.final_free, DEFAULT_REGISTRATION_SETTINGS.final_free),
    paid_member: normalizeCopy(source.paid_member, DEFAULT_REGISTRATION_SETTINGS.paid_member),
  };
}

function normalizeMedia(media: RegistrationMedia | undefined): RegistrationMedia {
  const mediaType = media?.type === 'image' || media?.type === 'video' ? media.type : 'none';
  const url = media?.url?.trim() ?? '';
  return { type: url ? mediaType : 'none', url: url, alt: media?.alt ?? '' };
}

export function isFinalFreeLesson(access: AccessCheckResult, registered: boolean): boolean {
  return (
    registered === false &&
    access.granted === true &&
    access.tier === 'free' &&
    typeof access.free_views_used === 'number' &&
    typeof access.free_limit === 'number' &&
    access.free_views_used >= access.free_limit
  );
}

export function isAnonymousFreeLimitReached(access: AccessCheckResult, registered: boolean): boolean {
  return registered === false && access.granted === false && access.reason === 'requires_registration' && access.tier === 'free';
}
