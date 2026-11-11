import { describe, expect, it, vi } from 'vitest';
import type { TcLensTimelineEvent } from '../../core/models';
import { TcLensHostBridge } from './tc-lens-host-bridge';
const cue: TcLensTimelineEvent = {
  id: 'llm-1', messageType: 'llm', startTime: 120, endTime: null,
  data: { question: 'Explain this.', sceneContext: 'A move higher.', learningLevel: 'beginner' },
};
const next = { ...cue, id: 'llm-2', startTime: 121 };
const ack = (post: ReturnType<typeof vi.fn>, state: string, index = 0) => ({
  type: 'tc-lens-ack', videoId: '35', chapter: post.mock.calls[index][0].chapter, state,
});
describe('TcLensHostBridge guide contract', () => {
  it('holds a crossed cue until the pane has authenticated and preserves the queue through sign-in', () => {
    const post = vi.fn(); const bridge = new TcLensHostBridge(35, [cue], post);
    bridge.open(119); bridge.markReady(); bridge.advance(119, 120.2);
    expect(post).not.toHaveBeenCalled();
    bridge.setAuthenticated(true); expect(post).toHaveBeenCalledTimes(1);
    bridge.dispose();
  });
  it('drops old learner requests on an identity change', () => {
    const post = vi.fn(); const bridge = new TcLensHostBridge(35, [cue], post);
    bridge.open(120); bridge.markReady(); bridge.clearForLearnerChange(); bridge.setAuthenticated(true);
    expect(post).not.toHaveBeenCalled(); bridge.dispose();
  });
  it('holds an explicitly unexecuted unauthenticated request until sign-in returns', () => {
    const post = vi.fn(); const bridge = new TcLensHostBridge(35, [cue], post);
    bridge.open(120); bridge.markReady(); bridge.setAuthenticated(true);
    bridge.handleIncoming({ ...ack(post, 'error'), reason: 'unauthenticated' });
    expect(post).toHaveBeenCalledTimes(1);
    bridge.setAuthenticated(true);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0][0].chapter).toBe(post.mock.calls[1][0].chapter);
    bridge.dispose();
  });
  it('delivers a crossed LLM cue when auto-opening between time updates', () => {
    const post = vi.fn(); const bridge = new TcLensHostBridge(35, [cue], post);
    bridge.open(120.25, 119.8); bridge.markReady(); bridge.setAuthenticated(true);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0].message).toContain('Explain this.');
    bridge.advance(119.8, 120.25);
    expect(post).toHaveBeenCalledTimes(1);
    bridge.dispose();
  });
  it('waits for load and sends only a resolved text prompt', () => {
    const post = vi.fn(); const bridge = new TcLensHostBridge(35, [cue], post);
    bridge.open(120); expect(post).not.toHaveBeenCalled(); bridge.markReady(); bridge.setAuthenticated(true);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toEqual({ type: 'tc-lens-time-update', videoId: '35',
      chapter: expect.stringMatching(/^[A-Za-z0-9_-]{1,64}$/),
      message: expect.stringContaining('Explain this.'), workflow: 'ask' });
    expect(post.mock.calls[0][0].message).toContain('A move higher.');
    bridge.close(120);
  });
  it('serializes requests and ignores unrelated replies', () => {
    const post = vi.fn(); const bridge = new TcLensHostBridge(35, [next, cue], post);
    bridge.open(100); bridge.markReady(); bridge.setAuthenticated(true); bridge.advance(100, 122);
    expect(post).toHaveBeenCalledTimes(1);
    expect(bridge.handleIncoming({ ...ack(post, 'finished'), videoId: '99' })).toBe(false);
    expect(bridge.handleIncoming({ ...ack(post, 'finished'), chapter: 'other' })).toBe(false);
    bridge.handleIncoming(ack(post, 'running')); expect(post).toHaveBeenCalledTimes(1);
    bridge.handleIncoming(ack(post, 'finished')); expect(post).toHaveBeenCalledTimes(2);
    bridge.handleIncoming(ack(post, 'finished', 1)); bridge.advance(100, 122);
    expect(post).toHaveBeenCalledTimes(2); bridge.close(122);
  });
  it('discards queued work on seek without replaying explanations', () => {
    const post = vi.fn(); const bridge = new TcLensHostBridge(35, [cue, next], post);
    bridge.open(100); bridge.markReady(); bridge.setAuthenticated(true); bridge.advance(100, 122); bridge.seek(110);
    bridge.handleIncoming(ack(post, 'finished')); bridge.advance(110, 122);
    expect(post).toHaveBeenCalledTimes(1); bridge.close(122);
  });
  it('preserves an in-flight request across close and reopen', () => {
    const post = vi.fn(); const bridge = new TcLensHostBridge(35, [cue, next], post);
    bridge.open(100); bridge.markReady(); bridge.setAuthenticated(true); bridge.advance(100, 122);
    bridge.close(122); bridge.open(120); expect(post).toHaveBeenCalledTimes(1);
    bridge.handleIncoming(ack(post, 'finished')); expect(post).toHaveBeenCalledTimes(1);
    bridge.close(120);
  });
  it('reports errors and stops queued prompts without retrying', () => {
    const post = vi.fn(), status = vi.fn();
    const bridge = new TcLensHostBridge(35, [cue, next], post, status);
    bridge.open(100); bridge.markReady(); bridge.setAuthenticated(true); bridge.advance(100, 122);
    bridge.handleIncoming({ ...ack(post, 'error'), reason: 'Please sign in.' });
    expect(status).toHaveBeenLastCalledWith('Please sign in.');
    expect(post).toHaveBeenCalledTimes(1); bridge.close(122);
  });
  it('reports timeout without sending another prompt', () => {
    vi.useFakeTimers();
    try {
      const post = vi.fn(), status = vi.fn();
      const bridge = new TcLensHostBridge(35, [cue, next], post, status);
      bridge.open(100); bridge.markReady(); bridge.setAuthenticated(true); bridge.advance(100, 122);
      vi.advanceTimersByTime(90000);
      expect(status).toHaveBeenLastCalledWith(expect.stringContaining('No response'));
      expect(post).toHaveBeenCalledTimes(1);
      bridge.handleIncoming(ack(post, 'finished')); expect(post).toHaveBeenCalledTimes(2);
      bridge.close(122);
    } finally { vi.useRealTimers(); }
  });
  it('includes active structured trade context using operate', () => {
    const post = vi.fn();
    const trade: TcLensTimelineEvent = { id: 'trade', messageType: 'trade', startTime: 20, endTime: 140,
      data: { underlying: 'AAPL', strategy: 'covered call', legs: [], strikes: [200],
        expiration: '2026-12-18', quantity: 1, entryPrice: 5, assumptions: 'Explain the risk.' } };
    const bridge = new TcLensHostBridge(35, [cue, trade], post);
    bridge.open(100); bridge.markReady(); bridge.setAuthenticated(true); expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0].workflow).toBe('operate');
    expect(post.mock.calls[0][0].message).toContain('AAPL');
    expect(post.mock.calls[0][0].message).toContain('200'); bridge.close(100);
  });
  it('restores timeout feedback after reopening an in-flight request', () => {
    vi.useFakeTimers();
    try {
      const post = vi.fn(), status = vi.fn();
      const bridge = new TcLensHostBridge(35, [cue], post, status);
      bridge.open(120); bridge.markReady(); bridge.setAuthenticated(true); bridge.close(120); bridge.open(121);
      vi.advanceTimersByTime(90000);
      expect(status).toHaveBeenLastCalledWith(expect.stringContaining('No response'));
      expect(post).toHaveBeenCalledTimes(1);
      bridge.dispose();
    } finally { vi.useRealTimers(); }
  });
  it('keeps a saved free-text prompt and ignores empty explanations', () => {
    const post = vi.fn();
    const empty: TcLensTimelineEvent = { ...cue, id: 'empty', startTime: 122,
      data: { question: ' ', sceneContext: '', learningLevel: '' } };
    const bridge = new TcLensHostBridge(35, [{ ...cue, message: 'Saved prompt' }, empty], post);
    bridge.open(120); bridge.markReady(); bridge.setAuthenticated(true);
    expect(post.mock.calls[0][0].message).toContain('Saved prompt');
    expect(post.mock.calls[0][0].message).not.toContain('Explain this.');
    bridge.advance(120, 123); bridge.handleIncoming(ack(post, 'finished'));
    expect(post).toHaveBeenCalledTimes(1); bridge.dispose();
  });
});
