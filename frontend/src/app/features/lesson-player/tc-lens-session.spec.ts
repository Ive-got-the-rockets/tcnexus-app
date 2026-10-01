import { describe, expect, it } from 'vitest';
import type { TcLensTimelineEvent } from '../../core/models';
import { TcLensSessionEngine } from './tc-lens-session';

const trade = (id: string, startTime: number, endTime: number | null = null): TcLensTimelineEvent => ({
  id,
  messageType: 'trade',
  startTime,
  endTime,
  data: {
    underlying: 'SPY',
    strategy: 'Long Call',
    legs: [],
    strikes: [],
    expiration: null,
    quantity: 1,
    entryPrice: 3,
    assumptions: '',
  },
});

const llm = (id: string, startTime: number): TcLensTimelineEvent => ({
  id,
  messageType: 'llm',
  startTime,
  endTime: null,
  data: {
    question: `Question ${id}`,
    sceneContext: 'Scene context',
    learningLevel: 'beginner',
  },
});

describe('TcLensSessionEngine', () => {
  it('emits later cues once while the session is open', () => {
    const engine = new TcLensSessionEngine(35, [trade('trade-1', 120), llm('llm-1', 150)], () => 'session-1');

    engine.open(100);
    expect(engine.advance(100, 120).map((message) => message.type)).toEqual(['tc-lens-trade-cue']);
    expect(engine.advance(120, 150).map((message) => message.type)).toEqual(['tc-lens-llm-cue']);
    expect(engine.advance(150, 180)).toEqual([]);
    expect(engine.advance(150, 180)).toEqual([]);
  });

  it('does not replay missed LLM answers when a session opens late', () => {
    const engine = new TcLensSessionEngine(35, [trade('trade-1', 120), llm('llm-1', 150)], () => 'session-1');

    const messages = engine.open(160);

    expect(messages.map((message) => message.type)).toEqual(['tc-lens-session-start', 'tc-lens-state-sync']);
    expect(messages[1]).toMatchObject({ activeTradeCues: [expect.any(Object)] });
  });

  it('returns current active trade state for a late session open', () => {
    const engine = new TcLensSessionEngine(35, [trade('trade-1', 120, 180), trade('trade-2', 200)], () => 'session-1');

    const messages = engine.open(160);

    expect(messages[1]).toMatchObject({ activeTradeCues: [expect.objectContaining({ strategy: 'Long Call' })] });
  });

  it('does not duplicate cues after a backward then forward seek', () => {
    const engine = new TcLensSessionEngine(35, [llm('llm-1', 150)], () => 'session-1');

    engine.open(100);
    expect(engine.advance(100, 160).map((message) => message.type)).toEqual(['tc-lens-llm-cue']);
    expect(engine.seek(110).map((message) => message.type)).toEqual(['tc-lens-seek', 'tc-lens-state-sync']);
    expect(engine.advance(110, 160)).toEqual([]);
  });

  it('stops emitting cues after session close', () => {
    const engine = new TcLensSessionEngine(35, [llm('llm-1', 150)], () => 'session-1');

    engine.open(100);
    expect(engine.close(120).map((message) => message.type)).toEqual(['tc-lens-session-close']);
    expect(engine.advance(120, 180)).toEqual([]);
  });

  it('resets claimed cue IDs when the lesson changes', () => {
    const engine = new TcLensSessionEngine(35, [llm('llm-1', 150)], () => 'session-1');

    engine.open(100);
    engine.advance(100, 160);
    engine.resetLesson(36, [llm('llm-1', 150)]);
    engine.open(100);

    expect(engine.advance(100, 160).map((message) => message.type)).toEqual(['tc-lens-llm-cue']);
  });
});
