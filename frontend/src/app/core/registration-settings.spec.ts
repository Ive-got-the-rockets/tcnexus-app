import { describe, expect, it } from 'vitest';
import { isFinalFreeLesson } from './registration-settings';

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
        { granted: false, reason: 'limit_reached', tier: 'free', free_limit: 2, free_views_used: 2 },
        false,
      ),
    ).toBe(false);
  });

  it('does not warn for non-free tiers', () => {
    expect(
      isFinalFreeLesson(
        { granted: true, reason: 'ok', tier: 'premium', free_limit: 2, free_views_used: 2 },
        false,
      ),
    ).toBe(false);
  });

  it('does not warn when free-lesson counters are missing or non-numeric', () => {
    expect(isFinalFreeLesson({ granted: true, reason: 'ok', tier: 'free' }, false)).toBe(false);
    expect(
      isFinalFreeLesson(
        { granted: true, reason: 'ok', tier: 'free', free_limit: '2', free_views_used: 2 },
        false,
      ),
    ).toBe(false);
    expect(
      isFinalFreeLesson(
        { granted: true, reason: 'ok', tier: 'free', free_limit: 2, free_views_used: '2' },
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
