import { describe, expect, it, vi } from 'vitest';
import type { TcLensTimelineEvent } from '../../core/models';
import { TcLensHostBridge } from './tc-lens-host-bridge';

const cue: TcLensTimelineEvent = {
  id: 'llm-1',
  messageType: 'llm',
  startTime: 120,
  endTime: null,
  data: { question: 'Explain this.', sceneContext: 'A move higher.', learningLevel: 'beginner' },
};

describe('TcLensHostBridge', () => {
  it('queues the session start until the iframe is ready', () => {
    const post = vi.fn();
    const bridge = new TcLensHostBridge(35, [cue], post, () => 'session-1');

    bridge.open(100);
    expect(post).not.toHaveBeenCalled();

    bridge.markReady();
    expect(post.mock.calls.map(([message]) => message.type)).toEqual(['tc-lens-session-start', 'tc-lens-state-sync']);
  });

  it('sends later cues in order and stops after close', () => {
    const post = vi.fn();
    const bridge = new TcLensHostBridge(35, [cue], post, () => 'session-1');

    bridge.open(100);
    bridge.markReady();
    post.mockClear();
    bridge.advance(100, 120);
    expect(post.mock.calls.map(([message]) => message.type)).toEqual(['tc-lens-llm-cue']);

    bridge.close(130);
    post.mockClear();
    bridge.advance(130, 180);
    expect(post).not.toHaveBeenCalled();
  });

  it('accepts acknowledgements for the active session only', () => {
    const post = vi.fn();
    const bridge = new TcLensHostBridge(35, [cue], post, () => 'session-1');

    bridge.open(100);
    expect(bridge.handleIncoming({ type: 'tc-lens-ack', sessionId: 'other', eventId: 'llm-1' })).toBe(false);
    expect(bridge.handleIncoming({ type: 'tc-lens-ack', sessionId: 'session-1', eventId: 'llm-1' })).toBe(true);
  });
});
