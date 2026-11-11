import { describe, it, expect } from 'vitest';
import { buildEmbedPrompt } from './tc-lens-embed-protocol';
import type { TcLensTradeCue } from '../../core/models';

describe('repeatable stock trade prompts', () => {
  it('carries every stock and option leg in the existing text message envelope', () => {
    const event: TcLensTradeCue = {
      id: 'stock-test', messageType: 'trade', startTime: 30, endTime: null,
      data: {
        underlying: 'AAPL', assetType: 'stock',
        stockLegs: [{ quantity: 100, entryPrice: 258.11 }, { quantity: 50, entryPrice: 260.5 }],
        quantity: 100, entryPrice: 258.11, strategy: '', strikes: [], expiration: null,
        legs: [{ side: 'put', action: 'sell_to_open', quantity: 2, strike: 250, expiration: '2026-11-20', entryPrice: 4.2 }],
        assumptions: 'Explain the position.',
      },
    };
    const prompt = buildEmbedPrompt(35, 'cue-1', event)!;
    expect(prompt.type).toBe('tc-lens-time-update');
    expect(prompt.workflow).toBe('operate');
    expect(prompt.videoId).toBe('35');
    expect(prompt.chapter).toBe('cue-1');
    expect(JSON.parse(prompt.message.split('Trade context:\n')[1])).toEqual(event.data);
    expect(prompt).not.toHaveProperty('data');
  });
});
