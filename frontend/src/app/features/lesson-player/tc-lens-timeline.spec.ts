import { describe, expect, it } from 'vitest';
import type { TcLensTimelineEvent } from '../../core/models';
import { buildTcLensTimelineMessage, getDueTimelineEvents } from './tc-lens-timeline';

const event = (overrides: Partial<TcLensTimelineEvent> = {}): TcLensTimelineEvent => ({
  id: 'llm-1',
  messageType: 'llm',
  message: 'Explain the market move.',
  startTime: 120,
  endTime: null,
  ...overrides,
});

describe('getDueTimelineEvents', () => {
  it('dispatches a row when playback crosses its exact start boundary', () => {
    expect(getDueTimelineEvents([event()], 119, 120, new Set())).toEqual([event()]);
  });

  it('does not dispatch an event already present in sentIds', () => {
    expect(getDueTimelineEvents([event()], 119, 120, new Set(['llm-1']))).toEqual([]);
  });

  it('returns simultaneous LLM and trade rows independently', () => {
    const trade = event({ id: 'trade-1', messageType: 'trade', message: 'Calculate the trade.' });
    expect(getDueTimelineEvents([event(), trade], 119, 120, new Set())).toEqual([event(), trade]);
  });

  it('retains the configured range on the returned event', () => {
    const ranged = event({ startTime: 30, endTime: 90 });
    expect(getDueTimelineEvents([ranged], 29, 30, new Set())).toEqual([ranged]);
  });

  it('does not re-dispatch on a backward seek or clear sentIds', () => {
    const sentIds = new Set(['llm-1']);
    expect(getDueTimelineEvents([event()], 121, 60, sentIds)).toEqual([]);
    expect(sentIds).toEqual(new Set(['llm-1']));
  });
});

describe('buildTcLensTimelineMessage', () => {
  it('builds the exact Arun TC Lens timeline payload', () => {
    expect(buildTcLensTimelineMessage(35, event({ id: 'trade-1', messageType: 'trade', startTime: 120, endTime: 180 }))).toEqual({
      type: 'tc-lens-timeline-event',
      videoId: '35',
      messageType: 'trade',
      message: 'Explain the market move.',
      startTime: 120,
      endTime: 180,
      eventId: 'trade-1',
    });
  });
});
