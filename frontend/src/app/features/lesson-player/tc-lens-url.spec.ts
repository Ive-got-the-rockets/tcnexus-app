import { describe, expect, it } from 'vitest';

import { buildTcLensUrl } from './tc-lens-url';

describe('buildTcLensUrl', () => {
  it('adds the lesson id as videoId', () => {
    expect(buildTcLensUrl('https://app.tradecheetah.com', 123)).toBe(
      'https://app.tradecheetah.com/?videoId=123',
    );
  });

  it('preserves existing query parameters', () => {
    expect(buildTcLensUrl('https://app.tradecheetah.com/?mode=embed', 123)).toBe(
      'https://app.tradecheetah.com/?mode=embed&videoId=123',
    );
  });
});
