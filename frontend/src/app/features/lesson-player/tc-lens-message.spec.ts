import { describe, expect, it } from 'vitest';
import { buildTcLensMessage } from './tc-lens-message';

describe('buildTcLensMessage', () => {
  it('builds Arun’s TC Lens payload without a timestamp', () => {
    expect(buildTcLensMessage(35, 'Make the market great again')).toEqual({
      type: 'tc-lens-time-update',
      videoId: '35',
      message: 'Make the market great again',
    });
  });
});
