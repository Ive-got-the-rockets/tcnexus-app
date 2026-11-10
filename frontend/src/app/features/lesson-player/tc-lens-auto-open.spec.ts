import { describe, expect, it } from 'vitest';
import { TcLensAutoOpen } from './tc-lens-auto-open';
import type { TcLensTimelineEvent } from '../../core/models';

const cue: TcLensTimelineEvent = {
  id: 'first', messageType: 'llm', startTime: 30, endTime: null,
  data: { question: 'Explain', sceneContext: '', learningLevel: 'beginner' },
};
describe('TC Lens automatic opening', () => {
  it('opens when playback crosses a cue, once, then permits the next cue', () => {
    const auto = new TcLensAutoOpen();
    const events = [cue, { ...cue, id: 'next', startTime: 60 }];
    expect(auto.advance(events, 29)).toBeNull();
    expect(auto.advance(events, 30.25)).toBe(29);
    expect(auto.advance(events, 31)).toBeNull();
    auto.seek(20);
    expect(auto.advance(events, 31)).toBeNull();
    expect(auto.advance(events, 60.1)).toBe(31);
  });
  it('does not open skipped cues on seek or resume, and resets per lesson', () => {
    const auto = new TcLensAutoOpen();
    auto.seek(100);
    expect(auto.advance([cue], 101)).toBeNull();
    auto.reset(100);
    expect(auto.advance([cue], 101)).toBeNull();
    auto.reset();
    expect(auto.advance([cue], 30.1)).toBe(-1);
  });
  it('supports cues at zero and ignores backward updates', () => {
    const auto = new TcLensAutoOpen();
    expect(auto.advance([{ ...cue, id: 'zero', startTime: 0 }], 0.1)).toBe(-1);
    expect(auto.advance([cue], 0)).toBeNull();
    expect(auto.advance([cue], 30)).toBe(0);
  });
});
