import { describe, expect, it } from 'vitest';
import type { TcLensLlmCue, TcLensTradeCue, TcLensTimelineEvent } from '../../core/models';
import {
  buildTcLensCueMessage,
  buildTcLensSessionMessage,
  buildTcLensStateSyncMessage,
  TC_LENS_PROTOCOL_VERSION,
} from './tc-lens-message';

const tradeCue: TcLensTradeCue = {
  id: 'trade-1',
  messageType: 'trade',
  startTime: 120,
  endTime: 180,
  data: {
    underlying: 'SPY',
    strategy: 'Long Call',
    legs: [{ action: 'buy', side: 'call', quantity: 1, strike: 500, expiration: '2026-12-18' }],
    strikes: ['500'],
    expiration: '2026-12-18',
    quantity: 1,
    entryPrice: 3,
    assumptions: 'For learning and recalculation only.',
  },
};

const llmCue: TcLensLlmCue = {
  id: 'llm-1',
  messageType: 'llm',
  startTime: 150,
  endTime: null,
  data: {
    question: 'Why does delta change here?',
    sceneContext: 'The underlying moves from 50 to 51.',
    learningLevel: 'beginner',
  },
};

describe('TC Lens protocol messages', () => {
  it('builds a structured trade cue with session and sequence metadata', () => {
    expect(buildTcLensCueMessage(35, 'session-1', 4, tradeCue)).toEqual({
      type: 'tc-lens-trade-cue',
      protocolVersion: TC_LENS_PROTOCOL_VERSION,
      lessonId: '35',
      sessionId: 'session-1',
      sequence: 4,
      eventId: 'trade-1',
      startTime: 120,
      endTime: 180,
      data: tradeCue.data,
    });
  });

  it('builds an LLM cue without converting its structured data to free text', () => {
    expect(buildTcLensCueMessage(35, 'session-1', 5, llmCue)).toEqual({
      type: 'tc-lens-llm-cue',
      protocolVersion: TC_LENS_PROTOCOL_VERSION,
      lessonId: '35',
      sessionId: 'session-1',
      sequence: 5,
      eventId: 'llm-1',
      startTime: 150,
      endTime: null,
      data: llmCue.data,
    });
  });

  it('builds session start and close messages', () => {
    expect(buildTcLensSessionMessage('start', 35, 'session-1', 96)).toEqual({
      type: 'tc-lens-session-start',
      protocolVersion: TC_LENS_PROTOCOL_VERSION,
      lessonId: '35',
      sessionId: 'session-1',
      currentTime: 96,
    });
    expect(buildTcLensSessionMessage('close', 35, 'session-1', 96)).toEqual({
      type: 'tc-lens-session-close',
      protocolVersion: TC_LENS_PROTOCOL_VERSION,
      lessonId: '35',
      sessionId: 'session-1',
      currentTime: 96,
    });
  });

  it('builds a state sync without replaying historical LLM answers', () => {
    const currentState: TcLensTimelineEvent[] = [tradeCue];
    expect(buildTcLensStateSyncMessage(35, 'session-1', 160, currentState)).toEqual({
      type: 'tc-lens-state-sync',
      protocolVersion: TC_LENS_PROTOCOL_VERSION,
      lessonId: '35',
      sessionId: 'session-1',
      currentTime: 160,
      activeTradeCues: [tradeCue.data],
    });
  });
});
