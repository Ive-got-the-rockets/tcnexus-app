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
});
