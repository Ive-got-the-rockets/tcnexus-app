import { describe, expect, it } from 'vitest';
import { nextFeaturedIndex } from './featured-pagination';

describe('nextFeaturedIndex', () => {
  it('shifts one position toward a clicked lower marker', () => {
    expect(nextFeaturedIndex(4, 5, 1)).toBe(0);
  });

  it('shifts one position toward a clicked upper marker', () => {
    expect(nextFeaturedIndex(0, 5, -1)).toBe(4);
  });

  it('does not move when the active marker is clicked', () => {
    expect(nextFeaturedIndex(2, 5, 0)).toBe(2);
  });
});
