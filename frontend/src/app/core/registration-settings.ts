import { AccessCheckResult, CardAnimationSettings, MembershipTierSettings, PaidMembershipSettings, RegistrationCopy, RegistrationMedia, RegistrationSettings } from './models';

export const DEFAULT_CARD_ANIMATION_SETTINGS: CardAnimationSettings = {
  id: 'preset-01',
  name: 'Preset 01',
  open: 0.5,
  switch: 0.5,
  close: 0.5,
};

const DEFAULT_TIERS: [MembershipTierSettings, MembershipTierSettings, MembershipTierSettings] = [
  { visible: true, name: 'Starter', description: 'A focused path into the core library.', monthly_price: 15, button_label: 'Choose Starter', bullets: ['Core free library', 'Weekly market notes', 'Member profile'] },
  { visible: true, name: 'Trader', description: 'The complete learning path for serious traders.', monthly_price: 29, button_label: 'Choose Trader', bullets: ['Everything in Starter', 'All registered lessons', 'Live market sessions'] },
  { visible: true, name: 'Pro Desk', description: 'Premium access for advanced market work.', monthly_price: 79, button_label: 'Choose Pro Desk', bullets: ['Everything in Trader', 'Paid video library', 'Priority member support'] },
];

export const DEFAULT_PAID_MEMBERSHIP_SETTINGS: PaidMembershipSettings = {
  heading: 'Unlock the full library', message: 'Choose the access level that fits the way you trade.', save_percent: 20, currency: '$', close_label: '×', tiers: DEFAULT_TIERS,
};

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
  pricing: DEFAULT_PAID_MEMBERSHIP_SETTINGS,
  animations: { card_carousel: DEFAULT_CARD_ANIMATION_SETTINGS },
};

export function normalizeRegistrationSettings(value: Partial<RegistrationSettings> | null | undefined): RegistrationSettings {
  const source = (value ?? {}) as Partial<RegistrationSettings> & {
    media?: RegistrationMedia;
    registration?: Partial<RegistrationCopy>;
    final_free?: Partial<RegistrationCopy>;
    paid_member?: Partial<RegistrationCopy>;
    pricing?: Partial<PaidMembershipSettings>;
    animations?: { card_carousel?: Partial<CardAnimationSettings> };
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
    pricing: normalizePaidMembershipSettings(source.pricing),
    animations: { card_carousel: normalizeCardAnimationSettings(source.animations?.card_carousel) },
  };
}

export function normalizeCardAnimationSettings(value: Partial<CardAnimationSettings> | null | undefined): CardAnimationSettings {
  const source = value ?? {};
  const duration = (input: unknown, fallback: number): number => {
    const parsed = Number(input);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.round(Math.min(2, Math.max(0.1, parsed)) * 100) / 100;
  };

  return {
    id: String(source.id ?? DEFAULT_CARD_ANIMATION_SETTINGS.id).trim() || DEFAULT_CARD_ANIMATION_SETTINGS.id,
    name: String(source.name ?? DEFAULT_CARD_ANIMATION_SETTINGS.name).trim() || DEFAULT_CARD_ANIMATION_SETTINGS.name,
    open: duration(source.open, DEFAULT_CARD_ANIMATION_SETTINGS.open),
    switch: duration(source.switch, DEFAULT_CARD_ANIMATION_SETTINGS.switch),
    close: duration(source.close, DEFAULT_CARD_ANIMATION_SETTINGS.close),
  };
}

export function normalizePaidMembershipSettings(value: Partial<PaidMembershipSettings> | null | undefined): PaidMembershipSettings {
  const source = value ?? {};
  const savePercent = Math.min(100, Math.max(0, Number(source.save_percent ?? DEFAULT_PAID_MEMBERSHIP_SETTINGS.save_percent) || 0));
  const inputTiers = Array.isArray(source.tiers) ? source.tiers : [];
  const tiers = DEFAULT_TIERS.map((fallback, index) => {
    const tier = (inputTiers[index] ?? {}) as Partial<MembershipTierSettings>;
    const bullets = Array.isArray(tier.bullets) ? tier.bullets.map((bullet) => String(bullet).trim()).filter(Boolean) : [];
    return {
      visible: tier.visible !== false,
      name: String(tier.name ?? fallback.name).trim() || fallback.name,
      description: String(tier.description ?? fallback.description).trim() || fallback.description,
      monthly_price: Math.max(0, Math.round(Number(tier.monthly_price ?? fallback.monthly_price) || 0)),
      button_label: String(tier.button_label ?? fallback.button_label).trim() || fallback.button_label,
      bullets: bullets.length ? bullets : [fallback.bullets[0]],
    };
  }) as [MembershipTierSettings, MembershipTierSettings, MembershipTierSettings];
  return {
    heading: String(source.heading ?? DEFAULT_PAID_MEMBERSHIP_SETTINGS.heading).trim() || DEFAULT_PAID_MEMBERSHIP_SETTINGS.heading,
    message: String(source.message ?? DEFAULT_PAID_MEMBERSHIP_SETTINGS.message).trim() || DEFAULT_PAID_MEMBERSHIP_SETTINGS.message,
    save_percent: savePercent,
    currency: String(source.currency ?? DEFAULT_PAID_MEMBERSHIP_SETTINGS.currency).trim() || '$',
    close_label: String(source.close_label ?? DEFAULT_PAID_MEMBERSHIP_SETTINGS.close_label),
    tiers,
  };
}

export function annualPrice(monthlyPrice: number, savePercent: number): number {
  return Math.round(Math.max(0, monthlyPrice) * (1 - Math.min(100, Math.max(0, savePercent)) / 100));
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
