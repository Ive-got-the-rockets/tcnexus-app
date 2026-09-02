import { describe, expect, it } from 'vitest';
import { annualPrice, DEFAULT_CARD_ANIMATION_SETTINGS, isFinalFreeLesson, isAnonymousFreeLimitReached, normalizeCardAnimationSettings, normalizePaidMembershipSettings, normalizeRegistrationSettings } from './registration-settings';
import { AccessCheckResult } from './models';

describe('isFinalFreeLesson', () => {
  it('identifies an anonymous response at the final free lesson', () => {
    expect(
      isFinalFreeLesson(
        { granted: true, reason: 'ok', tier: 'free', free_limit: 2, free_views_used: 2 },
        false,
      ),
    ).toBe(true);
  });

  it('does not identify registered viewers as final-free warnings', () => {
    expect(
      isFinalFreeLesson(
        { granted: true, reason: 'ok', tier: 'free', free_limit: 2, free_views_used: 2 },
        true,
      ),
    ).toBe(false);
  });

  it('does not warn when the access response has not reached the limit', () => {
    expect(
      isFinalFreeLesson(
        { granted: true, reason: 'ok', tier: 'free', free_limit: 2, free_views_used: 1 },
        false,
      ),
    ).toBe(false);
  });

  it('does not warn when access is not granted', () => {
    expect(
      isFinalFreeLesson(
        { granted: false, reason: 'requires_registration', tier: 'free', free_limit: 2, free_views_used: 2 },
        false,
      ),
    ).toBe(false);
  });

  it('does not warn for non-free tiers', () => {
    expect(
      isFinalFreeLesson(
        { granted: true, reason: 'ok', tier: 'paid', free_limit: 2, free_views_used: 2 },
        false,
      ),
    ).toBe(false);
  });

  it('does not warn when free-lesson counters are missing or non-numeric', () => {
    expect(isFinalFreeLesson({ granted: true, reason: 'ok', tier: 'free' }, false)).toBe(false);
    expect(
      isFinalFreeLesson(
        { granted: true, reason: 'ok', tier: 'free', free_limit: '2', free_views_used: 2 } as unknown as AccessCheckResult,
        false,
      ),
    ).toBe(false);
    expect(
      isFinalFreeLesson(
        { granted: true, reason: 'ok', tier: 'free', free_limit: 2, free_views_used: '2' } as unknown as AccessCheckResult,
        false,
      ),
    ).toBe(false);
  });

  it('warns at the exact threshold even when limit_reached is false', () => {
    expect(
      isFinalFreeLesson(
        {
          granted: true,
          reason: 'ok',
          tier: 'free',
          free_limit: 2,
          free_views_used: 2,
          limit_reached: false,
        },
        false,
      ),
    ).toBe(true);
  });

  it('warns when the free-lesson limit has been exceeded', () => {
    expect(
      isFinalFreeLesson(
        { granted: true, reason: 'ok', tier: 'free', free_limit: 2, free_views_used: 3 },
        false,
      ),
    ).toBe(true);
  });
});

describe('normalizeRegistrationSettings', () => {
  it('provides independent paid-member popup defaults and preserves paid-member copy', () => {
    const settings = normalizeRegistrationSettings({
      paid_member: {
        heading: 'Become a paid member',
        message: 'Unlock every lesson.',
        button_label: 'Join now',
      },
    } as never);

    expect(settings.paid_member.heading).toBe('Become a paid member');
    expect(settings.paid_member.message).toBe('Unlock every lesson.');
    expect(settings.paid_member.button_label).toBe('Join now');
    expect(settings.paid_member.media).toEqual({ type: 'none', url: '', alt: '' });
  });

  it('keeps media settings independent for each popup', () => {
    const settings = normalizeRegistrationSettings({
      registration: { media: { type: 'image', url: 'register.jpg', alt: 'Register' } },
      final_free: { media: { type: 'video', url: 'final.mp4', alt: '' } },
    } as never);

    expect(settings.registration.media).toEqual({ type: 'image', url: 'register.jpg', alt: 'Register' });
    expect(settings.final_free.media).toEqual({ type: 'video', url: 'final.mp4', alt: '' });
  });

  it('uses legacy shared media for both popups when no per-popup media exists', () => {
    const settings = normalizeRegistrationSettings({
      media: { type: 'image', url: 'legacy.jpg', alt: 'Legacy' },
    } as never);

    expect(settings.registration.media).toEqual({ type: 'image', url: 'legacy.jpg', alt: 'Legacy' });
    expect(settings.final_free.media).toEqual({ type: 'image', url: 'legacy.jpg', alt: 'Legacy' });
  });
});

describe('isAnonymousFreeLimitReached', () => {
  it('identifies an anonymous free-tier lesson blocked after the free allowance', () => {
    expect(
      isAnonymousFreeLimitReached(
        { granted: false, reason: 'requires_registration', tier: 'free', free_limit: 2 },
        false,
      ),
    ).toBe(true);
  });

  it('does not identify registered viewers or other registration blocks', () => {
    expect(
      isAnonymousFreeLimitReached(
        { granted: false, reason: 'requires_registration', tier: 'free' },
        true,
      ),
    ).toBe(false);
    expect(
      isAnonymousFreeLimitReached(
        { granted: false, reason: 'requires_registration', tier: 'registered' },
        false,
      ),
    ).toBe(false);
  });
});

describe('paid membership pricing', () => {
  it('provides the three paid tiers by default', () => {
    const settings = normalizePaidMembershipSettings(undefined);
    expect(settings.tiers.map((tier) => tier.name)).toEqual(['Starter', 'Trader', 'Pro Desk']);
    expect(settings.tiers.map((tier) => tier.monthly_price)).toEqual([15, 29, 79]);
  });

  it('normalizes prices, save percentage, and bullet rows', () => {
    const settings = normalizePaidMembershipSettings({
      save_percent: 140,
      tiers: [{ monthly_price: -4, bullets: ['', 'Core access'] }] as never,
    });
    expect(settings.save_percent).toBe(100);
    expect(settings.tiers[0].monthly_price).toBe(0);
    expect(settings.tiers[0].bullets).toEqual(['Core access']);
    expect(settings.tiers[1].bullets.length).toBeGreaterThan(0);
  });

  it('preserves tier visibility while keeping omitted visibility enabled', () => {
    const settings = normalizePaidMembershipSettings({
      tiers: [{ visible: false }, {}] as never,
    });

    expect(settings.tiers[0].visible).toBe(false);
    expect(settings.tiers[1].visible).toBe(true);
  });

  it('calculates annual monthly-equivalent prices from the save percentage', () => {
    expect(annualPrice(15, 20)).toBe(12);
    expect(annualPrice(29, 20)).toBe(23);
  });
});

describe('card carousel animation settings', () => {
  it('provides Preset 01 defaults', () => {
    expect(normalizeCardAnimationSettings(undefined)).toEqual(DEFAULT_CARD_ANIMATION_SETTINGS);
  });

  it('clamps invalid durations to the supported range', () => {
    const settings = normalizeCardAnimationSettings({ open: 0, switch: 4, close: 'bad' } as never);

    expect(settings.open).toBe(0.1);
    expect(settings.switch).toBe(2);
    expect(settings.close).toBe(0.35);
  });

  it('preserves a named active preset', () => {
    const settings = normalizeCardAnimationSettings({ id: 'custom-1', name: 'Gentle', open: 0.75, switch: 0.4, close: 0.55 });

    expect(settings).toEqual({ id: 'custom-1', name: 'Gentle', open: 0.75, switch: 0.4, close: 0.55 });
  });
});
