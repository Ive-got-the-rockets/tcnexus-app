import { describe, expect, it } from 'vitest';
import { isFinalFreeLesson, normalizeRegistrationSettings } from './registration-settings';
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

  it('does not warn after the free-lesson limit has been exceeded', () => {
    expect(
      isFinalFreeLesson(
        { granted: true, reason: 'ok', tier: 'free', free_limit: 2, free_views_used: 3 },
        false,
      ),
    ).toBe(false);
  });
});

describe('normalizeRegistrationSettings', () => {
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
